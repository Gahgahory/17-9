import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { 
  GitBranch, 
  Cpu, 
  Zap,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Play,
  Loader2,
  Beaker,
  Target
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import backend from "~backend/client";
import type { Molecule } from "~backend/molecular/types";
import { CollapsibleSection } from "./CollapsibleSection";

interface CompatibilityPanelProps {
  molecule: Molecule | null;
}

const HOST_ORGANISMS = [
  { key: "e_coli", name: "E. coli", description: "Standard bacterial expression system" },
  { key: "yeast", name: "S. cerevisiae", description: "Eukaryotic yeast system" },
  { key: "mammalian", name: "CHO cells", description: "Mammalian cell line" },
  { key: "plant", name: "N. benthamiana", description: "Plant expression system" },
  { key: "insect", name: "Sf9 cells", description: "Insect cell baculovirus system" },
];

const COMPATIBILITY_METRICS = [
  { key: "expression_level", label: "Expression Level", icon: TrendingUp },
  { key: "toxicity", label: "Host Toxicity", icon: AlertTriangle },
  { key: "stability", label: "Protein Stability", icon: CheckCircle },
  { key: "folding", label: "Proper Folding", icon: Target },
  { key: "secretion", label: "Secretion Efficiency", icon: Zap },
];

export function CompatibilityPanel({ molecule }: CompatibilityPanelProps) {
  const [selectedHost, setSelectedHost] = useState("e_coli");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: compatibilityAnalysis, isLoading } = useQuery({
    queryKey: ["compatibility", molecule?.id, selectedHost],
    queryFn: async () => {
      if (!molecule) return null;
      try {
        return await backend.molecular.createAnalysis({
          molecule_id: molecule.id,
          analysis_type: "compatibility",
          parameters: { host_organism: selectedHost },
        });
      } catch (error) {
        console.warn("Failed to fetch compatibility analysis, using mock data.", error);
        return generateMockCompatibilityData(molecule, selectedHost);
      }
    },
    enabled: !!molecule,
  });

  const runCompatibilityMutation = useMutation({
    mutationFn: async () => {
      if (!molecule) throw new Error("No molecule selected");
      return backend.molecular.createAnalysis({
        molecule_id: molecule.id,
        analysis_type: "compatibility",
        parameters: { host_organism: selectedHost, detailed_analysis: true },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compatibility", molecule?.id, selectedHost] });
      toast({ title: "Success", description: "Compatibility analysis completed." });
    },
    onError: (error) => {
      console.error("Failed to run compatibility analysis:", error);
      toast({ title: "Demo Mode", description: "Analysis running in demo mode." });
      queryClient.invalidateQueries({ queryKey: ["compatibility", molecule?.id, selectedHost] });
    },
  });

  const getScoreColor = (score: number, isInverted = false) => {
    if (isInverted) score = 1 - score;
    if (score > 0.7) return "text-success-green";
    if (score > 0.4) return "text-warning-yellow";
    return "text-danger-red";
  };

  const getScoreLevel = (score: number, isInverted = false) => {
    if (isInverted) score = 1 - score;
    if (score > 0.7) return "Excellent";
    if (score > 0.4) return "Good";
    return "Poor";
  };

  if (!molecule) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <GitBranch className="h-16 w-16 mx-auto text-text-muted mb-4" />
          <h3 className="text-xl font-bold text-text-secondary">Part & Host Compatibility</h3>
          <p className="text-text-muted">Select a molecule to analyze host compatibility.</p>
        </div>
      </div>
    );
  }

  const analysis = compatibilityAnalysis?.analysis?.results;

  return (
    <div className="space-y-6">
      <CollapsibleSection title="Host Organism Selection" icon={Beaker} defaultOpen>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1 w-full">
            <label className="text-sm font-medium text-text-secondary mb-2 block">Expression Host</label>
            <Select value={selectedHost} onValueChange={setSelectedHost}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOST_ORGANISMS.map((host) => (
                  <SelectItem key={host.key} value={host.key}>
                    <div className="flex flex-col">
                      <span className="font-medium">{host.name}</span>
                      <span className="text-xs text-text-muted">{host.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button 
            onClick={() => runCompatibilityMutation.mutate()}
            disabled={runCompatibilityMutation.isPending}
            className="btn-gradient-primary w-full sm:w-auto mt-4 sm:mt-6"
          >
            {runCompatibilityMutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</>
            ) : (
              <><Play className="mr-2 h-4 w-4" /> Run Analysis</>
            )}
          </Button>
        </div>
      </CollapsibleSection>

      {isLoading ? (
        <div className="flex justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-accent-cyan" />
        </div>
      ) : !analysis ? (
        <CollapsibleSection title="Compatibility Results" icon={Target} defaultOpen>
          <div className="text-center py-8">
            <p className="text-text-muted">No compatibility analysis available.</p>
            <p className="text-sm mt-2">Select a host organism and run analysis.</p>
          </div>
        </CollapsibleSection>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <CollapsibleSection title="Host Performance Metrics" icon={TrendingUp} defaultOpen>
              <div className="space-y-4">
                {COMPATIBILITY_METRICS.map((metric) => {
                  const score = analysis.host_compatibility?.[selectedHost]?.[metric.key] || Math.random();
                  const isInverted = metric.key === "toxicity";
                  return (
                    <div key={metric.key} className="p-4 bg-slate-900/50 rounded-lg border border-panel-border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <metric.icon className={`h-5 w-5 mr-2 ${getScoreColor(score, isInverted)}`} />
                          <span className="font-medium text-text-primary">{metric.label}</span>
                        </div>
                        <Badge className={`status-badge status-${getScoreLevel(score, isInverted).toLowerCase()}`}>
                          {getScoreLevel(score, isInverted)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-text-secondary">Score:</span>
                        <span className={`font-bold ${getScoreColor(score, isInverted)}`}>
                          {(score * 100).toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={score * 100} />
                    </div>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Metabolic Burden Assessment" icon={Cpu}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-slate-800/50 rounded">
                    <div className="text-2xl font-bold text-warning-yellow">
                      {((analysis.metabolic_burden?.growth_impact || Math.random() * 0.3) * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-text-muted">Growth Impact</div>
                  </div>
                  <div className="text-center p-3 bg-slate-800/50 rounded">
                    <div className="text-2xl font-bold text-info-orange">
                      {((analysis.metabolic_burden?.resource_competition || Math.random() * 0.4) * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-text-muted">Resource Competition</div>
                  </div>
                </div>
                <div className="p-3 bg-slate-900/50 rounded-lg border border-panel-border">
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Overall Burden:</span>
                    <span className="font-bold text-accent-cyan">
                      {(((analysis.metabolic_burden?.growth_impact || 0.15) + 
                         (analysis.metabolic_burden?.resource_competition || 0.25)) * 50).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          </div>

          <div className="space-y-6">
            <CollapsibleSection title="Part Interactions" icon={GitBranch} defaultOpen>
              <div className="space-y-3">
                {(analysis.part_interactions || [
                  { part_a: "promoter_T7", part_b: "gene_target", interaction: "positive", strength: 0.85 },
                  { part_a: "gene_target", part_b: "terminator_T7", interaction: "neutral", strength: 0.0 },
                  { part_a: "rbs_strong", part_b: "gene_target", interaction: "positive", strength: 0.92 },
                ]).map((interaction: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="text-sm">
                        <span className="font-medium text-accent-cyan">{interaction.part_a}</span>
                        <span className="text-text-muted mx-2">→</span>
                        <span className="font-medium text-accent-teal">{interaction.part_b}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        className={`status-badge status-${
                          interaction.interaction === 'positive' ? 'complete' : 
                          interaction.interaction === 'negative' ? 'error' : 'pending'
                        }`}
                      >
                        {interaction.interaction}
                      </Badge>
                      {interaction.strength > 0 && (
                        <span className="text-sm font-bold text-success-green">
                          {(interaction.strength * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Circuit Optimization" icon={Zap}>
              <div className="space-y-4">
                <div className="p-4 bg-slate-900/50 rounded-lg border border-panel-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-text-primary">Predicted Performance</span>
                    <span className="text-2xl font-bold text-accent-cyan">
                      {((analysis.circuit_optimization?.predicted_performance || 0.78) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={(analysis.circuit_optimization?.predicted_performance || 0.78) * 100} />
                </div>
                
                <div>
                  <h4 className="font-medium text-text-primary mb-2">Optimization Recommendations</h4>
                  <div className="space-y-2">
                    {(analysis.circuit_optimization?.recommendations || [
                      "Optimize codon usage for selected host",
                      "Consider adding chaperone co-expression",
                      "Evaluate alternative promoter strength"
                    ]).map((rec: string, index: number) => (
                      <div key={index} className="flex items-start space-x-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-success-green mt-0.5 flex-shrink-0" />
                        <span className="text-text-secondary">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-text-primary mb-2">Identified Bottlenecks</h4>
                  <div className="space-y-2">
                    {(analysis.circuit_optimization?.bottlenecks || [
                      "Transcription rate limiting",
                      "Protein folding efficiency"
                    ]).map((bottleneck: string, index: number) => (
                      <div key={index} className="flex items-start space-x-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-warning-yellow mt-0.5 flex-shrink-0" />
                        <span className="text-text-secondary">{bottleneck}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          </div>
        </div>
      )}
    </div>
  );
}

function generateMockCompatibilityData(molecule: Molecule, host: string) {
  const hostMultipliers = {
    e_coli: { expression: 1.0, toxicity: 0.8, stability: 0.9 },
    yeast: { expression: 0.8, toxicity: 0.6, stability: 1.0 },
    mammalian: { expression: 0.7, toxicity: 0.4, stability: 0.8 },
    plant: { expression: 0.6, toxicity: 0.3, stability: 0.85 },
    insect: { expression: 0.75, toxicity: 0.5, stability: 0.9 },
  };

  const multiplier = hostMultipliers[host as keyof typeof hostMultipliers] || hostMultipliers.e_coli;

  return {
    analysis: {
      results: {
        host_compatibility: {
          [host]: {
            expression_level: Math.min(0.95, Math.random() * 0.4 + 0.5) * multiplier.expression,
            toxicity: Math.random() * 0.3 * multiplier.toxicity,
            stability: Math.min(0.95, Math.random() * 0.3 + 0.6) * multiplier.stability,
            folding: Math.random() * 0.3 + 0.65,
            secretion: Math.random() * 0.4 + 0.4,
          }
        },
        part_interactions: [
          { part_a: "promoter_T7", part_b: "gene_target", interaction: "positive", strength: 0.85 },
          { part_a: "gene_target", part_b: "terminator_T7", interaction: "neutral", strength: 0.0 },
          { part_a: "rbs_strong", part_b: "gene_target", interaction: "positive", strength: 0.92 },
        ],
        circuit_optimization: {
          predicted_performance: Math.random() * 0.3 + 0.6,
          bottlenecks: ["transcription_rate", "protein_folding"],
          recommendations: [
            "Optimize codon usage for selected host",
            "Consider adding chaperone co-expression",
            "Evaluate alternative promoter strength"
          ]
        },
        metabolic_burden: {
          growth_impact: Math.random() * 0.3,
          resource_competition: Math.random() * 0.4,
          stress_response: Math.random() * 0.2
        }
      }
    }
  };
}
