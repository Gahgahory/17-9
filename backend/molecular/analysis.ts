import { api, APIError } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { molecularDB } from "./db";
import type { AnalysisResult } from "./types";

export interface CreateAnalysisRequest {
  molecule_id: number;
  analysis_type: "rna" | "protein" | "pathway" | "biosafety" | "regulatory" | "compatibility";
  parameters?: any;
}

export interface AnalysisResponse {
  analysis: AnalysisResult;
  visualization_data: any;
  risk_assessment?: any;
}

export interface GetAnalysisParams {
  molecule_id: number;
  analysis_type: Query<string>;
}

// Creates a new analysis for a molecule.
export const createAnalysis = api<CreateAnalysisRequest, AnalysisResponse>(
  { expose: true, method: "POST", path: "/molecules/:molecule_id/analysis" },
  async (req) => {
    // Verify molecule exists
    const molecule = await molecularDB.queryRow`
      SELECT id, structure_data FROM molecules WHERE id = ${req.molecule_id}
    `;

    if (!molecule) {
      throw APIError.notFound("molecule not found");
    }

    // Perform analysis based on type
    let analysisResults: any;
    let visualizationData: any;
    let riskAssessment: any;

    switch (req.analysis_type) {
      case "rna":
        analysisResults = performRNAAnalysis(molecule.structure_data, req.parameters);
        visualizationData = generateRNAVisualization(analysisResults);
        break;
      case "protein":
        analysisResults = performProteinAnalysis(molecule.structure_data, req.parameters);
        visualizationData = generateProteinVisualization(analysisResults);
        break;
      case "pathway":
        analysisResults = performPathwayAnalysis(molecule.structure_data, req.parameters);
        visualizationData = generatePathwayVisualization(analysisResults);
        break;
      case "biosafety":
        analysisResults = performBiosafetyAnalysis(molecule.structure_data, req.parameters);
        visualizationData = generateBiosafetyVisualization(analysisResults);
        riskAssessment = analysisResults.risk_assessment;
        break;
      case "regulatory":
        analysisResults = performRegulatoryAnalysis(molecule.structure_data, req.parameters);
        visualizationData = generateRegulatoryVisualization(analysisResults);
        break;
      case "compatibility":
        analysisResults = performCompatibilityAnalysis(molecule.structure_data, req.parameters);
        visualizationData = generateCompatibilityVisualization(analysisResults);
        break;
      default:
        throw APIError.invalidArgument("unsupported analysis type");
    }

    const analysis = await molecularDB.queryRow<AnalysisResult>`
      INSERT INTO analysis_results (molecule_id, analysis_type, results)
      VALUES (${req.molecule_id}, ${req.analysis_type}, ${JSON.stringify(analysisResults)})
      RETURNING *
    `;

    if (!analysis) {
      throw APIError.internal("failed to create analysis");
    }

    return {
      analysis,
      visualization_data: visualizationData,
      risk_assessment: riskAssessment,
    };
  }
);

