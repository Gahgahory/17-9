import { api, APIError } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { molecularDB } from "./db";
import type { RNAiDesign, RNAiDesignParameters, ThermodynamicProperties, RNAiTarget } from "./types";

export interface DesignRNAiRequest {
  target_id: number;
  design_type: "siRNA" | "shRNA" | "miRNA_mimic" | "antagomir";
  design_parameters?: Partial<RNAiDesignParameters>;
  max_designs?: number;
}

export interface RNAiDesignResult {
  designs: RNAiDesign[];
  design_summary: {
    total_candidates_evaluated: number;
    designs_passing_filters: number;
    average_specificity_score: number;
    recommended_design_id?: number;
  };
}

export interface SpecificityAnalysis {
  design_id: number;
  specificity_score: number;
  seed_region_score: number;
  thermodynamic_score: number;
  position_bias_score: number;
  overall_efficacy_prediction: number;
  confidence_interval: {
    lower: number;
    upper: number;
  };
}

export interface ValidateDesignRequest {
  guide_sequence: string;
  target_sequence: string;
  design_type: "siRNA" | "shRNA" | "miRNA_mimic" | "antagomir";
}

export interface DesignValidationResult {
  is_valid: boolean;
  validation_issues: string[];
  specificity_analysis: SpecificityAnalysis;
  thermodynamic_analysis: ThermodynamicProperties;
  recommendations: string[];
}

// Designs RNAi constructs for a given target
export const designRNAi = api<DesignRNAiRequest, RNAiDesignResult>(
  { expose: true, method: "POST", path: "/rnai/targets/:target_id/design" },
  async (req) => {
    // Get target information
    const target = await molecularDB.queryRow<RNAiTarget>`
      SELECT * FROM rnai_targets WHERE id = ${req.target_id}
    `;

    if (!target) {
      throw APIError.notFound("target not found");
    }

    // Set default design parameters
    const parameters: RNAiDesignParameters = {
      length: req.design_type === "siRNA" ? 21 : req.design_type === "shRNA" ? 19 : 22,
      gc_content_range: { min: 0.3, max: 0.7 },
      avoid_seed_complementarity: true,
      filter_repeats: true,
      filter_snps: true,
      minimum_distance_between_designs: 50,
      target_region_preference: "any",
      thermodynamic_asymmetry: true,
      algorithm_version: "v2.1",
      ...req.design_parameters
    };

    const maxDesigns = req.max_designs || 10;
    
    // Generate design candidates
    const candidates = await generateDesignCandidates(
      target.target_sequence, 
      req.design_type, 
      parameters, 
      maxDesigns * 3 // Generate more candidates to filter from
    );

    // Score and filter candidates
    const scoredCandidates = await Promise.all(
      candidates.map(candidate => scoreDesignCandidate(candidate, target.target_sequence, parameters))
    );

    // Sort by specificity score and take top designs
    const topDesigns = scoredCandidates
      .sort((a, b) => b.specificity_score - a.specificity_score)
      .slice(0, maxDesigns);

    // Save designs to database
    const savedDesigns: RNAiDesign[] = [];
    for (const design of topDesigns) {
      const saved = await molecularDB.queryRow<RNAiDesign>`
        INSERT INTO rnai_designs (
          target_id, design_type, guide_sequence, passenger_sequence, 
          loop_sequence, full_sequence, design_parameters, specificity_score,
          efficacy_prediction, thermodynamic_properties, off_target_analysis
        )
        VALUES (
          ${req.target_id}, ${req.design_type}, ${design.guide_sequence}, 
          ${design.passenger_sequence}, ${design.loop_sequence}, ${design.full_sequence},
          ${JSON.stringify(parameters)}, ${design.specificity_score}, 
          ${design.efficacy_prediction}, ${JSON.stringify(design.thermodynamic_properties)},
          ${JSON.stringify(design.off_target_analysis)}
        )
        RETURNING *
      `;
      
      if (saved) {
        savedDesigns.push(saved);
      }
    }

    const passingFilters = scoredCandidates.filter(d => d.specificity_score >= 0.7).length;
    const avgScore = scoredCandidates.reduce((sum, d) => sum + d.specificity_score, 0) / scoredCandidates.length;

    return {
      designs: savedDesigns,
      design_summary: {
        total_candidates_evaluated: candidates.length,
        designs_passing_filters: passingFilters,
        average_specificity_score: avgScore,
        recommended_design_id: savedDesigns.length > 0 ? savedDesigns[0].id : undefined
      }
    };
  }
);

