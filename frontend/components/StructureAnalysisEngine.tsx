import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, ZoomIn, ZoomOut, RotateCcw, Settings } from 'lucide-react';

interface StructureData {
  id: string;
  name: string;
  type: 'rna' | 'protein' | 'small_molecule' | 'domain' | 'pathway' | 'network';
  sequence?: string;
  structure?: any;
  annotations?: any[];
}

interface VisualizationLayer {
  id: string;
  name: string;
  enabled: boolean;
  type: 'secondary' | 'tertiary' | 'interactions' | 'conservation' | 'annotations';
}

type VisualizationStyle = 'default' | 'simplified' | 'detailed' | 'publication';

const StructureAnalysisEngine: React.FC = () => {
  const [analysisType, setAnalysisType] = useState<string>('rna_secondary');
  const [visualizationStyle, setVisualizationStyle] = useState<VisualizationStyle>('default');
  const [layers, setLayers] = useState<VisualizationLayer[]>([
    { id: 'secondary', name: 'Secondary Structure', enabled: true, type: 'secondary' },
    { id: 'tertiary', name: 'Tertiary Structure', enabled: false, type: 'tertiary' },
    { id: 'interactions', name: 'Interactions', enabled: true, type: 'interactions' },
    { id: 'conservation', name: 'Conservation', enabled: false, type: 'conservation' },
    { id: 'annotations', name: 'Annotations', enabled: true, type: 'annotations' }
  ]);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);

  const analysisTypes = [
    { value: 'rna_secondary', label: 'RNA Secondary Structure', description: 'Dot-bracket notation, arc diagrams' },
    { value: 'protein_topology', label: 'Protein Topology', description: 'Domain architecture, transmembrane regions' },
    { value: 'small_molecule', label: 'Small Molecule', description: '2D chemical structure, pharmacophore mapping' },
    { value: 'domain_architecture', label: 'Domain Architecture', description: 'Linear domain representation with interactions' },
    { value: 'pathway_maps', label: 'Pathway Maps', description: 'Metabolic network visualization' },
    { value: 'interaction_networks', label: 'Interaction Networks', description: 'Protein-protein interaction graphs' }
  ];

  const visualizationStyles = [
    { value: 'default', label: 'Default', description: 'Standard representation' },
    { value: 'simplified', label: 'Simplified', description: 'Reduced complexity view' },
    { value: 'detailed', label: 'Detailed', description: 'All annotations visible' },
    { value: 'publication', label: 'Publication', description: 'High-quality export ready' }
  ];

  const toggleLayer = (layerId: string) => {
    setLayers(prev => prev.map(layer => 
      layer.id === layerId ? { ...layer, enabled: !layer.enabled } : layer
    ));
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 1.2, 5));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev / 1.2, 0.2));
  };

  const handleReset = () => {
    setZoomLevel(1);
    setRotation(0);
  };

  const performAnalysis = async () => {
    setIsAnalyzing(true);
    
    // Simulate analysis with different results based on type
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const mockResults = {
      rna_secondary: {
        structure: '((((....))))',
        foldingEnergy: -12.3,
        gcContent: 0.65,
        stemLoops: 2,
        bulges: 1
      },
      protein_topology: {
        domains: ['N-terminal', 'Central domain', 'C-terminal'],
        transmembraneRegions: 3,
        signalPeptide: true,
        disulfideBonds: 2
      },
      small_molecule: {
        molecularWeight: 256.3,
        logP: 2.1,
        hbdCount: 2,
        hbaCount: 4,
        rotationalBonds: 3
      }
    };

    setAnalysisResults(mockResults[analysisType as keyof typeof mockResults] || mockResults.rna_secondary);
    setIsAnalyzing(false);
  };

  const exportStructure = (format: 'svg' | 'png' | 'pdf') => {
    // Export functionality would be implemented here
    console.log(`Exporting as ${format}`);
  };

  useEffect(() => {
    // Initialize canvas and draw structure based on current settings
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        drawStructure(ctx);
      }
    }
  }, [analysisType, layers, zoomLevel, rotation, visualizationStyle]);

  const drawStructure = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.save();
    
    // Apply transformations
    ctx.scale(zoomLevel, zoomLevel);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(ctx.canvas.width / (2 * zoomLevel), ctx.canvas.height / (2 * zoomLevel));
    
    // Draw based on analysis type and enabled layers
    switch (analysisType) {
      case 'rna_secondary':
        drawRNASecondaryStructure(ctx);
        break;
      case 'protein_topology':
        drawProteinTopology(ctx);
        break;
      case 'small_molecule':
        drawSmallMolecule(ctx);
        break;
      case 'domain_architecture':
        drawDomainArchitecture(ctx);
        break;
      case 'pathway_maps':
        drawPathwayMap(ctx);
        break;
      case 'interaction_networks':
        drawInteractionNetwork(ctx);
        break;
    }
    
    ctx.restore();
  };

  const drawRNASecondaryStructure = (ctx: CanvasRenderingContext2D) => {
    // Draw RNA secondary structure with stem-loops and bulges
    const centerX = 0;
    const centerY = 0;
    const radius = 100;
    
    // Draw base pairs as arcs
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 2;
    
    // Stem region
    ctx.beginPath();
    ctx.arc(centerX - 50, centerY, 30, 0, Math.PI);
    ctx.stroke();
    
    // Loop region
    ctx.beginPath();
    ctx.arc(centerX + 50, centerY, 20, 0, 2 * Math.PI);
    ctx.stroke();
    
    // Connecting lines
    ctx.beginPath();
    ctx.moveTo(centerX - 20, centerY - 30);
    ctx.lineTo(centerX + 30, centerY - 20);
    ctx.stroke();
    
    if (layers.find(l => l.id === 'annotations' && l.enabled)) {
      ctx.fillStyle = '#CFE7FF';
      ctx.font = '12px Inter';
      ctx.fillText('5\'', centerX - 80, centerY + 5);
      ctx.fillText('3\'', centerX + 80, centerY + 5);
    }
  };

  const drawProteinTopology = (ctx: CanvasRenderingContext2D) => {
    // Draw protein domain architecture
    const domains = [
      { name: 'N-term', x: -100, width: 40, color: '#89FF6B' },
      { name: 'Central', x: -40, width: 80, color: '#00E5FF' },
      { name: 'C-term', x: 60, width: 40, color: '#FF7A59' }
    ];
    
    domains.forEach(domain => {
      ctx.fillStyle = domain.color;
      ctx.fillRect(domain.x, -10, domain.width, 20);
      
      if (layers.find(l => l.id === 'annotations' && l.enabled)) {
        ctx.fillStyle = '#CFE7FF';
        ctx.font = '10px Inter';
        ctx.fillText(domain.name, domain.x + 5, 5);
      }
    });
    
    // Draw transmembrane regions
    if (layers.find(l => l.id === 'secondary' && l.enabled)) {
      ctx.strokeStyle = '#FFE96B';
      ctx.lineWidth = 3;
      [-60, 0, 40].forEach(x => {
        ctx.beginPath();
        ctx.moveTo(x, -15);
        ctx.lineTo(x, 15);
        ctx.stroke();
      });
    }
  };

  const drawSmallMolecule = (ctx: CanvasRenderingContext2D) => {
    // Draw 2D chemical structure
    const bonds = [
      { x1: -50, y1: -30, x2: 0, y2: 0 },
      { x1: 0, y1: 0, x2: 50, y2: -30 },
      { x1: 50, y1: -30, x2: 50, y2: 30 },
      { x1: 50, y1: 30, x2: 0, y2: 60 },
      { x1: 0, y1: 60, x2: -50, y2: 30 },
      { x1: -50, y1: 30, x2: -50, y2: -30 }
    ];
    
    ctx.strokeStyle = '#E6F3FF';
    ctx.lineWidth = 2;
    
    bonds.forEach(bond => {
      ctx.beginPath();
      ctx.moveTo(bond.x1, bond.y1);
      ctx.lineTo(bond.x2, bond.y2);
      ctx.stroke();
    });
    
    // Draw atoms
    const atoms = [
      { x: -50, y: -30, label: 'C' },
      { x: 0, y: 0, label: 'N' },
      { x: 50, y: -30, label: 'O' },
      { x: 50, y: 30, label: 'C' },
      { x: 0, y: 60, label: 'C' },
      { x: -50, y: 30, label: 'C' }
    ];
    
    if (layers.find(l => l.id === 'annotations' && l.enabled)) {
      ctx.fillStyle = '#CFE7FF';
      ctx.font = '12px Inter';
      atoms.forEach(atom => {
        ctx.fillText(atom.label, atom.x - 5, atom.y + 5);
      });
    }
  };

  const drawDomainArchitecture = (ctx: CanvasRenderingContext2D) => {
    // Draw linear domain representation
    const y = 0;
    const totalLength = 200;
    const domains = [
      { start: 0, end: 60, name: 'Domain A', color: '#89FF6B' },
      { start: 80, end: 120, name: 'Domain B', color: '#00E5FF' },
      { start: 140, end: 200, name: 'Domain C', color: '#FF7A59' }
    ];
    
    // Draw backbone
    ctx.strokeStyle = '#9FC6FF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-totalLength/2, y);
    ctx.lineTo(totalLength/2, y);
    ctx.stroke();
    
    // Draw domains
    domains.forEach(domain => {
      const x = -totalLength/2 + domain.start;
      const width = domain.end - domain.start;
      
      ctx.fillStyle = domain.color;
      ctx.fillRect(x, y - 10, width, 20);
      
      if (layers.find(l => l.id === 'annotations' && l.enabled)) {
        ctx.fillStyle = '#CFE7FF';
        ctx.font = '10px Inter';
        ctx.fillText(domain.name, x + 5, y + 5);
      }
    });
  };

  const drawPathwayMap = (ctx: CanvasRenderingContext2D) => {
    // Draw metabolic pathway nodes and connections
    const nodes = [
      { x: -80, y: -40, label: 'A', color: '#89FF6B' },
      { x: 0, y: -40, label: 'B', color: '#00E5FF' },
      { x: 80, y: -40, label: 'C', color: '#FFE96B' },
      { x: -40, y: 40, label: 'D', color: '#FF7A59' },
      { x: 40, y: 40, label: 'E', color: '#3BC7FF' }
    ];
    
    const connections = [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 1, to: 3 },
      { from: 2, to: 4 },
      { from: 3, to: 4 }
    ];
    
    // Draw connections
    if (layers.find(l => l.id === 'interactions' && l.enabled)) {
      ctx.strokeStyle = '#9FC6FF';
      ctx.lineWidth = 2;
      connections.forEach(conn => {
        const from = nodes[conn.from];
        const to = nodes[conn.to];
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
        
        // Draw arrow
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const arrowX = to.x - 15 * Math.cos(angle);
        const arrowY = to.y - 15 * Math.sin(angle);
        
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(arrowX - 10 * Math.cos(angle - 0.3), arrowY - 10 * Math.sin(angle - 0.3));
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(arrowX - 10 * Math.cos(angle + 0.3), arrowY - 10 * Math.sin(angle + 0.3));
        ctx.stroke();
      });
    }
    
    // Draw nodes
    nodes.forEach(node => {
      ctx.fillStyle = node.color;
      ctx.beginPath();
      ctx.arc(node.x, node.y, 15, 0, 2 * Math.PI);
      ctx.fill();
      
      if (layers.find(l => l.id === 'annotations' && l.enabled)) {
        ctx.fillStyle = '#0B1220';
        ctx.font = 'bold 12px Inter';
        ctx.fillText(node.label, node.x - 5, node.y + 5);
      }
    });
  };

  const drawInteractionNetwork = (ctx: CanvasRenderingContext2D) => {
    // Draw protein-protein interaction network
    const proteins = [
      { x: 0, y: -60, label: 'P1', color: '#89FF6B', size: 20 },
      { x: -60, y: 30, label: 'P2', color: '#00E5FF', size: 15 },
      { x: 60, y: 30, label: 'P3', color: '#FFE96B', size: 18 },
      { x: -30, y: 0, label: 'P4', color: '#FF7A59', size: 12 },
      { x: 30, y: 0, label: 'P5', color: '#3BC7FF', size: 16 }
    ];
    
    const interactions = [
      { from: 0, to: 1, strength: 0.8 },
      { from: 0, to: 2, strength: 0.6 },
      { from: 1, to: 3, strength: 0.9 },
      { from: 2, to: 4, strength: 0.7 },
      { from: 3, to: 4, strength: 0.5 }
    ];
    
    // Draw interactions
    if (layers.find(l => l.id === 'interactions' && l.enabled)) {
      interactions.forEach(interaction => {
        const from = proteins[interaction.from];
        const to = proteins[interaction.to];
        
        ctx.strokeStyle = `rgba(159, 198, 255, ${interaction.strength})`;
        ctx.lineWidth = interaction.strength * 4;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      });
    }
    
    // Draw proteins
    proteins.forEach(protein => {
      ctx.fillStyle = protein.color;
      ctx.beginPath();
      ctx.arc(protein.x, protein.y, protein.size, 0, 2 * Math.PI);
      ctx.fill();
      
      if (layers.find(l => l.id === 'annotations' && l.enabled)) {
        ctx.fillStyle = '#0B1220';
        ctx.font = 'bold 10px Inter';
        ctx.fillText(protein.label, protein.x - 8, protein.y + 3);
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card className="holographic-panel">
        <CardHeader>
          <CardTitle className="glow-text">2D Structure Analysis Engine</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Analysis Type</label>
                <Select value={analysisType} onValueChange={setAnalysisType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {analysisTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-xs text-text-muted">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Visualization Style</label>
                <Select value={visualizationStyle} onValueChange={(value: VisualizationStyle) => setVisualizationStyle(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {visualizationStyles.map(style => (
                      <SelectItem key={style.value} value={style.value}>
                        <div>
                          <div className="font-medium">{style.label}</div>
                          <div className="text-xs text-text-muted">{style.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Button 
              onClick={performAnalysis} 
              disabled={isAnalyzing}
              className="btn-gradient-primary w-full"
            >
              {isAnalyzing ? 'Analyzing...' : 'Perform Analysis'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="holographic-panel">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Visualization Canvas</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleZoomIn}>
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleZoomOut}>
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => exportStructure('svg')}>
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative bg-slate-900/50 rounded-lg overflow-hidden" style={{ height: '400px' }}>
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={400}
                  className="w-full h-full"
                  style={{ background: 'transparent' }}
                />
                <div className="hexagon-grid" />
              </div>
              <div className="mt-4 flex justify-between items-center">
                <div className="text-sm text-text-muted">
                  Zoom: {(zoomLevel * 100).toFixed(0)}% | Rotation: {rotation}°
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => exportStructure('png')}>
                    Export PNG
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => exportStructure('svg')}>
                    Export SVG
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => exportStructure('pdf')}>
                    Export PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="holographic-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Visualization Layers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {layers.map(layer => (
                  <div key={layer.id} className="flex items-center justify-between">
                    <label className="text-sm font-medium">{layer.name}</label>
                    <Button
                      variant={layer.enabled ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleLayer(layer.id)}
                      className={layer.enabled ? "btn-gradient-primary" : ""}
                    >
                      {layer.enabled ? 'ON' : 'OFF'}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {analysisResults && (
            <Card className="holographic-panel">
              <CardHeader>
                <CardTitle>Analysis Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(analysisResults).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-sm text-text-secondary capitalize">
                        {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </span>
                      <Badge variant="outline">
                        {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : 
                         typeof value === 'number' ? value.toFixed(2) : 
                         Array.isArray(value) ? value.join(', ') : 
                         String(value)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default StructureAnalysisEngine;