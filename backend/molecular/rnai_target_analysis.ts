import { api, APIError } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { molecularDB } from "./db";
import type { RNAiTarget } from "./types";

export interface CreateTargetRequest {
  target_name: string;
  target_sequence: string;
  target_type: "mRNA" | "lncRNA" | "miRNA" | "custom";
  gene_symbol?: string;
  gene_id?: string;
  organism: string;
  transcript_id?: string;
  genomic_coordinates?: {
    chromosome: string;
    start: number;
    end: number;
    strand: string;
  };
  functional_annotation?: any;
}

export interface TargetValidationResult {
  is_valid: boolean;
  validation_errors: string[];
  sequence_analysis: {
    length: number;
    gc_content: number;
    complexity_score: number;
    repeat_regions: RepeatRegion[];
    secondary_structure_prediction: SecondaryStructure;
  };
  accessibility_analysis: {
    accessible_regions: AccessibleRegion[];
    average_accessibility: number;
    recommended_target_sites: TargetSite[];
  };
}

export interface RepeatRegion {
  start: number;
  end: number;
  repeat_type: string;
  repeat_family?: string;
}

export interface SecondaryStructure {
  dot_bracket_notation: string;
  minimum_free_energy: number;
  ensemble_diversity: number;
  centroid_structure: string;
}

export interface AccessibleRegion {
  start: number;
  end: number;
  accessibility_score: number;
  local_structure: string;
}

export interface TargetSite {
  position: number;
  accessibility_score: number;
  conservation_score?: number;
  functionality_score: number;
  recommended_reason: string;
}

export interface ListTargetsParams {
  organism?: Query<string>;
  target_type?: Query<string>;
  gene_symbol?: Query<string>;
  limit?: Query<number>;
  offset?: Query<number>;
}

// Creates a new RNAi target with validation
export const createTarget = api<CreateTargetRequest, { target: RNAiTarget; validation: TargetValidationResult }>(
  { expose: true, method: "POST", path: "/rnai/targets" },
  async (req) => {
    // Validate the target sequence
    const validation = await validateTargetSequence(req.target_sequence, req.target_type, req.organism);
    
    if (!validation.is_valid) {
      throw APIError.invalidArgument(`Target validation failed: ${validation.validation_errors.join(", ")}`);
    }

    // Create target in database
    const target = await molecularDB.queryRow<RNAiTarget>`
      INSERT INTO rnai_targets (
        target_name, target_sequence, target_type, gene_symbol, gene_id, 
        organism, transcript_id, genomic_coordinates, functional_annotation
      )
      VALUES (
        ${req.target_name}, ${req.target_sequence}, ${req.target_type}, 
        ${req.gene_symbol}, ${req.gene_id}, ${req.organism}, ${req.transcript_id},
        ${JSON.stringify(req.genomic_coordinates)}, ${JSON.stringify(req.functional_annotation)}
      )
      RETURNING *
    `;

    if (!target) {
      throw APIError.internal("failed to create target");
    }

    return { target, validation };
  }
);

// Validates a target sequence for RNAi design
export const validateTarget = api<{ sequence: string; target_type: string; organism: string }, TargetValidationResult>(
  { expose: true, method: "POST", path: "/rnai/targets/validate" },
  async ({ sequence, target_type, organism }) => {
    return await validateTargetSequence(sequence, target_type as any, organism);
  }
);