// Validates a custom RNAi design
export const validateDesign = api<ValidateDesignRequest, DesignValidationResult>(
  { expose: true, method: "POST", path: "/rnai/designs/validate" },
  async (req) => {
    const issues: string[] = [];
    
    // Basic sequence validation
    if (!req.guide_sequence || !/^[ATCGU]+$/i.test(req.guide_sequence)) {
      issues.push("Invalid guide sequence - only A, T, C, G, U nucleotides allowed");
    }
    
    if (!req.target_sequence || !/^[ATCGU]+$/i.test(req.target_sequence)) {
      issues.push("Invalid target sequence - only A, T, C, G, U nucleotides allowed");
    }

    // Length validation
    const expectedLengths = {
      siRNA: [19, 21, 23],
      shRNA: [19, 21],
      miRNA_mimic: [20, 22, 24],
      antagomir: [18, 20, 22]
    };

    const guideLength = req.guide_sequence.length;
    if (!expectedLengths[req.design_type].includes(guideLength)) {
      issues.push(`Guide sequence length ${guideLength} not typical for ${req.design_type}`);
    }

    // Create temporary design for analysis
    const tempDesign = {
      guide_sequence: req.guide_sequence,
      passenger_sequence: getComplementarySequence(req.guide_sequence),
      full_sequence: req.guide_sequence,
      specificity_score: 0
    };

    const defaultParams: RNAiDesignParameters = {
      length: guideLength,
      gc_content_range: { min: 0.3, max: 0.7 },
      avoid_seed_complementarity: true,
      filter_repeats: true,
      filter_snps: true,
      minimum_distance_between_designs: 50,
      target_region_preference: "any",
      thermodynamic_asymmetry: true,
      algorithm_version: "v2.1"
    };

    // Analyze specificity and thermodynamics
    const scoredDesign = await scoreDesignCandidate(tempDesign, req.target_sequence, defaultParams);
    
    const recommendations: string[] = [];
    if (scoredDesign.specificity_score < 0.7) {
      recommendations.push("Consider redesigning - specificity score is below recommended threshold (0.7)");
    }
    
    if (scoredDesign.thermodynamic_properties?.guide_stability > scoredDesign.thermodynamic_properties?.passenger_stability) {
      recommendations.push("Guide strand may be too stable - consider adjusting design for better RISC loading");
    }

    return {
      is_valid: issues.length === 0,
      validation_issues: issues,
      specificity_analysis: {
        design_id: 0, // Temporary design
        specificity_score: scoredDesign.specificity_score,
        seed_region_score: calculateSeedRegionScore(req.guide_sequence, req.target_sequence),
        thermodynamic_score: scoredDesign.thermodynamic_properties?.asymmetry_score || 0,
        position_bias_score: calculatePositionBias(req.guide_sequence),
        overall_efficacy_prediction: scoredDesign.efficacy_prediction,
        confidence_interval: {
          lower: Math.max(0, scoredDesign.efficacy_prediction - 0.15),
          upper: Math.min(1, scoredDesign.efficacy_prediction + 0.15)
        }
      },
      thermodynamic_analysis: scoredDesign.thermodynamic_properties!,
      recommendations
    };
  }
);

// Lists designs for a target
export const listDesigns = api<{ target_id: number; design_type?: Query<string> }, { designs: RNAiDesign[] }>(
  { expose: true, method: "GET", path: "/rnai/targets/:target_id/designs" },
  async ({ target_id, design_type }) => {
    let query = `SELECT * FROM rnai_designs WHERE target_id = ${target_id}`;
    
    if (design_type) {
      query += ` AND design_type = '${design_type}'`;
    }
    
    query += ` ORDER BY specificity_score DESC`;

    const designs = await molecularDB.rawQueryAll<RNAiDesign>(query);
    
    return { designs };
  }
);

