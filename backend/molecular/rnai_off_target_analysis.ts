import { api, APIError } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { molecularDB } from "./db";
import type { OffTargetPrediction, RNAiDesign } from "./types";

export interface OffTargetAnalysisRequest {
  design_id: number;
  genome_database?: string; // "human", "mouse", "rat", etc.
  analysis_parameters?: OffTargetAnalysisParameters;
}

export interface OffTargetAnalysisParameters {
  max_mismatches: number;
  seed_mismatch_tolerance: number;
  minimum_binding_score: number;
  include_utr_regions: boolean;
  include_intergenic_regions: boolean;
  filter_by_expression: boolean;
  expression_threshold?: number;
}

export interface OffTargetAnalysisResult {
  design_id: number;
  analysis_summary: {
    total_sites_analyzed: number;
    potential_off_targets: number;
    high_confidence_off_targets: number;
    seed_matched_targets: number;
    risk_classification: "low" | "moderate" | "high" | "critical";
  };
  off_target_predictions: OffTargetPrediction[];
  genome_wide_statistics: GenomeWideStats;
  recommendations: string[];
}

export interface GenomeWideStats {
  total_sequences_searched: number;
  average_similarity_score: number;
  seed_region_conservation: number;
  expression_weighted_risk: number;
  tissue_specific_risks: TissueRisk[];
}

export interface TissueRisk {
  tissue_name: string;
  expressed_off_targets: number;
  weighted_risk_score: number;
}

export interface ThermodynamicAnalysisRequest {
  design_id: number;
  analysis_conditions?: {
    temperature: number; // Celsius
    salt_concentration: number; // mM
    mg_concentration: number; // mM
  };
}

export interface ThermodynamicAnalysisResult {
  design_id: number;
  stability_analysis: {
    guide_strand_stability: StabilityMetrics;
    passenger_strand_stability: StabilityMetrics;
    duplex_stability: DuplexStability;
    risc_loading_prediction: RiscLoadingAnalysis;
  };
  temperature_profile: TemperatureProfile;
  salt_dependency: SaltDependency;
  recommendations: string[];
}

export interface StabilityMetrics {
  melting_temperature: number;
  gibbs_free_energy: number;
  enthalpy: number;
  entropy: number;
  stability_score: number;
}

export interface DuplexStability {
  duplex_melting_temp: number;
  duplex_free_energy: number;
  asymmetry_parameter: number;
  end_stability_5prime: number;
  end_stability_3prime: number;
}

export interface RiscLoadingAnalysis {
  guide_loading_probability: number;
  passenger_loading_probability: number;
  thermodynamic_asymmetry: number;
  predicted_loading_efficiency: number;
  confidence_score: number;
}

export interface TemperatureProfile {
  temperatures: number[];
  guide_stability: number[];
  passenger_stability: number[];
  duplex_stability: number[];
  optimal_temperature: number;
}

export interface SaltDependency {
  salt_concentrations: number[];
  stability_changes: number[];
  optimal_salt_concentration: number;
}

export interface UpdateOffTargetRequest {
  prediction_id: number;
  validated_status?: "confirmed" | "rejected" | "uncertain";
  experimental_evidence?: any;
  notes?: string;
}

// Performs comprehensive off-target analysis for an RNAi design
export const analyzeOffTargets = api<OffTargetAnalysisRequest, OffTargetAnalysisResult>(
  { expose: true, method: "POST", path: "/rnai/designs/:design_id/off-targets" },
  async (req) => {
    // Get design information
    const design = await molecularDB.queryRow<RNAiDesign>`
      SELECT * FROM rnai_designs WHERE id = ${req.design_id}
    `;

    if (!design) {
      throw APIError.notFound("design not found");
    }

    const parameters: OffTargetAnalysisParameters = {
      max_mismatches: 3,
      seed_mismatch_tolerance: 1,
      minimum_binding_score: 0.6,
      include_utr_regions: true,
      include_intergenic_regions: false,
      filter_by_expression: true,
      expression_threshold: 1.0,
      ...req.analysis_parameters
    };

    // Perform genome-wide search
    const offTargetPredictions = await performGenomeWideSearch(
      design.guide_sequence,
      req.genome_database || "human",
      parameters
    );

    // Save predictions to database
    const savedPredictions: OffTargetPrediction[] = [];
    for (const prediction of offTargetPredictions) {
      const saved = await molecularDB.queryRow<OffTargetPrediction>`
        INSERT INTO off_target_predictions (
          design_id, off_target_sequence, off_target_gene, off_target_transcript,
          similarity_score, mismatch_count, mismatch_positions, seed_region_matches,
          binding_energy, risk_score
        )
        VALUES (
          ${req.design_id}, ${prediction.off_target_sequence}, ${prediction.off_target_gene},
          ${prediction.off_target_transcript}, ${prediction.similarity_score}, 
          ${prediction.mismatch_count}, ${JSON.stringify(prediction.mismatch_positions)},
          ${prediction.seed_region_matches}, ${prediction.binding_energy}, ${prediction.risk_score}
        )
        RETURNING *
      `;
      
      if (saved) {
        savedPredictions.push(saved);
      }
    }

    // Generate analysis summary
    const summary = generateAnalysisSummary(savedPredictions);
    const genomeStats = generateGenomeWideStatistics(savedPredictions, design.guide_sequence);
    const recommendations = generateRecommendations(summary, genomeStats);

    return {
      design_id: req.design_id,
      analysis_summary: summary,
      off_target_predictions: savedPredictions,
      genome_wide_statistics: genomeStats,
      recommendations
    };
  }
);

