import React, { useState, useEffect } from "react";
import { MolecularViewer } from "./MolecularViewer";
import { RiskAssessmentPanel } from "./RiskAssessmentPanel";
import { DatabaseSearchPanel } from "./DatabaseSearchPanel";
import { AnalysisPanel } from "./AnalysisPanel";
import { AdvancedAnalysisPanel } from "./AdvancedAnalysisPanel";
import { SnapshotGallery } from "./SnapshotGallery";
import { MoleculeSelector } from "./MoleculeSelector";
import { CompatibilityPanel } from "./CompatibilityPanel";
import { RegulatoryPanel } from "./RegulatoryPanel";
import { SystemHealthPanel } from "./SystemHealthPanel";
import { FileAnalysisPanel } from "./FileAnalysisPanel";
import StructureAnalysisEngine from "./StructureAnalysisEngine";
import AdvancedRiskQuantification from "./AdvancedRiskQuantification";
import ExpertReviewWorkflow from "./ExpertReviewWorkflow";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Atom, 
  Shield, 
  Database, 
  BarChart3, 
  Camera, 
  Settings,
  HelpCircle,
  Menu,
  X,
  Sparkles,
  Signal,
  GitBranch,
  FileCheck,
  Activity,
  Microscope,
  Layers,
  Upload
} from "lucide-react";
import type { Molecule as MoleculeType } from "~backend/molecular/types";

const DEMO_MOLECULE: MoleculeType = {
  id: 1,
  name: "Human Insulin",
  formula: "C256H381N65O76S6",
  smiles: undefined,
  molecular_weight: 5808,
  pdb_id: "1ZNI",
  structure_data: { type: 'protein', organism: 'Homo sapiens', function: 'Hormone regulation' },
  created_at: new Date(),
  updated_at: new Date(),
};

const TABS = [
  { id: "file-analysis", label: "File Analysis", icon: Upload, description: "Upload and analyze bioinformatics files" },
  { id: "analysis", label: "Part Risk Analysis", icon: Atom, description: "Core biosafety assessment and molecular analysis" },
  { id: "advanced", label: "Advanced Risk Assessment", icon: Shield, description: "10-dimensional risk quantification with ensemble models" },
  { id: "structure", label: "2D Structure Analysis", icon: Microscope, description: "Multi-modal structure visualization and analysis" },
  { id: "database", label: "Database Search", icon: Database, description: "Query across 100+ integrated biological databases" },
  { id: "expert", label: "Expert Review", icon: HelpCircle, description: "Multi-reviewer workflow and consensus building" },
  { id: "compatibility", label: "Part & Host Compatibility", icon: GitBranch, description: "Organism-specific compatibility analysis" },
  { id: "regulatory", label: "Regulatory Compliance", icon: FileCheck, description: "Multi-jurisdictional regulatory screening" },
  { id: "viewer", label: "3D Visualization", icon: Layers, description: "Advanced molecular visualization" },
  { id: "snapshots", label: "Snapshot Gallery", icon: Camera, description: "Saved visualization states" },
  { id: "health", label: "System Health", icon: Activity, description: "Platform monitoring and observability" },
];