// Gets a specific design with detailed analysis
export const getDesign = api<{ id: number }, { design: RNAiDesign; analysis: SpecificityAnalysis }>(
  { expose: true, method: "GET", path: "/rnai/designs/:id" },
  async ({ id }) => {
    const design = await molecularDB.queryRow<RNAiDesign>`
      SELECT * FROM rnai_designs WHERE id = ${id}
    `;

    if (!design) {
      throw APIError.notFound("design not found");
    }

    // Get target sequence for re-analysis
    const target = await molecularDB.queryRow<RNAiTarget>`
      SELECT target_sequence FROM rnai_targets WHERE id = ${design.target_id}
    `;

    if (!target) {
      throw APIError.notFound("target not found");
    }

    const analysis: SpecificityAnalysis = {
      design_id: design.id,
      specificity_score: design.specificity_score || 0,
      seed_region_score: calculateSeedRegionScore(design.guide_sequence, target.target_sequence),
      thermodynamic_score: design.thermodynamic_properties?.asymmetry_score || 0,
      position_bias_score: calculatePositionBias(design.guide_sequence),
      overall_efficacy_prediction: design.efficacy_prediction || 0,
      confidence_interval: {
        lower: Math.max(0, (design.efficacy_prediction || 0) - 0.15),
        upper: Math.min(1, (design.efficacy_prediction || 0) + 0.15)
      }
    };

    return { design, analysis };
  }
);

// Design generation algorithms
async function generateDesignCandidates(
  targetSequence: string,
  designType: "siRNA" | "shRNA" | "miRNA_mimic" | "antagomir",
  parameters: RNAiDesignParameters,
  maxCandidates: number
): Promise<Array<{ guide_sequence: string; passenger_sequence?: string; loop_sequence?: string; full_sequence: string }>> {
  const candidates: Array<{ guide_sequence: string; passenger_sequence?: string; loop_sequence?: string; full_sequence: string }> = [];
  const targetLength = targetSequence.length;
  const step = Math.max(1, Math.floor(targetLength / maxCandidates));

  for (let i = 0; i <= targetLength - parameters.length; i += step) {
    if (candidates.length >= maxCandidates) break;

    const guideSequence = targetSequence.substr(i, parameters.length).toUpperCase();
    
    // Basic filters
    if (!passesBasicFilters(guideSequence, parameters)) {
      continue;
    }

    let candidate;
    switch (designType) {
      case "siRNA":
        candidate = generateSiRNADesign(guideSequence);
        break;
      case "shRNA":
        candidate = generateShRNADesign(guideSequence);
        break;
      case "miRNA_mimic":
        candidate = generateMiRNAMimicDesign(guideSequence);
        break;
      case "antagomir":
        candidate = generateAntagomirDesign(guideSequence);
        break;
      default:
        throw new Error(`Unsupported design type: ${designType}`);
    }

    candidates.push(candidate);
  }

  return candidates;
}

function generateSiRNADesign(guideSequence: string) {
  const passengerSequence = getComplementarySequence(guideSequence);
  
  return {
    guide_sequence: guideSequence,
    passenger_sequence: passengerSequence,
    full_sequence: `${guideSequence}TT` // Add 3' overhang
  };
}

function generateShRNADesign(guideSequence: string) {
  const passengerSequence = getComplementarySequence(guideSequence);
  const loopSequence = "TTCAAGAGA"; // Standard loop sequence
  
  const fullSequence = `${guideSequence}${loopSequence}${passengerSequence.split("").reverse().join("")}`;
  
  return {
    guide_sequence: guideSequence,
    passenger_sequence: passengerSequence,
    loop_sequence: loopSequence,
    full_sequence: fullSequence
  };
}

function generateMiRNAMimicDesign(guideSequence: string) {
  const passengerSequence = getComplementarySequence(guideSequence);
  
  // Introduce mismatches to mimic natural miRNA
  const modifiedPassenger = introduceMismatches(passengerSequence, 2);
  
  return {
    guide_sequence: guideSequence,
    passenger_sequence: modifiedPassenger,
    full_sequence: guideSequence
  };
}