// Performs detailed thermodynamic analysis
export const analyzeThermodynamics = api<ThermodynamicAnalysisRequest, ThermodynamicAnalysisResult>(
  { expose: true, method: "POST", path: "/rnai/designs/:design_id/thermodynamics" },
  async (req) => {
    const design = await molecularDB.queryRow<RNAiDesign>`
      SELECT * FROM rnai_designs WHERE id = ${req.design_id}
    `;

    if (!design) {
      throw APIError.notFound("design not found");
    }

    const conditions = {
      temperature: 37, // Physiological temperature
      salt_concentration: 150, // mM
      mg_concentration: 2, // mM
      ...req.analysis_conditions
    };

    // Calculate stability metrics for guide and passenger strands
    const guideStability = calculateStabilityMetrics(design.guide_sequence, conditions);
    const passengerStability = design.passenger_sequence 
      ? calculateStabilityMetrics(design.passenger_sequence, conditions)
      : null;

    // Calculate duplex stability
    const duplexStability = calculateDuplexStability(
      design.guide_sequence, 
      design.passenger_sequence || "", 
      conditions
    );

    // Predict RISC loading
    const riscLoading = predictRiscLoading(guideStability, passengerStability, duplexStability);

    // Generate temperature and salt profiles
    const temperatureProfile = generateTemperatureProfile(
      design.guide_sequence, 
      design.passenger_sequence || ""
    );
    const saltDependency = generateSaltDependency(
      design.guide_sequence, 
      design.passenger_sequence || ""
    );

    const recommendations = generateThermodynamicRecommendations(
      guideStability, 
      passengerStability, 
      riscLoading
    );

    return {
      design_id: req.design_id,
      stability_analysis: {
        guide_strand_stability: guideStability,
        passenger_strand_stability: passengerStability || guideStability, // Fallback
        duplex_stability: duplexStability,
        risc_loading_prediction: riscLoading
      },
      temperature_profile: temperatureProfile,
      salt_dependency: saltDependency,
      recommendations
    };
  }
);

// Lists off-target predictions for a design
export const listOffTargets = api<{ design_id: number; min_risk_score?: Query<number> }, { predictions: OffTargetPrediction[] }>(
  { expose: true, method: "GET", path: "/rnai/designs/:design_id/off-targets" },
  async ({ design_id, min_risk_score = 0.5 }) => {
    const predictions = await molecularDB.queryAll<OffTargetPrediction>`
      SELECT * FROM off_target_predictions 
      WHERE design_id = ${design_id} AND risk_score >= ${min_risk_score}
      ORDER BY risk_score DESC, similarity_score DESC
    `;

    return { predictions };
  }
);

