export interface Molecule {
  id: number;
  name: string;
  formula?: string;
  smiles?: string;
  inchi?: string;
  inchi_key?: string;
  molecular_weight?: number;
  structure_data?: any;
  pdb_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface RiskAssessment {
  id: number;
  molecule_id: number;
  toxicity_score: number;
  carcinogenicity_score: number;
  mutagenicity_score: number;
  reproductive_toxicity_score: number;
  skin_sensitization_score: number;
  eye_irritation_score: number;
  respiratory_toxicity_score: number;
  environmental_impact_score: number;
  bioaccumulation_score: number;
  persistence_score: number;
  overall_risk_score: number;
  confidence_score: number;
  uncertainty_lower: number;
  uncertainty_upper: number;
  evidence_sources: any;
  created_at: Date;
}

export interface DatabaseReference {
  id: number;
  molecule_id: number;
  database_name: string;
  database_id: string;
  reference_url?: string;
  data: any;
  last_updated: Date;
}

export interface AnalysisResult {
  id: number;
  molecule_id: number;
  analysis_type: "rna" | "protein" | "pathway" | "biosafety" | "regulatory" | "compatibility";
  results: any;
  created_at: Date;
}

export interface Snapshot {
  id: number;
  molecule_id: number;
  name: string;
  description?: string;
  camera_position: any;
  visualization_settings: any;
  image_data?: string;
  created_at: Date;
}

export type RiskDimension = 
  | "toxicity"
  | "carcinogenicity"
  | "mutagenicity"
  | "reproductive_toxicity"
  | "skin_sensitization"
  | "eye_irritation"
  | "respiratory_toxicity"
  | "environmental_impact"
  | "bioaccumulation"
  | "persistence";

export interface RiskScore {
  dimension: RiskDimension;
  score: number;
  confidence: number;
  evidence_sources: string[];
}

// Enhanced interfaces for advanced biosafety platform
export interface BiosafetyAnalysis {
  id: number;
  molecule_id: number;
  risk_factors: {
    pathogenicity: number;
    genetic_stability: number;
    immunogenicity: number;
    biosecurity: number;
    allergenicity: number;
    environmental_persistence: number;
    horizontal_gene_transfer: number;
    off_target_effects: number;
    production_scalability: number;
    ethical_acceptability: number;
  };
  overall_risk_score: number;
  confidence_interval: {
    lower: number;
    upper: number;
  };
  database_matches: DatabaseMatch[];
  regulatory_flags: RegulatoryFlag[];
  containment_requirements: ContainmentRequirements;
  created_at: Date;
}

export interface DatabaseMatch {
  database: string;
  matches: number;
  threshold: number;
  details: MatchDetail[];
}

export interface MatchDetail {
  match_id: string;
  similarity: number;
  type: string;
  description: string;
}

export interface RegulatoryFlag {
  jurisdiction: string;
  level: "low" | "moderate" | "high" | "critical";
  details: string;
  requirements: string[];
}

export interface ContainmentRequirements {
  biosafety_level: "BSL-1" | "BSL-2" | "BSL-3" | "BSL-4";
  special_precautions: string[];
  oversight_required: string[];
  export_controls: boolean;
}

export interface CompatibilityAnalysis {
  id: number;
  molecule_id: number;
  host_compatibility: {
    [host: string]: {
      expression_level: number;
      toxicity: number;
      stability: number;
    };
  };
  part_interactions: PartInteraction[];
  circuit_optimization: CircuitOptimization;
  metabolic_burden: MetabolicBurden;
  created_at: Date;
}

export interface PartInteraction {
  part_a: string;
  part_b: string;
  interaction: "positive" | "negative" | "neutral";
  strength: number;
  mechanism?: string;
}

export interface CircuitOptimization {
  predicted_performance: number;
  bottlenecks: string[];
  recommendations: string[];
  design_score: number;
}

export interface MetabolicBurden {
  growth_impact: number;
  resource_competition: number;
  stress_response: number;
  energy_cost: number;
}

export interface RegulatoryCompliance {
  id: number;
  molecule_id: number;
  compliance_assessment: {
    us_regulations: ComplianceStatus;
    eu_regulations: ComplianceStatus;
    international: ComplianceStatus;
  };
  select_agent_screening: SelectAgentResult[];
  publication_review: PublicationReview;
  institutional_requirements: InstitutionalRequirements;
  created_at: Date;
}

export interface ComplianceStatus {
  [regulation: string]: "compliant" | "review_required" | "non_compliant" | "not_applicable";
}

export interface SelectAgentResult {
  list: string;
  matches: string[];
  status: "clear" | "review" | "flagged";
}

export interface PublicationReview {
  required: boolean;
  sensitive_methods: string[];
  dual_use_potential: "low" | "medium" | "high";
  recommendations: string[];
}

export interface InstitutionalRequirements {
  ibc_review: "required" | "recommended" | "not_required";
  irb_review: "required" | "recommended" | "not_required";
  export_controls: "standard" | "enhanced" | "restricted";
  training_requirements: string[];
}

// RNAi-specific interfaces
export interface RNAiTarget {
  id: number;
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
  created_at: Date;
  updated_at: Date;
}

export interface RNAiDesign {
  id: number;
  target_id: number;
  design_type: "siRNA" | "shRNA" | "miRNA_mimic" | "antagomir";
  guide_sequence: string;
  passenger_sequence?: string;
  loop_sequence?: string;
  full_sequence: string;
  design_parameters: RNAiDesignParameters;
  specificity_score?: number;
  efficacy_prediction?: number;
  thermodynamic_properties?: ThermodynamicProperties;
  off_target_analysis?: OffTargetAnalysis;
  created_at: Date;
}

export interface RNAiDesignParameters {
  length: number;
  gc_content_range: {
    min: number;
    max: number;
  };
  avoid_seed_complementarity: boolean;
  filter_repeats: boolean;
  filter_snps: boolean;
  minimum_distance_between_designs: number;
  target_region_preference: "5_utr" | "cds" | "3_utr" | "any";
  thermodynamic_asymmetry: boolean;
  algorithm_version: string;
}

export interface ThermodynamicProperties {
  melting_temperature: number;
  guide_stability: number;
  passenger_stability: number;
  asymmetry_score: number;
  internal_stability: number;
  seed_stability: number;
  free_energy_profile: number[];
}

export interface OffTargetAnalysis {
  total_predicted_targets: number;
  high_confidence_targets: number;
  seed_matches: number;
  genome_wide_search_completed: boolean;
  analysis_timestamp: string;
  risk_classification: "low" | "moderate" | "high";
}

export interface OffTargetPrediction {
  id: number;
  design_id: number;
  off_target_sequence: string;
  off_target_gene?: string;
  off_target_transcript?: string;
  similarity_score: number;
  mismatch_count: number;
  mismatch_positions: number[];
  seed_region_matches: number;
  binding_energy?: number;
  risk_score?: number;
  created_at: Date;
}

export interface RNAiExperiment {
  id: number;
  design_id: number;
  experiment_name: string;
  experiment_type: "in_silico" | "cell_culture" | "in_vivo" | "literature_derived";
  cell_line?: string;
  treatment_conditions?: any;
  knockdown_efficiency?: number;
  viability_impact?: number;
  off_target_effects?: any;
  expression_data?: any;
  statistical_analysis?: any;
  experimental_metadata?: any;
  performed_at: Date;
  created_at: Date;
}

export interface RNAiValidation {
  id: number;
  design_id: number;
  validation_method: string;
  validation_score: number;
  validation_details?: any;
  validation_status: "pending" | "passed" | "failed" | "warning";
  validated_at: Date;
}

export interface RNAiDeliverySystem {
  id: number;
  design_id: number;
  delivery_method: string;
  formulation_details?: any;
  target_tissues?: string[];
  delivery_efficiency?: number;
  stability_profile?: any;
  safety_assessment?: any;
  created_at: Date;
}