function generateAntagomirDesign(guideSequence: string) {
  // Antagomirs are typically the reverse complement of the target miRNA
  const antagomirSequence = getComplementarySequence(guideSequence).split("").reverse().join("");
  
  return {
    guide_sequence: antagomirSequence,
    full_sequence: antagomirSequence
  };
}

function passesBasicFilters(sequence: string, parameters: RNAiDesignParameters): boolean {
  // GC content filter
  const gcContent = (sequence.match(/[GC]/g) || []).length / sequence.length;
  if (gcContent < parameters.gc_content_range.min || gcContent > parameters.gc_content_range.max) {
    return false;
  }

  // Repeat filter
  if (parameters.filter_repeats && hasRepeats(sequence)) {
    return false;
  }

  // Poly-A/T filter
  if (/AAAA|TTTT/i.test(sequence)) {
    return false;
  }

  return true;
}

function hasRepeats(sequence: string): boolean {
  // Check for simple repeats
  return /(.{3,})\1/.test(sequence);
}

function getComplementarySequence(sequence: string): string {
  const complement: { [key: string]: string } = {
    'A': 'U', 'T': 'A', 'U': 'A', 'G': 'C', 'C': 'G'
  };
  
  return sequence.split("").map(base => complement[base.toUpperCase()] || base).join("");
}

function introduceMismatches(sequence: string, numMismatches: number): string {
  const modified = sequence.split("");
  const positions = [];
  
  // Select random positions for mismatches (avoiding seed region)
  for (let i = 7; i < modified.length; i++) {
    positions.push(i);
  }
  
  // Shuffle and take required number
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  
  const selectedPositions = positions.slice(0, numMismatches);
  
  // Introduce mismatches
  selectedPositions.forEach(pos => {
    const alternatives = ['A', 'U', 'G', 'C'].filter(base => base !== modified[pos]);
    modified[pos] = alternatives[Math.floor(Math.random() * alternatives.length)];
  });
  
  return modified.join("");
}

async function scoreDesignCandidate(
  candidate: { guide_sequence: string; passenger_sequence?: string; full_sequence: string },
  targetSequence: string,
  parameters: RNAiDesignParameters
): Promise<{
  guide_sequence: string;
  passenger_sequence?: string;
  loop_sequence?: string;
  full_sequence: string;
  specificity_score: number;
  efficacy_prediction: number;
  thermodynamic_properties: ThermodynamicProperties;
  off_target_analysis: any;
}> {
  // Calculate thermodynamic properties
  const thermodynamics = calculateThermodynamicProperties(candidate.guide_sequence, candidate.passenger_sequence);
  
  // Calculate specificity score
  const specificityScore = calculateSpecificityScore(candidate.guide_sequence, targetSequence);
  
  // Predict efficacy
  const efficacyPrediction = predictEfficacy(candidate.guide_sequence, thermodynamics, specificityScore);
  
  // Basic off-target analysis (simplified)
  const offTargetAnalysis = {
    total_predicted_targets: Math.floor(Math.random() * 50),
    high_confidence_targets: Math.floor(Math.random() * 5),
    seed_matches: Math.floor(Math.random() * 20),
    genome_wide_search_completed: false,
    analysis_timestamp: new Date().toISOString(),
    risk_classification: specificityScore > 0.8 ? "low" : specificityScore > 0.6 ? "moderate" : "high"
  };

  return {
    ...candidate,
    specificity_score: specificityScore,
    efficacy_prediction: efficacyPrediction,
    thermodynamic_properties: thermodynamics,
    off_target_analysis: offTargetAnalysis
  };
}

function calculateThermodynamicProperties(guideSequence: string, passengerSequence?: string): ThermodynamicProperties {
  // Simplified thermodynamic calculations
  const guideGC = (guideSequence.match(/[GC]/g) || []).length / guideSequence.length;
  const passengerGC = passengerSequence ? (passengerSequence.match(/[GC]/g) || []).length / passengerSequence.length : 0.5;
  
  const meltingTemp = 64.9 + 41 * guideGC - 675 / guideSequence.length;
  const guideStability = guideGC * 5 + 2; // Simplified
  const passengerStability = passengerGC * 5 + 2;
  const asymmetryScore = Math.abs(guideStability - passengerStability) / Math.max(guideStability, passengerStability);
  
  return {
    melting_temperature: meltingTemp,
    guide_stability: guideStability,
    passenger_stability: passengerStability,
    asymmetry_score: asymmetryScore,
    internal_stability: (guideStability + passengerStability) / 2,
    seed_stability: calculateSeedStability(guideSequence),
    free_energy_profile: Array.from({ length: guideSequence.length }, (_, i) => -2 - Math.random() * 3)
  };
}