// Lists RNAi targets with filtering
export const listTargets = api<ListTargetsParams, { targets: RNAiTarget[]; total: number }>(
  { expose: true, method: "GET", path: "/rnai/targets" },
  async ({ organism, target_type, gene_symbol, limit = 50, offset = 0 }) => {
    let whereClause = "WHERE 1=1";
    const params: any[] = [];
    let paramIndex = 1;

    if (organism) {
      whereClause += ` AND organism = $${paramIndex}`;
      params.push(organism);
      paramIndex++;
    }

    if (target_type) {
      whereClause += ` AND target_type = $${paramIndex}`;
      params.push(target_type);
      paramIndex++;
    }

    if (gene_symbol) {
      whereClause += ` AND gene_symbol ILIKE $${paramIndex}`;
      params.push(`%${gene_symbol}%`);
      paramIndex++;
    }

    const targets = await molecularDB.rawQueryAll<RNAiTarget>(
      `SELECT * FROM rnai_targets ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      ...params, limit, offset
    );

    const countResult = await molecularDB.rawQueryRow<{ count: number }>(
      `SELECT COUNT(*) as count FROM rnai_targets ${whereClause}`,
      ...params
    );

    return {
      targets,
      total: countResult?.count || 0
    };
  }
);

// Gets a specific target by ID
export const getTarget = api<{ id: number }, RNAiTarget>(
  { expose: true, method: "GET", path: "/rnai/targets/:id" },
  async ({ id }) => {
    const target = await molecularDB.queryRow<RNAiTarget>`
      SELECT * FROM rnai_targets WHERE id = ${id}
    `;

    if (!target) {
      throw APIError.notFound("target not found");
    }

    return target;
  }
);

// Updates an existing target
export const updateTarget = api<{ id: number } & Partial<CreateTargetRequest>, RNAiTarget>(
  { expose: true, method: "PUT", path: "/rnai/targets/:id" },
  async ({ id, ...updates }) => {
    const existing = await molecularDB.queryRow<RNAiTarget>`
      SELECT * FROM rnai_targets WHERE id = ${id}
    `;

    if (!existing) {
      throw APIError.notFound("target not found");
    }

    // If sequence is being updated, validate it
    if (updates.target_sequence) {
      const validation = await validateTargetSequence(
        updates.target_sequence, 
        updates.target_type || existing.target_type, 
        updates.organism || existing.organism
      );
      
      if (!validation.is_valid) {
        throw APIError.invalidArgument(`Target validation failed: ${validation.validation_errors.join(", ")}`);
      }
    }

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === "genomic_coordinates" || key === "functional_annotation") {
          updateFields.push(`${key} = $${paramIndex}`);
          params.push(JSON.stringify(value));
        } else {
          updateFields.push(`${key} = $${paramIndex}`);
          params.push(value);
        }
        paramIndex++;
      }
    });

    updateFields.push(`updated_at = NOW()`);
    params.push(id);

    const target = await molecularDB.rawQueryRow<RNAiTarget>(
      `UPDATE rnai_targets SET ${updateFields.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      ...params
    );

    if (!target) {
      throw APIError.internal("failed to update target");
    }

    return target;
  }
);

// Deletes a target
export const deleteTarget = api<{ id: number }, { success: boolean }>(
  { expose: true, method: "DELETE", path: "/rnai/targets/:id" },
  async ({ id }) => {
    const result = await molecularDB.query`
      DELETE FROM rnai_targets WHERE id = ${id}
    `;

    return { success: true };
  }
);

// Target sequence validation logic
async function validateTargetSequence(
  sequence: string, 
  targetType: "mRNA" | "lncRNA" | "miRNA" | "custom", 
  organism: string
): Promise<TargetValidationResult> {
  const errors: string[] = [];
  
  // Basic sequence validation
  if (!sequence || sequence.length === 0) {
    errors.push("Sequence cannot be empty");
  }
  
  // Check for valid nucleotides
  const validNucleotides = /^[ATCGU]+$/i;
  if (!validNucleotides.test(sequence)) {
    errors.push("Sequence contains invalid nucleotides (only A, T, C, G, U allowed)");
  }
  
  // Check minimum length requirements
  const minLengths = {
    mRNA: 200,
    lncRNA: 200,
    miRNA: 18,
    custom: 18
  };
  
  if (sequence.length < minLengths[targetType]) {
    errors.push(`Sequence too short for ${targetType} (minimum ${minLengths[targetType]} nucleotides)`);
  }
  
  // Analyze sequence composition
  const sequenceAnalysis = analyzeSequenceComposition(sequence);
  
  // Check GC content
  if (sequenceAnalysis.gc_content < 0.2 || sequenceAnalysis.gc_content > 0.8) {
    errors.push(`Extreme GC content (${(sequenceAnalysis.gc_content * 100).toFixed(1)}%). Optimal range is 20-80%`);
  }
  
  // Check for low complexity regions
  if (sequenceAnalysis.complexity_score < 0.3) {
    errors.push("Sequence has low complexity (may contain repeats or simple sequences)");
  }
  
  // Predict secondary structure
  const secondaryStructure = predictSecondaryStructure(sequence);
  
  // Analyze accessibility for RNAi targeting
  const accessibilityAnalysis = analyzeAccessibility(sequence, secondaryStructure);
  
  return {
    is_valid: errors.length === 0,
    validation_errors: errors,
    sequence_analysis: {
      ...sequenceAnalysis,
      secondary_structure_prediction: secondaryStructure
    },
    accessibility_analysis: accessibilityAnalysis
  };
}

function analyzeSequenceComposition(sequence: string) {
  const length = sequence.length;
  const gcCount = (sequence.match(/[GC]/gi) || []).length;
  const gc_content = gcCount / length;
  
  // Simple complexity score based on dinucleotide frequency
  const dinucleotides = new Map<string, number>();
  for (let i = 0; i < length - 1; i++) {
    const dinuc = sequence.substr(i, 2).toUpperCase();
    dinucleotides.set(dinuc, (dinucleotides.get(dinuc) || 0) + 1);
  }
  
  const maxFreq = Math.max(...Array.from(dinucleotides.values()));
  const complexity_score = 1 - (maxFreq / (length - 1));
  
  // Detect repeat regions (simplified)
  const repeat_regions: RepeatRegion[] = findRepeats(sequence);
  
  return {
    length,
    gc_content,
    complexity_score,
    repeat_regions
  };
}

function findRepeats(sequence: string): RepeatRegion[] {
  const repeats: RepeatRegion[] = [];
  const minRepeatLength = 4;
  const sequence_upper = sequence.toUpperCase();
  
  for (let i = 0; i < sequence.length - minRepeatLength; i++) {
    for (let len = minRepeatLength; len <= Math.min(20, sequence.length - i); len++) {
      const pattern = sequence_upper.substr(i, len);
      const nextOccurrence = sequence_upper.indexOf(pattern, i + len);
      
      if (nextOccurrence !== -1 && nextOccurrence < i + len * 2) {
        repeats.push({
          start: i,
          end: i + len,
          repeat_type: "tandem_repeat",
          repeat_family: len <= 6 ? "simple_repeat" : "complex_repeat"
        });
        break;
      }
    }
  }
  
  return repeats;
}

function predictSecondaryStructure(sequence: string): SecondaryStructure {
  // Simplified secondary structure prediction
  // In a real implementation, this would use sophisticated algorithms like RNAfold
  
  const length = sequence.length;
  let dotBracket = "";
  let pairedPositions = new Set<number>();
  
  // Simple base pairing prediction based on Watson-Crick pairs
  for (let i = 0; i < length - 3; i++) {
    if (pairedPositions.has(i)) continue;
    
    for (let j = length - 1; j > i + 3; j--) {
      if (pairedPositions.has(j)) continue;
      
      const base1 = sequence[i].toUpperCase();
      const base2 = sequence[j].toUpperCase();
      
      if (isWatsonCrickPair(base1, base2)) {
        pairedPositions.add(i);
        pairedPositions.add(j);
        break;
      }
    }
  }
  
  // Generate dot-bracket notation
  for (let i = 0; i < length; i++) {
    if (pairedPositions.has(i)) {
      // Find the paired position
      let pairedPos = -1;
      for (let j = 0; j < length; j++) {
        if (j !== i && pairedPositions.has(j)) {
          const base1 = sequence[i].toUpperCase();
          const base2 = sequence[j].toUpperCase();
          if (isWatsonCrickPair(base1, base2)) {
            pairedPos = j;
            break;
          }
        }
      }
      
      dotBracket += i < pairedPos ? "(" : ")";
    } else {
      dotBracket += ".";
    }
  }
  
  // Calculate approximate minimum free energy
  const gcContent = (sequence.match(/[GC]/gi) || []).length / length;
  const pairedBases = pairedPositions.size;
  const mfe = -(pairedBases * 2.5 + gcContent * pairedBases * 1.5);
  
  return {
    dot_bracket_notation: dotBracket,
    minimum_free_energy: mfe,
    ensemble_diversity: Math.random() * 0.5 + 0.3, // Simplified
    centroid_structure: dotBracket // Simplified - same as MFE structure
  };
}

function isWatsonCrickPair(base1: string, base2: string): boolean {
  const pairs = [
    ["A", "T"], ["A", "U"], ["T", "A"], ["U", "A"],
    ["G", "C"], ["C", "G"]
  ];
  
  return pairs.some(([b1, b2]) => base1 === b1 && base2 === b2);
}

function analyzeAccessibility(sequence: string, structure: SecondaryStructure): {
  accessible_regions: AccessibleRegion[];
  average_accessibility: number;
  recommended_target_sites: TargetSite[];
} {
  const dotBracket = structure.dot_bracket_notation;
  const accessible_regions: AccessibleRegion[] = [];
  const recommended_target_sites: TargetSite[] = [];
  
  let currentRegionStart = -1;
  let accessibilitySum = 0;
  
  for (let i = 0; i < dotBracket.length; i++) {
    const isAccessible = dotBracket[i] === ".";
    const accessibility_score = isAccessible ? 1.0 : 0.2;
    accessibilitySum += accessibility_score;
    
    if (isAccessible && currentRegionStart === -1) {
      currentRegionStart = i;
    } else if (!isAccessible && currentRegionStart !== -1) {
      // End of accessible region
      accessible_regions.push({
        start: currentRegionStart,
        end: i - 1,
        accessibility_score: 1.0,
        local_structure: dotBracket.substring(currentRegionStart, i)
      });
      currentRegionStart = -1;
    }
    
    // Identify good target sites (accessible regions of appropriate length for siRNA)
    if (isAccessible && i >= 19 && i < sequence.length - 2) {
      const regionScore = calculateRegionScore(sequence, i - 19, i + 2);
      if (regionScore > 0.6) {
        recommended_target_sites.push({
          position: i - 10, // Center of the 21-nt region
          accessibility_score: accessibility_score,
          functionality_score: regionScore,
          recommended_reason: "Accessible region with good thermodynamic properties"
        });
      }
    }
  }
  
  // Close final region if needed
  if (currentRegionStart !== -1) {
    accessible_regions.push({
      start: currentRegionStart,
      end: dotBracket.length - 1,
      accessibility_score: 1.0,
      local_structure: dotBracket.substring(currentRegionStart)
    });
  }
  
  return {
    accessible_regions,
    average_accessibility: accessibilitySum / dotBracket.length,
    recommended_target_sites: recommended_target_sites.slice(0, 10) // Top 10 sites
  };
}

function calculateRegionScore(sequence: string, start: number, end: number): number {
  if (start < 0 || end >= sequence.length) return 0;
  
  const region = sequence.substring(start, end + 1);
  const gcContent = (region.match(/[GC]/gi) || []).length / region.length;
  
  // Score based on GC content (optimal range 40-60%)
  let gcScore = 1.0;
  if (gcContent < 0.3 || gcContent > 0.7) {
    gcScore = 0.5;
  } else if (gcContent >= 0.4 && gcContent <= 0.6) {
    gcScore = 1.0;
  } else {
    gcScore = 0.8;
  }
  
  // Check for repeats
  const hasRepeats = /(.{3,})\1/.test(region);
  const repeatScore = hasRepeats ? 0.5 : 1.0;
  
  return gcScore * repeatScore;
}