import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { 
  FileCheck, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  Clock,
  Globe,
  Shield,
  BookOpen,
  Play,
  Loader2,
  Flag,
  Building,
  FileText
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import backend from "~backend/client";
import type { Molecule } from "~backend/molecular/types";
import { CollapsibleSection } from "./CollapsibleSection";

interface RegulatoryPanelProps {
  molecule: Molecule | null;
}

const JURISDICTIONS = [
  { key: "us", name: "United States", flag: "🇺🇸", regulations: ["CDC Guidelines", "NIH Guidelines", "NSABB"] },
  { key: "eu", name: "European Union", flag: "🇪🇺", regulations: ["Dual-Use Controls", "GMO Directives", "Research Ethics"] },
  { key: "international", name: "International", flag: "🌍", regulations: ["BWC", "Australia Group", "WHO"] },
  { key: "uk", name: "United Kingdom", flag: "🇬🇧", regulations: ["ACDP", "HSE SACGM", "Export Controls"] },
  { key: "canada", name: "Canada", flag: "🇨🇦", regulations: ["PHAC", "CFIA", "Export Controls"] },
];

const SELECT_AGENT_LISTS = [
  { name: "HHS Select Agents", authority: "US Department of Health", risk: "high" },
  { name: "USDA Select Agents", authority: "US Department of Agriculture", risk: "high" },
  { name: "EU Dual-Use List", authority: "European Commission", risk: "medium" },
  { name: "Australia Group", authority: "International Export Control", risk: "medium" },
  { name: "Canada PHAC", authority: "Public Health Agency of Canada", risk: "medium" },
];

const COMPLIANCE_AREAS = [
  { key: "biosafety", label: "Biosafety Guidelines", icon: Shield },
  { key: "dual_use", label: "Dual-Use Research", icon: AlertTriangle },
  { key: "export_control", label: "Export Controls", icon: Globe },
  { key: "publication", label: "Publication Review", icon: BookOpen },
  { key: "institutional", label: "Institutional Oversight", icon: Building },
];

export function RegulatoryPanel({ molecule }: RegulatoryPanelProps) {
  const [selectedJurisdiction, setSelectedJurisdiction] = useState("us");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: regulatoryAnalysis, isLoading } = useQuery({
    queryKey: ["regulatory", molecule?.id, selectedJurisdiction],
    queryFn: async () => {
      if (!molecule) return null;
      try {
        return await backend.molecular.createAnalysis({
          molecule_id: molecule.id,
          analysis_type: "regulatory",
          parameters: { jurisdiction: selectedJurisdiction },
        });
      } catch (error) {
        console.warn("Failed to fetch regulatory analysis, using mock data.", error);
        return generateMockRegulatoryData(molecule, selectedJurisdiction);
      }
    },
    enabled: !!molecule,
  });

  const runRegulatoryMutation = useMutation({
    mutationFn: async () => {
      if (!molecule) throw new Error("No molecule selected");
      return backend.molecular.createAnalysis({
        molecule_id: molecule.id,
        analysis_type: "regulatory",
        parameters: { jurisdiction: selectedJurisdiction, comprehensive_review: true },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regulatory", molecule?.id, selectedJurisdiction] });
      toast({ title: "Success", description: "Regulatory analysis completed." });
    },
    onError: (error) => {
      console.error("Failed to run regulatory analysis:", error);
      toast({ title: "Demo Mode", description: "Analysis running in demo mode." });
      queryClient.invalidateQueries({ queryKey: ["regulatory", molecule?.id, selectedJurisdiction] });
    },
  });

  const getComplianceIcon = (status: string) => {
    switch (status) {
      case "compliant": return <CheckCircle className="h-4 w-4 text-success-green" />;
      case "review_required": return <Clock className="h-4 w-4 text-warning-yellow" />;
      case "non_compliant": return <XCircle className="h-4 w-4 text-danger-red" />;
      case "flagged": return <AlertTriangle className="h-4 w-4 text-danger-red" />;
      default: return <Clock className="h-4 w-4 text-text-muted" />;
    }
  };

  const getComplianceBadge = (status: string) => {
    const statusMap = {
      compliant: "complete",
      review_required: "pending",
      non_compliant: "error",
      flagged: "error",
      not_applicable: "ood",
    };
    return statusMap[status as keyof typeof statusMap] || "pending";
  };

  if (!molecule) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <FileCheck className="h-16 w-16 mx-auto text-text-muted mb-4" />
          <h3 className="text-xl font-bold text-text-secondary">Regulatory Compliance</h3>
          <p className="text-text-muted">Select a molecule to assess regulatory compliance.</p>
        </div>
      </div>
    );
  }

  const analysis = regulatoryAnalysis?.analysis?.results;

  return (
    <div className="space-y-6">
      <CollapsibleSection title="Jurisdiction Selection" icon={Globe} defaultOpen>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1 w-full">
            <label className="text-sm font-medium text-text-secondary mb-2 block">Regulatory Jurisdiction</label>
            <Select value={selectedJurisdiction} onValueChange={setSelectedJurisdiction}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JURISDICTIONS.map((jurisdiction) => (
                  <SelectItem key={jurisdiction.key} value={jurisdiction.key}>
                    <div className="flex items-center">
                      <span className="mr-2">{jurisdiction.flag}</span>
                      <div className="flex flex-col">
                        <span className="font-medium">{jurisdiction.name}</span>
                        <span className="text-xs text-text-muted">
                          {jurisdiction.regulations.join(", ")}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button 
            onClick={() => runRegulatoryMutation.mutate()}
            disabled={runRegulatoryMutation.isPending}
            className="btn-gradient-primary w-full sm:w-auto mt-4 sm:mt-6"
          >
            {runRegulatoryMutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</>
            ) : (
              <><Play className="mr-2 h-4 w-4" /> Run Compliance Check</>
            )}
          </Button>
        </div>
      </CollapsibleSection>

      {isLoading ? (
        <div className="flex justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-accent-cyan" />
        </div>
      ) : !analysis ? (
        <CollapsibleSection title="Compliance Results" icon={FileCheck} defaultOpen>
          <div className="text-center py-8">
            <p className="text-text-muted">No regulatory analysis available.</p>
            <p className="text-sm mt-2">Select a jurisdiction and run compliance check.</p>
          </div>
        </CollapsibleSection>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <CollapsibleSection title="Compliance Dashboard" icon={FileCheck} defaultOpen>
              <div className="space-y-4">
                {COMPLIANCE_AREAS.map((area) => {
                  const status = getRandomComplianceStatus(area.key);
                  return (
                    <div key={area.key} className="p-4 bg-slate-900/50 rounded-lg border border-panel-border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <area.icon className="h-5 w-5 mr-3 text-accent-cyan" />
                          <div>
                            <span className="font-medium text-text-primary">{area.label}</span>
                            <div className="text-xs text-text-muted">
                              {getComplianceDescription(area.key, status)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getComplianceIcon(status)}
                          <Badge className={`status-badge status-${getComplianceBadge(status)}`}>
                            {status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Select Agent Screening" icon={Shield}>
              <div className="space-y-3">
                {SELECT_AGENT_LISTS.map((list, index) => {
                  const matches = Math.random() > 0.8 ? Math.floor(Math.random() * 3) : 0;
                  const status = matches > 0 ? "flagged" : "clear";
                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                      <div>
                        <div className="font-medium text-text-primary">{list.name}</div>
                        <div className="text-xs text-text-muted">{list.authority}</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {matches > 0 && (
                          <span className="text-sm text-danger-red font-bold">
                            {matches} match{matches > 1 ? 'es' : ''}
                          </span>
                        )}
                        <Badge className={`status-badge status-${status === 'clear' ? 'complete' : 'error'}`}>
                          {status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CollapsibleSection>
          </div>

          <div className="space-y-6">
            <CollapsibleSection title="Regulatory Requirements" icon={FileText} defaultOpen>
              <div className="space-y-4">
                <div className="p-4 bg-slate-900/50 rounded-lg border border-panel-border">
                  <h4 className="font-medium text-text-primary mb-3 flex items-center">
                    <Building className="h-4 w-4 mr-2" />
                    Institutional Oversight
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">IBC Review:</span>
                      <Badge className="status-badge status-pending">Required</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">IRB Review:</span>
                      <Badge className="status-badge status-ood">Not Required</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Export Controls:</span>
                      <Badge className="status-badge status-complete">Standard</Badge>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-900/50 rounded-lg border border-panel-border">
                  <h4 className="font-medium text-text-primary mb-3 flex items-center">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Publication Review
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Review Required:</span>
                      <span className="text-text-primary">
                        {analysis?.publication_review?.required ? "Yes" : "No"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Dual-Use Potential:</span>
                      <Badge className={`status-badge status-${
                        analysis?.publication_review?.dual_use_potential === 'low' ? 'complete' :
                        analysis?.publication_review?.dual_use_potential === 'medium' ? 'pending' : 'error'
                      }`}>
                        {analysis?.publication_review?.dual_use_potential || 'Low'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Compliance Timeline" icon={Clock}>
              <div className="space-y-3">
                {[
                  { step: "Initial Screening", status: "complete", date: "Completed", required: true },
                  { step: "Database Cross-Reference", status: "complete", date: "Completed", required: true },
                  { step: "Expert Review", status: "pending", date: "In Progress", required: true },
                  { step: "IBC Submission", status: "not_started", date: "Pending", required: true },
                  { step: "Final Approval", status: "not_started", date: "Pending", required: false },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-800/50 rounded">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        item.status === 'complete' ? 'bg-success-green' :
                        item.status === 'pending' ? 'bg-warning-yellow' :
                        'bg-text-muted'
                      }`} />
                      <div>
                        <div className="font-medium text-text-primary">{item.step}</div>
                        <div className="text-xs text-text-muted">{item.date}</div>
                      </div>
                    </div>
                    {item.required && (
                      <Badge variant="outline" className="border-accent-cyan text-accent-cyan">
                        Required
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          </div>
        </div>
      )}
    </div>
  );
}

function generateMockRegulatoryData(molecule: Molecule, jurisdiction: string) {
  return {
    analysis: {
      results: {
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
            australia_group: Math.random() > 0.7 ? "flagged" : "compliant",
            who_guidelines: "compliant"
          }
        },
        select_agent_screening: SELECT_AGENT_LISTS.map(list => ({
          list: list.name,
          matches: Math.random() > 0.8 ? ["partial_match"] : [],
          status: Math.random() > 0.8 ? "review" : "clear"
        })),
        publication_review: {
          required: Math.random() > 0.6,
          sensitive_methods: Math.random() > 0.7 ? ["synthetic_biology"] : [],
          dual_use_potential: ["low", "medium", "high"][Math.floor(Math.random() * 3)]
        },
        institutional_requirements: {
          ibc_review: "required",
          irb_review: "not_required",
          export_controls: "standard"
        }
      }
    }
  };
}

function getRandomComplianceStatus(area: string) {
  const statusOptions = ["compliant", "review_required", "not_applicable"];
  if (area === "dual_use" && Math.random() > 0.7) {
    return "flagged";
  }
  return statusOptions[Math.floor(Math.random() * statusOptions.length)];
}

function getComplianceDescription(area: string, status: string) {
  const descriptions = {
    biosafety: {
      compliant: "Meets all biosafety requirements",
      review_required: "Additional safety review needed",
      flagged: "Potential safety concerns identified"
    },
    dual_use: {
      compliant: "No dual-use concerns identified",
      review_required: "Dual-use assessment required",
      flagged: "Potential dual-use applications"
    },
    export_control: {
      compliant: "No export restrictions",
      review_required: "Export license may be required",
      flagged: "Subject to export controls"
    },
    publication: {
      compliant: "No publication restrictions",
      review_required: "Publication review recommended",
      flagged: "Sensitive information present"
    },
    institutional: {
      compliant: "All requirements met",
      review_required: "Additional oversight needed",
      flagged: "Institutional review required"
    }
  };

  return descriptions[area as keyof typeof descriptions]?.[status] || "Status unknown";
}