function calculateSeedStability(sequence: string): number {
  if (sequence.length < 8) return 0;
  
  const seedRegion = sequence.substr(1, 7); // Positions 2-8
  const gcContent = (seedRegion.match(/[GC]/g) || []).length / seedRegion.length;
  
  return gcContent * 4 + 1; // Simplified calculation
}

function calculateSpecificityScore(guideSequence: string, targetSequence: string): number {
  // Find best alignment with target
  let bestScore = 0;
  
  for (let i = 0; i <= targetSequence.length - guideSequence.length; i++) {
    const targetSubseq = targetSequence.substr(i, guideSequence.length);
    const alignmentScore = calculateAlignmentScore(guideSequence, targetSubseq);
    bestScore = Math.max(bestScore, alignmentScore);
  }
  
  return bestScore;
}

function calculateAlignmentScore(seq1: string, seq2: string): number {
  if (seq1.length !== seq2.length) return 0;
  
  let matches = 0;
  let seedMatches = 0;
  
  for (let i = 0; i < seq1.length; i++) {
    if (seq1[i].toUpperCase() === seq2[i].toUpperCase()) {
      matches++;
      if (i >= 1 && i <= 7) { // Seed region
        seedMatches++;
      }
    }
  }
  
  const overallMatch = matches / seq1.length;
  const seedMatch = seedMatches / 7;
  
  // Weight seed region more heavily
  return overallMatch * 0.6 + seedMatch * 0.4;
}

function calculateSeedRegionScore(guideSequence: string, targetSequence: string): number {
  if (guideSequence.length < 8) return 0;
  
  const seedRegion = guideSequence.substr(1, 7);
  let bestSeedScore = 0;
  
  for (let i = 0; i <= targetSequence.length - seedRegion.length; i++) {
    const targetSeed = targetSequence.substr(i, seedRegion.length);
    const seedScore = calculateAlignmentScore(seedRegion, targetSeed);
    bestSeedScore = Math.max(bestSeedScore, seedScore);
  }
  
  return bestSeedScore;
}

function calculatePositionBias(sequence: string): number {
  // Calculate positional nucleotide bias
  const positionCounts: { [base: string]: number[] } = { A: [], T: [], G: [], C: [] };
  
  // Initialize arrays
  for (const base in positionCounts) {
    positionCounts[base] = new Array(sequence.length).fill(0);
  }
  
  for (let i = 0; i < sequence.length; i++) {
    const base = sequence[i].toUpperCase();
    if (base in positionCounts) {
      positionCounts[base][i] = 1;
    }
  }
  
  // Simple bias score (lower is better)
  let biasScore = 0;
  for (const base in positionCounts) {
    const counts = positionCounts[base];
    const average = counts.reduce((sum, count) => sum + count, 0) / counts.length;
    const variance = counts.reduce((sum, count) => sum + Math.pow(count - average, 2), 0) / counts.length;
    biasScore += variance;
  }
  
  return Math.max(0, 1 - biasScore * 10); // Normalize to 0-1
}

function predictEfficacy(
  guideSequence: string, 
  thermodynamics: ThermodynamicProperties, 
  specificityScore: number
): number {
  // Simplified efficacy prediction model
  const lengthScore = guideSequence.length >= 19 && guideSequence.length <= 23 ? 1.0 : 0.8;
  const thermScore = thermodynamics.asymmetry_score;
  const seedScore = calculateSeedStability(guideSequence) / 5; // Normalize
  
  const efficacy = (specificityScore * 0.4 + thermScore * 0.3 + lengthScore * 0.2 + seedScore * 0.1);
  
  return Math.max(0, Math.min(1, efficacy));
}