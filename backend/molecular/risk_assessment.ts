import { api, APIError } from "encore.dev/api";
import { molecularDB } from "./db";
import type { RiskAssessment, RiskScore } from "./types";

export interface CreateRiskAssessmentRequest {
  molecule_id: number;
  risk_scores: RiskScore[];
}

export interface RiskAssessmentResponse {
  assessment: RiskAssessment;
  individual_scores: RiskScore[];
}

// Creates a comprehensive risk assessment for a molecule.
export const createRiskAssessment = api<CreateRiskAssessmentRequest, RiskAssessmentResponse>(
  { expose: true, method: "POST", path: "/molecules/:molecule_id/risk-assessment" },
  async (req) => {
    // Verify molecule exists
    const molecule = await molecularDB.queryRow`
      SELECT id FROM molecules WHERE id = ${req.molecule_id}
    `;

    if (!molecule) {
      throw APIError.notFound("molecule not found");
    }

    // Calculate overall risk score as weighted average
    const weights = {
      toxicity: 0.15,
      carcinogenicity: 0.15,
      mutagenicity: 0.12,
      reproductive_toxicity: 0.12,
      skin_sensitization: 0.08,
      eye_irritation: 0.06,
      respiratory_toxicity: 0.10,
      environmental_impact: 0.08,
      bioaccumulation: 0.07,
      persistence: 0.07,
    };

    let weightedSum = 0;
    let totalWeight = 0;
    let confidenceSum = 0;

    const scoreMap: Record<string, number> = {};
    req.risk_scores.forEach(score => {
      scoreMap[`${score.dimension}_score`] = score.score;
      const weight = weights[score.dimension] || 0.1;
      weightedSum += score.score * weight;
      totalWeight += weight;
      confidenceSum += score.confidence;
    });

    const overallRiskScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
    const avgConfidence = req.risk_scores.length > 0 ? confidenceSum / req.risk_scores.length : 0;

    // Calculate uncertainty bounds (95% confidence interval)
    const uncertaintyRange = (1 - avgConfidence) * overallRiskScore * 0.2;
    const uncertaintyLower = Math.max(0, overallRiskScore - uncertaintyRange);
    const uncertaintyUpper = Math.min(1, overallRiskScore + uncertaintyRange);

    // Collect evidence sources
    const evidenceSources = req.risk_scores.flatMap(score => score.evidence_sources);

    const assessment = await molecularDB.queryRow<RiskAssessment>`
      INSERT INTO risk_assessments (
        molecule_id, toxicity_score, carcinogenicity_score, mutagenicity_score,
        reproductive_toxicity_score, skin_sensitization_score, eye_irritation_score,
        respiratory_toxicity_score, environmental_impact_score, bioaccumulation_score,
        persistence_score, overall_risk_score, confidence_score,
        uncertainty_lower, uncertainty_upper, evidence_sources
      ) VALUES (
        ${req.molecule_id},
        ${scoreMap.toxicity_score || 0}, ${scoreMap.carcinogenicity_score || 0},
        ${scoreMap.mutagenicity_score || 0}, ${scoreMap.reproductive_toxicity_score || 0},
        ${scoreMap.skin_sensitization_score || 0}, ${scoreMap.eye_irritation_score || 0},
        ${scoreMap.respiratory_toxicity_score || 0}, ${scoreMap.environmental_impact_score || 0},
        ${scoreMap.bioaccumulation_score || 0}, ${scoreMap.persistence_score || 0},
        ${overallRiskScore}, ${avgConfidence}, ${uncertaintyLower}, ${uncertaintyUpper},
        ${JSON.stringify(evidenceSources)}
      )
      RETURNING *
    `;

    if (!assessment) {
      throw APIError.internal("failed to create risk assessment");
    }

    return {
      assessment,
      individual_scores: req.risk_scores,
    };
  }
);

export interface GetRiskAssessmentParams {
  molecule_id: number;
}

// Retrieves the latest risk assessment for a molecule.
export const getRiskAssessment = api<GetRiskAssessmentParams, RiskAssessment>(
  { expose: true, method: "GET", path: "/molecules/:molecule_id/risk-assessment" },
  async ({ molecule_id }) => {
    const assessment = await molecularDB.queryRow<RiskAssessment>`
      SELECT * FROM risk_assessments 
      WHERE molecule_id = ${molecule_id}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (!assessment) {
      throw APIError.notFound("risk assessment not found");
    }

    return assessment;
  }
);
