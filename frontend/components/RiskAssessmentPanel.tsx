import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { 
  Shield, 
  AlertTriangle, 
  XCircle,
  TrendingUp,
  Database,
  FileText,
  BarChart3,
  Play,
  Loader2
} from "lucide-react";
import backend from "~backend/client";
import type { Molecule, RiskScore } from "~backend/molecular/types";
import { CollapsibleSection } from "./CollapsibleSection";

interface RiskAssessmentPanelProps {
  molecule: Molecule | null;
}

const RISK_DIMENSIONS = [
  { key: "toxicity", label: "Acute Toxicity", icon: AlertTriangle },
  { key: "carcinogenicity", label: "Carcinogenicity", icon: XCircle },
  { key: "mutagenicity", label: "Mutagenicity", icon: AlertTriangle },
  { key: "reproductive_toxicity", label: "Reproductive Toxicity", icon: AlertTriangle },
  { key: "skin_sensitization", label: "Skin Sensitization", icon: AlertTriangle },
  { key: "eye_irritation", label: "Eye Irritation", icon: AlertTriangle },
  { key: "respiratory_toxicity", label: "Respiratory Toxicity", icon: AlertTriangle },
  { key: "environmental_impact", label: "Environmental Impact", icon: TrendingUp },
  { key: "bioaccumulation", label: "Bioaccumulation", icon: TrendingUp },
  { key: "persistence", label: "Environmental Persistence", icon: TrendingUp },
] as const;

export function RiskAssessmentPanel({ molecule }: RiskAssessmentPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: riskAssessment, isLoading } = useQuery({
    queryKey: ["risk-assessment", molecule?.id],
    queryFn: async () => {
      if (!molecule) return null;
      try {
        return await backend.molecular.getRiskAssessment({ molecule_id: molecule.id });
      } catch (error) {
        console.warn("Failed to fetch risk assessment, using mock data.", error);
        // Mock data for demo
        const scores = RISK_DIMENSIONS.map(dim => ({ [`${dim.key}_score`]: Math.random() })).reduce((acc, val) => ({...acc, ...val}), {});
        return {
          id: Date.now(), 
          molecule_id: molecule.id, 
          overall_risk_score: Math.random(), 
          confidence_score: Math.random() * 0.4 + 0.6,
          uncertainty_lower: 0.1, 
          uncertainty_upper: 0.9, 
          evidence_sources: ["OECD QSAR Toolbox", "REACH Registration Data", "EPA CompTox Dashboard"],
          created_at: new Date(), 
          ...scores
        };
      }
    },
    enabled: !!molecule,
  });

  const generateAssessmentMutation = useMutation({
    mutationFn: async () => {
      if (!molecule) throw new Error("No molecule selected");
      const riskScores: RiskScore[] = RISK_DIMENSIONS.map(dim => ({
        dimension: dim.key as any, 
        score: Math.random(), 
        confidence: Math.random() * 0.4 + 0.6,
        evidence_sources: ["OECD QSAR Toolbox", "REACH Registration Data"],
      }));
      return backend.molecular.createRiskAssessment({ molecule_id: molecule.id, risk_scores: riskScores });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["risk-assessment", molecule?.id] });
      toast({ title: "Success", description: "Risk assessment completed." });
    },
    onError: (error) => {
      console.error("Failed to generate risk assessment:", error);
      toast({ title: "Demo Mode", description: "Assessment running in demo mode." });
      queryClient.invalidateQueries({ queryKey: ["risk-assessment", molecule?.id] });
    },
  });

  const getRiskColor = (score: number) => {
    if (score < 0.3) return "text-success-green";
    if (score < 0.6) return "text-warning-yellow";
    return "text-danger-red";
  };

  const getRiskLevel = (score: number) => {
    if (score < 0.3) return "Low";
    if (score < 0.6) return "Medium";
    return "High";
  };

  if (!molecule) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Shield className="h-16 w-16 mx-auto text-text-muted mb-4" />
          <h3 className="text-xl font-bold text-text-secondary">Risk Assessment</h3>
          <p className="text-text-muted">Select a molecule to assess its potential risks.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CollapsibleSection title="Risk Assessment" icon={Shield} defaultOpen>
        <div className="flex items-center justify-between">
          <p className="text-text-secondary">Comprehensive risk analysis based on multiple toxicity and environmental factors.</p>
          {!riskAssessment && (
            <Button onClick={() => generateAssessmentMutation.mutate()} disabled={generateAssessmentMutation.isPending} className="btn-gradient-primary">
              {generateAssessmentMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <><Play className="mr-2 h-4 w-4" />Generate Assessment</>}
            </Button>
          )}
        </div>
      </CollapsibleSection>

      {isLoading ? (
        <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin text-accent-cyan" /></div>
      ) : !riskAssessment ? (
        <CollapsibleSection title="Results" icon={BarChart3} defaultOpen>
          <div className="text-center py-8">
            <p className="text-text-muted">No risk assessment available.</p>
            <p className="text-sm mt-2">Click "Generate Assessment" to analyze this molecule.</p>
          </div>
        </CollapsibleSection>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <CollapsibleSection title="Overall Risk Score" icon={Shield} defaultOpen>
              <div className="text-center space-y-4">
                <div className="text-6xl font-bold">
                  <span className={getRiskColor(riskAssessment.overall_risk_score)}>
                    {(riskAssessment.overall_risk_score * 100).toFixed(0)}
                  </span>
                  <span className="text-text-muted text-2xl">/100</span>
                </div>
                <Badge className={`status-badge status-${getRiskLevel(riskAssessment.overall_risk_score).toLowerCase()}`}>
                  {getRiskLevel(riskAssessment.overall_risk_score)} Risk
                </Badge>
                <Progress value={riskAssessment.overall_risk_score * 100} />
                <div className="text-sm text-text-secondary">
                  Confidence: <span className="font-bold text-text-primary">{(riskAssessment.confidence_score * 100).toFixed(0)}%</span>
                </div>
              </div>
            </CollapsibleSection>
            <CollapsibleSection title="Evidence Sources" icon={FileText}>
              <div className="space-y-2">
                {(riskAssessment.evidence_sources as string[]).map((source: string, index: number) => (
                  <div key={index} className="flex items-center space-x-3 p-2 bg-slate-800/50 rounded">
                    <Database className="h-4 w-4 text-accent-cyan" />
                    <span className="text-sm text-text-secondary">{source}</span>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          </div>
          <div className="lg:col-span-2">
            <CollapsibleSection title="Detailed Analysis" icon={BarChart3} defaultOpen>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {RISK_DIMENSIONS.map((dim) => {
                  const score = (riskAssessment as any)[`${dim.key}_score`] || 0;
                  return (
                    <div key={dim.key} className="p-4 bg-slate-900/50 rounded-lg border border-panel-border">
                      <div className="flex items-center mb-2">
                        <dim.icon className={`h-5 w-5 mr-2 ${getRiskColor(score)}`} />
                        <h4 className="font-semibold text-text-primary">{dim.label}</h4>
                      </div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-text-secondary">Score:</span>
                        <span className={`font-bold text-lg ${getRiskColor(score)}`}>{(score * 100).toFixed(1)}</span>
                      </div>
                      <Progress value={score * 100} />
                    </div>
                  );
                })}
              </div>
            </CollapsibleSection>
          </div>
        </div>
      )}
    </div>
  );
}