export function MolecularVisualizationApp() {
  const [selectedMolecule, setSelectedMolecule] = useState<MoleculeType | null>(null);
  const [activeTab, setActiveTab] = useState("file-analysis");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    if (!selectedMolecule && showWelcome) {
      const timer = setTimeout(() => {
        setSelectedMolecule(DEMO_MOLECULE);
        setShowWelcome(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [selectedMolecule, showWelcome]);

  const handleMoleculeSelect = (molecule: MoleculeType) => {
    setSelectedMolecule(molecule);
    if (showWelcome) setShowWelcome(false);
  };

  const TabContent = () => {
    switch (activeTab) {
      case "file-analysis": return <FileAnalysisPanel />;
      case "analysis": return <AnalysisPanel molecule={selectedMolecule} />;
      case "advanced": return <AdvancedRiskQuantification />;
      case "structure": return <StructureAnalysisEngine />;
      case "database": return <DatabaseSearchPanel onMoleculeSelect={handleMoleculeSelect} />;
      case "expert": return <ExpertReviewWorkflow />;
      case "compatibility": return <CompatibilityPanel molecule={selectedMolecule} />;
      case "regulatory": return <RegulatoryPanel molecule={selectedMolecule} />;
      case "viewer": return <MolecularViewer molecule={selectedMolecule} />;
      case "snapshots": return <SnapshotGallery molecule={selectedMolecule} />;
      case "health": return <SystemHealthPanel />;
      default: return null;
    }
  };

  const activeTabInfo = TABS.find(tab => tab.id === activeTab);

  return (
    <div className="sci-fi-container">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="flex items-center space-x-2">
            <Atom className="h-6 w-6 text-accent-cyan" />
            {sidebarOpen && (
              <div>
                <span className="font-semibold text-lg">Synthetic Biology</span>
                <div className="text-xs text-text-muted">Risk Assessment Platform</div>
              </div>
            )}
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 text-text-secondary hover:text-text-primary">
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        
        {sidebarOpen && (
          <div className="sidebar-content">
            <MoleculeSelector 
              selectedMolecule={selectedMolecule}
              onMoleculeSelect={handleMoleculeSelect}
            />
            <div className="mt-auto space-y-4">
              <div className="overview-section !p-3">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center space-x-2">
                    <Signal className="h-4 w-4 text-success-green" />
                    <span className="text-sm font-medium text-text-secondary">System Status</span>
                  </div>
                  <span className="text-sm text-success-green">Online</span>
                </div>
                <div className="text-xs text-text-muted space-y-1">
                  <div className="flex justify-between">
                    <span>Databases:</span>
                    <span className="text-accent-cyan">100+ Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ML Models:</span>
                    <span className="text-success-green">Ready</span>
                  </div>
                  <div className="flex justify-between">
                    <span>File Formats:</span>
                    <span className="text-warning-yellow">20+ Supported</span>
                  </div>
                </div>
              </div>
              <Alert className="bg-purple-900/20 border-purple-600/30 text-purple-200">
                <Sparkles className="h-4 w-4 !text-purple-400" />
                <AlertTitle>Advanced Demo</AlertTitle>
                <AlertDescription>
                  Comprehensive biosafety platform with file upload analysis and 100+ database integration.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        )}
      </aside>

      <div className="main-container">
        <header className="main-header">
          <div>
            <h1 className="text-2xl font-bold">
              {activeTab === "file-analysis" ? "File Analysis Platform" : 
               selectedMolecule ? selectedMolecule.name : "Advanced Synthetic Biology Platform"}
            </h1>
            <div className="flex items-center space-x-4 text-sm text-text-secondary">
              {selectedMolecule && activeTab !== "file-analysis" && (
                <>
                  {selectedMolecule.formula && <span>{selectedMolecule.formula}</span>}
                  {selectedMolecule.molecular_weight && <span>MW: {selectedMolecule.molecular_weight}</span>}
                  {selectedMolecule.structure_data?.type && <span>{selectedMolecule.structure_data.type.toUpperCase()}</span>}
                  <span>•</span>
                </>
              )}
              <span>{activeTabInfo?.description}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 text-xs text-text-muted bg-slate-800/50 px-2 py-1 rounded">
              <Database className="h-3 w-3" />
              <span>100+ DBs</span>
            </div>
            <div className="flex items-center space-x-1 text-xs text-text-muted bg-slate-800/50 px-2 py-1 rounded">
              <Upload className="h-3 w-3" />
              <span>20+ Formats</span>
            </div>
            <div className="flex items-center space-x-1 text-xs text-text-muted bg-slate-800/50 px-2 py-1 rounded">
              <Shield className="h-3 w-3" />
              <span>ML-Powered</span>
            </div>
            <button className="btn-icon"><Settings className="h-5 w-5" /></button>
            <button className="btn-icon"><HelpCircle className="h-5 w-5" /></button>
          </div>
        </header>

        <nav className="tabs-nav">
          {TABS.map(tab => (
            <button 
              key={tab.id}
              className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              title={tab.description}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>

        <main className="main-content">
          {showWelcome && !selectedMolecule && activeTab !== "file-analysis" ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8">
                <div className="relative inline-block mb-6">
                  <Atom className="h-24 w-24 text-accent-cyan animate-pulse" />
                  <div className="absolute inset-0 h-24 w-24 rounded-full border-2 border-accent-cyan/30 animate-ping"></div>
                  <div className="absolute inset-0 h-24 w-24 rounded-full border border-accent-teal/20 animate-pulse" style={{ animationDelay: '1s' }}></div>
                </div>
                <h2 className="text-4xl font-bold mb-4">Advanced Bioinformatics Platform</h2>
                <p className="text-text-secondary mb-6 max-w-3xl mx-auto text-lg">
                  A comprehensive computational biosafety platform implementing advanced machine learning across 100+ integrated databases 
                  for multi-modal biological sequence analysis, file format processing, regulatory compliance validation, and real-time biosafety screening.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-4xl mx-auto mt-8">
                  <div className="text-center p-4 bg-slate-900/30 rounded-lg border border-panel-border">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-accent-cyan" />
                    <div className="font-semibold">20+ File Formats</div>
                    <div className="text-sm text-text-muted">FASTA, PDB, VCF, etc.</div>
                  </div>
                  <div className="text-center p-4 bg-slate-900/30 rounded-lg border border-panel-border">
                    <Database className="h-8 w-8 mx-auto mb-2 text-accent-cyan" />
                    <div className="font-semibold">100+ Databases</div>
                    <div className="text-sm text-text-muted">Integrated sources</div>
                  </div>
                  <div className="text-center p-4 bg-slate-900/30 rounded-lg border border-panel-border">
                    <Shield className="h-8 w-8 mx-auto mb-2 text-success-green" />
                    <div className="font-semibold">ML-Powered</div>
                    <div className="text-sm text-text-muted">Risk assessment</div>
                  </div>
                  <div className="text-center p-4 bg-slate-900/30 rounded-lg border border-panel-border">
                    <Microscope className="h-8 w-8 mx-auto mb-2 text-info-orange" />
                    <div className="font-semibold">Advanced Analysis</div>
                    <div className="text-sm text-text-muted">Multi-modal AI</div>
                  </div>
                </div>
                <div className="mt-6 text-sm text-text-muted">
                  Loading demo molecule...
                </div>
              </div>
            </div>
          ) : (
            <TabContent />
          )}
        </main>
      </div>
    </div>
  );
}