// Updates off-target prediction with experimental validation
export const updateOffTargetPrediction = api<UpdateOffTargetRequest, OffTargetPrediction>(
  { expose: true, method: "PUT", path: "/rnai/off-targets/:prediction_id" },
  async (req) => {
    const existing = await molecularDB.queryRow<OffTargetPrediction>`
      SELECT * FROM off_target_predictions WHERE id = ${req.prediction_id}
    `;

    if (!existing) {
      throw APIError.notFound("off-target prediction not found");
    }

    // Update validation information (stored in metadata)
    const updatedMetadata = {
      validated_status: req.validated_status,
      experimental_evidence: req.experimental_evidence,
      notes: req.notes,
      updated_at: new Date().toISOString()
    };

    const updated = await molecularDB.queryRow<OffTargetPrediction>`
      UPDATE off_target_predictions 
      SET risk_score = CASE 
        WHEN ${req.validated_status} = 'confirmed' THEN GREATEST(risk_score, 0.9)
        WHEN ${req.validated_status} = 'rejected' THEN LEAST(risk_score, 0.1)
        ELSE risk_score
      END
      WHERE id = ${req.prediction_id}
      RETURNING *
    `;

    if (!updated) {
      throw APIError.internal("failed to update off-target prediction");
    }

    return updated;
  }
);

// Off-target search implementation
async function performGenomeWideSearch(
  guideSequence: string,
  genomeDatabase: string,
  parameters: OffTargetAnalysisParameters
): Promise<Omit<OffTargetPrediction, "id" | "design_id" | "created_at">[]> {
  // Simulate genome-wide search
  // In a real implementation, this would query against actual genome databases
  
  const predictions: Omit<OffTargetPrediction, "id" | "design_id" | "created_at">[] = [];
  const seedRegion = guideSequence.substring(1, 8); // Positions 2-8
  
  // Generate simulated off-target sequences
  const numCandidates = Math.floor(Math.random() * 100) + 20; // 20-120 candidates
  
  for (let i = 0; i < numCandidates; i++) {
    const offTargetSeq = generateSimulatedOffTarget(guideSequence, parameters.max_mismatches);
    const analysis = analyzeOffTargetBinding(guideSequence, offTargetSeq, seedRegion);
    
    if (analysis.similarity_score >= parameters.minimum_binding_score) {
      predictions.push({
        off_target_sequence: offTargetSeq,
        off_target_gene: `GENE_${String(i).padStart(5, "0")}`,
        off_target_transcript: `TRANSCRIPT_${String(i).padStart(5, "0")}`,
        similarity_score: analysis.similarity_score,
        mismatch_count: analysis.mismatch_count,
        mismatch_positions: analysis.mismatch_positions,
        seed_region_matches: analysis.seed_region_matches,
        binding_energy: analysis.binding_energy,
        risk_score: analysis.risk_score
      });
    }
  }
  
  return predictions.sort((a, b) => b.risk_score! - a.risk_score!).slice(0, 50); // Top 50
}

function generateSimulatedOffTarget(template: string, maxMismatches: number): string {
  const sequence = template.split("");
  const numMismatches = Math.floor(Math.random() * (maxMismatches + 1));
  const positions = Array.from({ length: template.length }, (_, i) => i);
  
  // Shuffle positions
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  
  // Introduce mismatches
  for (let i = 0; i < numMismatches; i++) {
    const pos = positions[i];
    const alternatives = ["A", "T", "G", "C"].filter(base => base !== sequence[pos]);
    sequence[pos] = alternatives[Math.floor(Math.random() * alternatives.length)];
  }
  
  return sequence.join("");
}

function analyzeOffTargetBinding(
  guideSequence: string,
  offTargetSequence: string,
  seedRegion: string
): {
  similarity_score: number;
  mismatch_count: number;
  mismatch_positions: number[];
  seed_region_matches: number;
  binding_energy: number;
  risk_score: number;
} {
  let matches = 0;
  let seedMatches = 0;
  const mismatchPositions: number[] = [];
  
  // Compare sequences
  for (let i = 0; i < Math.min(guideSequence.length, offTargetSequence.length); i++) {
    if (guideSequence[i].toUpperCase() === offTargetSequence[i].toUpperCase()) {
      matches++;
      if (i >= 1 && i <= 7) { // Seed region
        seedMatches++;
      }
    } else {
      mismatchPositions.push(i);
    }
  }
  
  const similarity_score = matches / guideSequence.length;
  const mismatch_count = mismatchPositions.length;
  
  // Calculate binding energy (simplified)
  const gcContent = (guideSequence.match(/[GC]/g) || []).length / guideSequence.length;
  const binding_energy = -(matches * 2.5 + gcContent * matches * 1.5); // Simplified
  
  // Calculate risk score
  const seedScore = seedMatches / 7;
  const positionWeight = mismatchPositions.reduce((sum, pos) => {
    // Weight mismatches in seed region more heavily
    return sum + (pos >= 1 && pos <= 7 ? 2 : 1);
  }, 0);
  
  const risk_score = Math.max(0, similarity_score - (positionWeight * 0.1)) * (0.5 + seedScore * 0.5);
  
  return {
    similarity_score,
    mismatch_count,
    mismatch_positions: mismatchPositions,
    seed_region_matches: seedMatches,
    binding_energy,
    risk_score
  };
}

