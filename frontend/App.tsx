import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MolecularVisualizationApp } from "./components/MolecularVisualizationApp";
import { RNAiDesignWorkflow } from "./components/RNAiDesignWorkflow";
import { RNAiAnalysisDashboard } from "./components/RNAiAnalysisDashboard";
import { Dna, Microscope, BarChart3 } from "lucide-react";
import "./sci-fi-theme.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppInner() {
  const [selectedDesign, setSelectedDesign] = useState<{
    id: number;
    guide_sequence: string;
    design_type: string;
    specificity_score?: number;
    efficacy_prediction?: number;
  } | null>(null);

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      {/* Holographic particle system background */}
      <div className="particle-system">
        {Array.from({ length: 20 }, (_, i) => (
          <div key={i} className="particle" />
        ))}
      </div>
      
      {/* Hexagonal grid overlay */}
      <div className="hexagon-grid" />
      
      <div className="relative z-10">
        <div className="container mx-auto p-6">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
              Molecular Analysis & RNAi Design Platform
            </h1>
            <p className="text-xl text-muted-foreground">
              Advanced biosafety analysis, molecular visualization, and RNA interference design
            </p>
          </div>

          <Tabs defaultValue="molecular" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
              <TabsTrigger value="molecular" className="flex items-center space-x-2">
                <Microscope className="w-4 h-4" />
                <span>Molecular Analysis</span>
              </TabsTrigger>
              <TabsTrigger value="rnai-design" className="flex items-center space-x-2">
                <Dna className="w-4 h-4" />
                <span>RNAi Design</span>
              </TabsTrigger>
              <TabsTrigger value="rnai-analysis" className="flex items-center space-x-2" disabled={!selectedDesign}>
                <BarChart3 className="w-4 h-4" />
                <span>RNAi Analysis</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="molecular" className="space-y-6">
              <MolecularVisualizationApp />
            </TabsContent>

            <TabsContent value="rnai-design" className="space-y-6">
              <RNAiDesignWorkflow />
            </TabsContent>

            <TabsContent value="rnai-analysis" className="space-y-6">
              {selectedDesign ? (
                <RNAiAnalysisDashboard 
                  designId={selectedDesign.id} 
                  designInfo={selectedDesign} 
                />
              ) : (
                <div className="text-center py-12">
                  <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-medium mb-2">No Design Selected</h3>
                  <p className="text-muted-foreground">
                    Create an RNAi design first to access analysis tools
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInner />
      <Toaster />
    </QueryClientProvider>
  );
}