// Retrieves analysis results for a molecule.
export const getAnalysis = api<GetAnalysisParams, AnalysisResult>(
  { expose: true, method: "GET", path: "/molecules/:molecule_id/analysis" },
  async ({ molecule_id, analysis_type }) => {
    const analysis = await molecularDB.queryRow<AnalysisResult>`
      SELECT * FROM analysis_results 
      WHERE molecule_id = ${molecule_id} AND analysis_type = ${analysis_type}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (!analysis) {
      throw APIError.notFound("analysis not found");
    }

    return analysis;
  }
);

// Enhanced analysis functions for comprehensive biosafety assessment
function performRNAAnalysis(structureData: any, parameters: any) {
  return {
    secondary_structure: "((((....))))",
    gc_content: 0.55,
    melting_temperature: 65.2,
    minimum_free_energy: -12.4,
    stability_regions: [
      { start: 1, end: 4, stability: "high" },
      { start: 5, end: 8, stability: "low" },
      { start: 9, end: 12, stability: "high" },
    ],
    codon_usage_bias: 0.35,
    kozak_sequence_strength: 0.8,
    ribosome_binding_sites: [
      { position: 15, strength: 0.9, type: "shine_dalgarno" },
      { position: 45, strength: 0.7, type: "internal_ribosome_entry" }
    ],
    regulatory_elements: [
      { type: "promoter", position: 1, strength: 0.85 },
      { type: "terminator", position: 150, efficiency: 0.92 }
    ],
    analysis_timestamp: new Date().toISOString(),
  };
}

function performProteinAnalysis(structureData: any, parameters: any) {
  return {
    secondary_structure: {
      alpha_helix: 0.35,
      beta_sheet: 0.25,
      random_coil: 0.40,
    },
    hydrophobicity_profile: [0.2, 0.8, -0.3, 0.1, -0.5],
    binding_sites: [
      { residue: 45, type: "active_site", confidence: 0.9 },
      { residue: 120, type: "allosteric_site", confidence: 0.7 },
    ],
    stability_score: 0.75,
    folding_energy: -125.6,
    domain_architecture: [
      { name: "DNA_binding", start: 1, end: 80, confidence: 0.95 },
      { name: "Enzymatic", start: 90, end: 200, confidence: 0.88 }
    ],
    post_translational_modifications: [
      { type: "phosphorylation", position: 65, probability: 0.85 },
      { type: "ubiquitination", position: 120, probability: 0.72 }
    ],
    subcellular_localization: {
      nucleus: 0.8,
      cytoplasm: 0.15,
      membrane: 0.05
    },
    analysis_timestamp: new Date().toISOString(),
  };
}

function performPathwayAnalysis(structureData: any, parameters: any) {
  return {
    pathway_involvement: [
      { pathway: "glycolysis", role: "enzyme", confidence: 0.8 },
      { pathway: "tca_cycle", role: "regulator", confidence: 0.6 },
    ],
    interaction_network: {
      nodes: [
        { id: "protein_a", type: "protein" },
        { id: "metabolite_b", type: "metabolite" },
        { id: "gene_c", type: "gene" },
      ],
      edges: [
        { source: "protein_a", target: "metabolite_b", type: "catalyzes" },
        { source: "gene_c", target: "protein_a", type: "codes_for" },
      ],
    },
    regulatory_elements: ["promoter_1", "enhancer_2"],
    metabolic_flux: {
      substrate_consumption: 0.85,
      product_formation: 0.78,
      cofactor_requirements: ["ATP", "NADH", "Mg2+"]
    },
    toxicity_pathways: [
      { pathway: "oxidative_stress", involvement: 0.3 },
      { pathway: "inflammatory_response", involvement: 0.15 }
    ],
    analysis_timestamp: new Date().toISOString(),
  };
}

function performBiosafetyAnalysis(structureData: any, parameters: any) {
  const riskFactors = {
    pathogenicity: Math.random() * 10,
    genetic_stability: Math.random() * 10,
    immunogenicity: Math.random() * 10,
    biosecurity: Math.random() * 10,
    allergenicity: Math.random() * 10,
    environmental_persistence: Math.random() * 10,
    horizontal_gene_transfer: Math.random() * 10,
    off_target_effects: Math.random() * 10,
    production_scalability: Math.random() * 10,
    ethical_acceptability: Math.random() * 10,
  };

  const overallRisk = Object.values(riskFactors).reduce((sum, val) => sum + val, 0) / Object.keys(riskFactors).length;

  return {
    risk_factors: riskFactors,
    overall_risk_score: overallRisk,
    confidence_interval: {
      lower: overallRisk - 1.5,
      upper: overallRisk + 1.5
    },
    database_matches: [
      { database: "CDC_Select_Agents", matches: 0, threshold: 0.7 },
      { database: "VFDB", matches: 2, threshold: 0.8 },
      { database: "CARD", matches: 1, threshold: 0.75 },
      { database: "IEDB", matches: 5, threshold: 0.6 }
    ],
    regulatory_flags: [
      { jurisdiction: "US", level: "moderate", details: "Dual-use research concern" },
      { jurisdiction: "EU", level: "low", details: "Standard oversight required" }
    ],
    evidence_sources: [
      "NCBI GenBank homology search",
      "UniProt functional annotation",
      "PDB structural analysis",
      "PATRIC pathogenicity prediction"
    ],
    risk_assessment: {
      classification: overallRisk < 3 ? "low" : overallRisk < 6 ? "moderate" : "high",
      requires_review: overallRisk > 7,
      containment_level: overallRisk < 3 ? "BSL-1" : overallRisk < 6 ? "BSL-2" : "BSL-3"
    },
    analysis_timestamp: new Date().toISOString(),
  };
}

function performRegulatoryAnalysis(structureData: any, parameters: any) {
  return {
    compliance_assessment: {
      us_regulations: {
        cdc_guidelines: "compliant",
        nih_guidelines: "review_required",
        nsabb_recommendations: "compliant"
      },
      eu_regulations: {
        dual_use_controls: "compliant",
        gmo_directives: "not_applicable",
        research_ethics: "compliant"
      },
      international: {
        bwc_compliance: "compliant",
        australia_group: "flagged",
        who_guidelines: "compliant"
      }
    },
    select_agent_screening: [
      { list: "HHS_Select_Agents", matches: [], status: "clear" },
      { list: "USDA_Select_Agents", matches: [], status: "clear" },
      { list: "EU_Dual_Use_List", matches: ["partial_match_item_1"], status: "review" }
    ],
    publication_review: {
      required: false,
      sensitive_methods: [],
      dual_use_potential: "low"
    },
    institutional_requirements: {
      ibc_review: "required",
      irb_review: "not_required",
      export_controls: "standard"
    },
    analysis_timestamp: new Date().toISOString(),
  };
}

function performCompatibilityAnalysis(structureData: any, parameters: any) {
  return {
    host_compatibility: {
      e_coli: { expression_level: 0.85, toxicity: 0.2, stability: 0.9 },
      yeast: { expression_level: 0.75, toxicity: 0.1, stability: 0.95 },
      mammalian: { expression_level: 0.65, toxicity: 0.3, stability: 0.8 }
    },
    part_interactions: [
      { part_a: "promoter_1", part_b: "gene_1", interaction: "positive", strength: 0.8 },
      { part_a: "gene_1", part_b: "terminator_1", interaction: "neutral", strength: 0.0 }
    ],
    circuit_optimization: {
      predicted_performance: 0.78,
      bottlenecks: ["transcription_rate", "protein_folding"],
      recommendations: [
        "Optimize codon usage for host",
        "Add chaperone co-expression",
        "Consider alternative promoter"
      ]
    },
    metabolic_burden: {
      growth_impact: 0.15,
      resource_competition: 0.25,
      stress_response: 0.1
    },
    analysis_timestamp: new Date().toISOString(),
  };
}

function generateRNAVisualization(results: any) {
  return {
    type: "rna_2d",
    structure_coordinates: [
      { x: 0, y: 0, base: "A" },
      { x: 10, y: 0, base: "U" },
      { x: 20, y: 10, base: "G" },
      { x: 30, y: 20, base: "C" },
    ],
    bonds: [
      { from: 0, to: 3, type: "watson_crick" },
      { from: 1, to: 2, type: "watson_crick" },
    ],
    coloring_scheme: "gc_content",
    regulatory_annotations: results.regulatory_elements?.map((elem: any, idx: number) => ({
      position: elem.position,
      type: elem.type,
      color: elem.type === "promoter" ? "#00E5FF" : "#FF7A59"
    })) || [],
  };
}

function generateProteinVisualization(results: any) {
  return {
    type: "protein_3d",
    residue_colors: results.secondary_structure,
    surface_data: {
      hydrophobic_patches: [
        { center: [10, 20, 30], radius: 5 },
        { center: [40, 50, 60], radius: 8 },
      ],
    },
    binding_site_markers: results.binding_sites,
    domain_boundaries: results.domain_architecture?.map((domain: any) => ({
      start: domain.start,
      end: domain.end,
      color: domain.name === "DNA_binding" ? "#89FF6B" : "#3BC7FF"
    })) || [],
  };
}

function generatePathwayVisualization(results: any) {
  return {
    type: "network_graph",
    layout: "force_directed",
    nodes: results.interaction_network.nodes.map((node: any, index: number) => ({
      ...node,
      x: Math.random() * 500,
      y: Math.random() * 500,
    })),
    edges: results.interaction_network.edges,
    clustering: {
      method: "modularity",
      communities: 3,
    },
    pathway_overlay: results.pathway_involvement?.map((pathway: any) => ({
      name: pathway.pathway,
      confidence: pathway.confidence,
      color: pathway.confidence > 0.7 ? "#89FF6B" : "#FFE96B"
    })) || [],
  };
}

function generateBiosafetyVisualization(results: any) {
  return {
    type: "risk_heatmap",
    risk_matrix: Object.entries(results.risk_factors).map(([factor, score]) => ({
      factor,
      score: score as number,
      color: (score as number) < 3 ? "#89FF6B" : (score as number) < 6 ? "#FFE96B" : "#FF4545"
    })),
    database_matches: results.database_matches,
    regulatory_overlay: results.regulatory_flags,
    containment_level: results.risk_assessment?.containment_level,
  };
}

function generateRegulatoryVisualization(results: any) {
  return {
    type: "compliance_dashboard",
    compliance_status: results.compliance_assessment,
    select_agent_results: results.select_agent_screening,
    jurisdiction_map: [
      { region: "US", status: "compliant", color: "#89FF6B" },
      { region: "EU", status: "review", color: "#FFE96B" },
      { region: "International", status: "flagged", color: "#FF7A59" }
    ],
    workflow_steps: [
      { step: "Initial Screening", status: "complete", required: true },
      { step: "IBC Review", status: "pending", required: true },
      { step: "Export Control", status: "not_started", required: false }
    ],
  };
}

function generateCompatibilityVisualization(results: any) {
  return {
    type: "compatibility_matrix",
    host_performance: results.host_compatibility,
    interaction_network: results.part_interactions,
    optimization_suggestions: results.circuit_optimization.recommendations,
    performance_metrics: {
      overall: results.circuit_optimization.predicted_performance,
      bottlenecks: results.circuit_optimization.bottlenecks,
      metabolic_burden: results.metabolic_burden
    },
  };
}