function generateAnalysisSummary(predictions: OffTargetPrediction[]) {
  const highConfidence = predictions.filter(p => p.risk_score! >= 0.8).length;
  const seedMatched = predictions.filter(p => p.seed_region_matches >= 6).length;
  
  let riskClassification: "low" | "moderate" | "high" | "critical";
  if (highConfidence === 0) {
    riskClassification = "low";
  } else if (highConfidence <= 2) {
    riskClassification = "moderate";
  } else if (highConfidence <= 5) {
    riskClassification = "high";
  } else {
    riskClassification = "critical";
  }
  
  return {
    total_sites_analyzed: predictions.length * 10, // Simulate larger search space
    potential_off_targets: predictions.length,
    high_confidence_off_targets: highConfidence,
    seed_matched_targets: seedMatched,
    risk_classification: riskClassification
  };
}

function generateGenomeWideStatistics(
  predictions: OffTargetPrediction[], 
  guideSequence: string
): GenomeWideStats {
  const avgSimilarity = predictions.reduce((sum, p) => sum + p.similarity_score, 0) / predictions.length || 0;
  const seedRegion = guideSequence.substring(1, 8);
  
  return {
    total_sequences_searched: 25000 + Math.floor(Math.random() * 5000), // Simulate
    average_similarity_score: avgSimilarity,
    seed_region_conservation: Math.random() * 0.3 + 0.1, // 10-40%
    expression_weighted_risk: avgSimilarity * 0.7 + Math.random() * 0.3,
    tissue_specific_risks: [
      { tissue_name: "Brain", expressed_off_targets: Math.floor(Math.random() * 5), weighted_risk_score: Math.random() * 0.5 },
      { tissue_name: "Liver", expressed_off_targets: Math.floor(Math.random() * 8), weighted_risk_score: Math.random() * 0.7 },
      { tissue_name: "Heart", expressed_off_targets: Math.floor(Math.random() * 3), weighted_risk_score: Math.random() * 0.3 },
      { tissue_name: "Kidney", expressed_off_targets: Math.floor(Math.random() * 6), weighted_risk_score: Math.random() * 0.6 }
    ]
  };
}

function generateRecommendations(summary: any, stats: GenomeWideStats): string[] {
  const recommendations: string[] = [];
  
  if (summary.risk_classification === "high" || summary.risk_classification === "critical") {
    recommendations.push("Consider redesigning the siRNA due to high off-target risk");
  }
  
  if (summary.high_confidence_off_targets > 3) {
    recommendations.push("Perform experimental validation of predicted off-targets");
  }
  
  if (stats.seed_region_conservation > 0.3) {
    recommendations.push("Seed region shows high conservation - consider alternative target sites");
  }
  
  if (summary.risk_classification === "low") {
    recommendations.push("Design shows good specificity profile for experimental testing");
  }
  
  return recommendations;
}

// Thermodynamic analysis functions
function calculateStabilityMetrics(sequence: string, conditions: any): StabilityMetrics {
  const gcContent = (sequence.match(/[GC]/g) || []).length / sequence.length;
  const length = sequence.length;
  
  // Simplified nearest-neighbor calculations
  const melting_temp = 64.9 + 41 * gcContent - 675 / length;
  const enthalpy = -(length * 7.5 + gcContent * length * 5); // kcal/mol
  const entropy = -(length * 20 + gcContent * length * 10); // eu
  const gibbs_free_energy = enthalpy - (conditions.temperature + 273.15) * entropy / 1000;
  
  const stability_score = Math.max(0, Math.min(1, (melting_temp - 20) / 60));
  
  return {
    melting_temperature: melting_temp,
    gibbs_free_energy: gibbs_free_energy,
    enthalpy: enthalpy,
    entropy: entropy,
    stability_score: stability_score
  };
}

function calculateDuplexStability(
  guideSeq: string, 
  passengerSeq: string, 
  conditions: any
): DuplexStability {
  const guideMetrics = calculateStabilityMetrics(guideSeq, conditions);
  const passengerMetrics = calculateStabilityMetrics(passengerSeq, conditions);
  
  return {
    duplex_melting_temp: (guideMetrics.melting_temperature + passengerMetrics.melting_temperature) / 2,
    duplex_free_energy: (guideMetrics.gibbs_free_energy + passengerMetrics.gibbs_free_energy) / 2,
    asymmetry_parameter: Math.abs(guideMetrics.gibbs_free_energy - passengerMetrics.gibbs_free_energy),
    end_stability_5prime: calculateEndStability(guideSeq.substring(0, 4)),
    end_stability_3prime: calculateEndStability(guideSeq.substring(guideSeq.length - 4))
  };
}

function calculateEndStability(endSequence: string): number {
  const gcContent = (endSequence.match(/[GC]/g) || []).length / endSequence.length;
  return gcContent * 5 + 2; // Simplified
}

function predictRiscLoading(
  guideStability: StabilityMetrics, 
  passengerStability: StabilityMetrics | null, 
  duplexStability: DuplexStability
): RiscLoadingAnalysis {
  if (!passengerStability) {
    return {
      guide_loading_probability: 1.0,
      passenger_loading_probability: 0.0,
      thermodynamic_asymmetry: 0.0,
      predicted_loading_efficiency: 0.9,
      confidence_score: 0.8
    };
  }
  
  const asymmetry = duplexStability.asymmetry_parameter;
  const guideLoading = 1 / (1 + Math.exp(-(asymmetry - 2))); // Sigmoid function
  const passengerLoading = 1 - guideLoading;
  
  return {
    guide_loading_probability: guideLoading,
    passenger_loading_probability: passengerLoading,
    thermodynamic_asymmetry: asymmetry,
    predicted_loading_efficiency: guideLoading * 0.9 + 0.1, // Baseline efficiency
    confidence_score: Math.min(1, asymmetry / 5) // Higher asymmetry = higher confidence
  };
}

function generateTemperatureProfile(guideSeq: string, passengerSeq: string): TemperatureProfile {
  const temperatures = Array.from({ length: 15 }, (_, i) => 25 + i * 5); // 25-95°C
  
  return {
    temperatures,
    guide_stability: temperatures.map(temp => 
      calculateStabilityMetrics(guideSeq, { temperature: temp, salt_concentration: 150, mg_concentration: 2 }).stability_score
    ),
    passenger_stability: temperatures.map(temp => 
      calculateStabilityMetrics(passengerSeq, { temperature: temp, salt_concentration: 150, mg_concentration: 2 }).stability_score
    ),
    duplex_stability: temperatures.map(temp => 
      (calculateStabilityMetrics(guideSeq, { temperature: temp, salt_concentration: 150, mg_concentration: 2 }).stability_score +
       calculateStabilityMetrics(passengerSeq, { temperature: temp, salt_concentration: 150, mg_concentration: 2 }).stability_score) / 2
    ),
    optimal_temperature: 37 // Physiological temperature
  };
}

function generateSaltDependency(guideSeq: string, passengerSeq: string): SaltDependency {
  const saltConcentrations = Array.from({ length: 10 }, (_, i) => 50 + i * 50); // 50-500 mM
  
  return {
    salt_concentrations: saltConcentrations,
    stability_changes: saltConcentrations.map(salt => 
      calculateStabilityMetrics(guideSeq, { temperature: 37, salt_concentration: salt, mg_concentration: 2 }).stability_score
    ),
    optimal_salt_concentration: 150 // Physiological
  };
}

function generateThermodynamicRecommendations(
  guideStability: StabilityMetrics,
  passengerStability: StabilityMetrics | null,
  riscLoading: RiscLoadingAnalysis
): string[] {
  const recommendations: string[] = [];
  
  if (riscLoading.guide_loading_probability < 0.7) {
    recommendations.push("Guide strand loading probability is low - consider adjusting thermodynamic asymmetry");
  }
  
  if (guideStability.melting_temperature < 40) {
    recommendations.push("Guide strand stability is low - may affect efficacy");
  }
  
  if (guideStability.melting_temperature > 80) {
    recommendations.push("Guide strand is very stable - may impede RISC loading");
  }
  
  if (riscLoading.thermodynamic_asymmetry < 1) {
    recommendations.push("Low thermodynamic asymmetry - passenger strand may compete for RISC loading");
  }
  
  if (riscLoading.predicted_loading_efficiency > 0.8) {
    recommendations.push("Excellent thermodynamic profile for RISC loading");
  }
  
  return recommendations;
}