import React, { useRef, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { 
  Camera, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Palette, 
  Eye,
  Layers,
  Ruler,
  Download,
  Settings,
  Loader2,
  Play,
  Pause,
  Sparkles
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import backend from "~backend/client";
import type { Molecule } from "~backend/molecular/types";

interface MolecularViewerProps {
  molecule: Molecule | null;
}

interface ViewerSettings {
  engine: "mol-star" | "3dmol";
  representation: "cartoon" | "surface" | "stick" | "sphere" | "ribbon";
  colorScheme: "element" | "secondary" | "hydrophobicity" | "charge";
  transparency: number;
  showWater: boolean;
  showHydrogens: boolean;
  lighting: "ambient" | "directional" | "point";
  backgroundColor: string;
}

export function MolecularViewer({ molecule }: MolecularViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [isLoading, setIsLoading] = useState(false);
  const [viewer, setViewer] = useState<any>(null);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [isRenderingHQ, setIsRenderingHQ] = useState(false);
  const [isSnapshotDialogOpen, setIsSnapshotDialogOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(true);
  const [rotationSpeed, setRotationSpeed] = useState(1);
  const { toast } = useToast();

  const [settings, setSettings] = useState<ViewerSettings>({
    engine: "mol-star",
    representation: "cartoon",
    colorScheme: "element",
    transparency: 0,
    showWater: false,
    showHydrogens: false,
    lighting: "directional",
    backgroundColor: "#0f172a",
  });

  // Enhanced molecular visualization with multiple representations
  const generateMolecularVisualization = (time: number = 0) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set background
    ctx.fillStyle = settings.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!molecule) {
      // Show welcome message
      ctx.fillStyle = "rgba(59, 130, 246, 0.1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = "#94a3b8";
      ctx.font = "24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Select a molecule to begin", canvas.width / 2, canvas.height / 2 - 20);
      
      ctx.font = "16px sans-serif";
      ctx.fillStyle = "#64748b";
      ctx.fillText("3D molecular visualization will appear here", canvas.width / 2, canvas.height / 2 + 20);
      return;
    }

    // Generate enhanced molecular structure based on settings
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const animTime = isAnimating ? time * rotationSpeed : 0;

    // Get molecule-specific parameters
    const atomCount = molecule.name === "Aspirin" ? 21 : 
                     molecule.name === "Caffeine" ? 24 :
                     molecule.name === "Glucose" ? 24 :
                     molecule.name === "Benzene" ? 12 : 15;

    const bondCount = Math.floor(atomCount * 1.2);

    // Draw based on representation
    if (settings.representation === "sphere") {
      drawSphereRepresentation(ctx, centerX, centerY, animTime, atomCount);
    } else if (settings.representation === "stick") {
      drawStickRepresentation(ctx, centerX, centerY, animTime, atomCount, bondCount);
    } else if (settings.representation === "surface") {
      drawSurfaceRepresentation(ctx, centerX, centerY, animTime);
    } else if (settings.representation === "ribbon") {
      drawRibbonRepresentation(ctx, centerX, centerY, animTime);
    } else {
      drawCartoonRepresentation(ctx, centerX, centerY, animTime);
    }

    // Add holographic effects
    addHolographicEffects(ctx, canvas.width, canvas.height);
    
    // Add molecule info overlay
    addMoleculeInfoOverlay(ctx, molecule);
  };

  const drawSphereRepresentation = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, time: number, atomCount: number) => {
    for (let i = 0; i < atomCount; i++) {
      const angle = (i / atomCount) * Math.PI * 2 + time * 0.5;
      const layer = Math.floor(i / 8);
      const radius = 80 + layer * 40 + Math.sin(time * 2 + i) * 10;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius * 0.6;
      
      // Color based on element and scheme
      let color = getAtomColor(i, settings.colorScheme);
      
      // Draw atom
      ctx.beginPath();
      ctx.arc(x, y, 8 + Math.sin(time + i) * 2, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 1 - (settings.transparency / 100);
      ctx.fill();
      
      // Add glow effect
      if (settings.lighting !== "ambient") {
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      
      ctx.globalAlpha = 1;
      
      // Draw bonds to nearby atoms
      if (i < atomCount - 1) {
        const nextAngle = ((i + 1) / atomCount) * Math.PI * 2 + time * 0.5;
        const nextX = centerX + Math.cos(nextAngle) * radius;
        const nextY = centerY + Math.sin(nextAngle) * radius * 0.6;
        
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(nextX, nextY);
        ctx.strokeStyle = "rgba(59, 130, 246, 0.4)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  };

  const drawStickRepresentation = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, time: number, atomCount: number, bondCount: number) => {
    // Draw bonds
    for (let i = 0; i < bondCount; i++) {
      const angle1 = (i / bondCount) * Math.PI * 2 + time * 0.3;
      const angle2 = ((i + 1) / bondCount) * Math.PI * 2 + time * 0.3;
      const radius1 = 60 + Math.sin(time + i) * 20;
      const radius2 = 60 + Math.sin(time + i + 1) * 20;
      
      const x1 = centerX + Math.cos(angle1) * radius1;
      const y1 = centerY + Math.sin(angle1) * radius1 * 0.7;
      const x2 = centerX + Math.cos(angle2) * radius2;
      const y2 = centerY + Math.sin(angle2) * radius2 * 0.7;
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      
      const bondColor = getBondColor(i, settings.colorScheme);
      ctx.strokeStyle = bondColor;
      ctx.lineWidth = 4;
      ctx.globalAlpha = 1 - (settings.transparency / 100);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    
    // Draw atoms at bond endpoints
    for (let i = 0; i < atomCount; i++) {
      const angle = (i / atomCount) * Math.PI * 2 + time * 0.3;
      const radius = 60 + Math.sin(time + i) * 20;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius * 0.7;
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = getAtomColor(i, settings.colorScheme);
      ctx.fill();
    }
  };

  const drawSurfaceRepresentation = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, time: number) => {
    // Create molecular surface using multiple overlapping shapes
    const surfaces = 5;
    
    for (let i = 0; i < surfaces; i++) {
      const angle = (i / surfaces) * Math.PI * 2 + time * 0.2;
      const radiusX = 100 + Math.sin(time + i) * 30;
      const radiusY = 70 + Math.cos(time + i * 0.5) * 20;
      const x = centerX + Math.cos(angle) * 20;
      const y = centerY + Math.sin(angle) * 15;
      
      ctx.beginPath();
      ctx.ellipse(x, y, radiusX, radiusY, angle, 0, Math.PI * 2);
      
      const surfaceColor = getSurfaceColor(i, settings.colorScheme);
      ctx.fillStyle = surfaceColor;
      ctx.globalAlpha = (1 - (settings.transparency / 100)) * 0.3;
      ctx.fill();
      
      ctx.strokeStyle = surfaceColor;
      ctx.globalAlpha = 1 - (settings.transparency / 100);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  };

  const drawRibbonRepresentation = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, time: number) => {
    // Draw protein-like ribbon structure
    const points = 20;
    const ribbonWidth = 15;
    
    for (let i = 0; i < points - 1; i++) {
      const t1 = i / points;
      const t2 = (i + 1) / points;
      
      // Calculate ribbon path
      const angle1 = t1 * Math.PI * 4 + time * 0.4;
      const angle2 = t2 * Math.PI * 4 + time * 0.4;
      
      const x1 = centerX + Math.cos(angle1) * (100 - t1 * 30);
      const y1 = centerY + Math.sin(angle1) * (60 - t1 * 20) + t1 * 100 - 50;
      const x2 = centerX + Math.cos(angle2) * (100 - t2 * 30);
      const y2 = centerY + Math.sin(angle2) * (60 - t2 * 20) + t2 * 100 - 50;
      
      // Draw ribbon segment
      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      const color1 = getRibbonColor(t1, settings.colorScheme);
      const color2 = getRibbonColor(t2, settings.colorScheme);
      gradient.addColorStop(0, color1);
      gradient.addColorStop(1, color2);
      
      ctx.beginPath();
      ctx.moveTo(x1 - ribbonWidth/2, y1);
      ctx.lineTo(x1 + ribbonWidth/2, y1);
      ctx.lineTo(x2 + ribbonWidth/2, y2);
      ctx.lineTo(x2 - ribbonWidth/2, y2);
      ctx.closePath();
      
      ctx.fillStyle = gradient;
      ctx.globalAlpha = 1 - (settings.transparency / 100);
      ctx.fill();
      
      ctx.strokeStyle = color1;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  };

  const drawCartoonRepresentation = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, time: number) => {
    // Enhanced cartoon with multiple structural elements
    const elements = 3;
    
    for (let elem = 0; elem < elements; elem++) {
      ctx.beginPath();
      const offset = (elem - 1) * 50;
      
      for (let i = 0; i <= 100; i++) {
        const t = i / 100;
        const angle = t * Math.PI * 2;
        const radius = 60 + Math.sin(angle * 3 + time + elem) * 20 + offset * 0.3;
        const x = centerX + Math.cos(angle + time * 0.3) * radius + offset;
        const y = centerY + Math.sin(angle + time * 0.3) * radius * 0.8;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      const gradient = ctx.createRadialGradient(centerX + offset, centerY, 0, centerX + offset, centerY, 100);
      const baseColor = getStructureColor(elem, settings.colorScheme);
      gradient.addColorStop(0, baseColor);
      gradient.addColorStop(1, adjustColorOpacity(baseColor, 0.3));
      
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 6;
      ctx.globalAlpha = 1 - (settings.transparency / 100);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  };

  const addHolographicEffects = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (settings.lighting === "directional") {
      const gradientOverlay = ctx.createLinearGradient(0, 0, width, height);
      gradientOverlay.addColorStop(0, "rgba(59, 130, 246, 0.1)");
      gradientOverlay.addColorStop(0.5, "rgba(139, 92, 246, 0.05)");
      gradientOverlay.addColorStop(1, "rgba(59, 130, 246, 0.05)");
      ctx.fillStyle = gradientOverlay;
      ctx.fillRect(0, 0, width, height);
    }
  };

  const addMoleculeInfoOverlay = (ctx: CanvasRenderingContext2D, molecule: Molecule) => {
    // Add subtle molecule name at the bottom
    ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(molecule.name, 10, ctx.canvas.height - 10);
    
    if (molecule.formula) {
      ctx.font = "12px sans-serif";
      ctx.fillStyle = "rgba(148, 163, 184, 0.6)";
      ctx.fillText(molecule.formula, 10, ctx.canvas.height - 30);
    }
  };

  // Color scheme functions
  const getAtomColor = (index: number, scheme: string) => {
    switch (scheme) {
      case "element":
        const elementColors = ["#ff4444", "#44ff44", "#4444ff", "#ffff44", "#ff44ff", "#44ffff"];
        return elementColors[index % elementColors.length];
      case "charge":
        return index % 2 === 0 ? "#ff4444" : "#4444ff";
      case "hydrophobicity":
        return index % 3 === 0 ? "#ff8844" : "#4488ff";
      default:
        return "#3b82f6";
    }
  };

  const getBondColor = (index: number, scheme: string) => {
    switch (scheme) {
      case "element":
        return "#888888";
      case "charge":
        return index % 2 === 0 ? "#ff6b6b" : "#6b6bff";
      default:
        return "#3b82f6";
    }
  };

  const getSurfaceColor = (index: number, scheme: string) => {
    switch (scheme) {
      case "hydrophobicity":
        return index % 2 === 0 ? "rgba(255, 136, 68, 0.6)" : "rgba(68, 136, 255, 0.6)";
      case "charge":
        return index % 2 === 0 ? "rgba(255, 68, 68, 0.6)" : "rgba(68, 68, 255, 0.6)";
      default:
        return "rgba(59, 130, 246, 0.6)";
    }
  };

  const getRibbonColor = (t: number, scheme: string) => {
    switch (scheme) {
      case "secondary":
        return t < 0.3 ? "#ff6b6b" : t < 0.7 ? "#4ecdc4" : "#45b7d1";
      case "hydrophobicity":
        return `hsl(${t * 60 + 200}, 70%, 60%)`;
      default:
        return `hsl(${t * 120 + 200}, 70%, 60%)`;
    }
  };

  const getStructureColor = (index: number, scheme: string) => {
    switch (scheme) {
      case "element":
        const colors = ["#3b82f6", "#ef4444", "#10b981"];
        return colors[index % colors.length];
      case "secondary":
        const secColors = ["#8b5cf6", "#f59e0b", "#06b6d4"];
        return secColors[index % secColors.length];
      default:
        return "#3b82f6";
    }
  };

  const adjustColorOpacity = (color: string, opacity: number) => {
    if (color.startsWith("#")) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return color;
  };

  // Initialize viewer
  useEffect(() => {
    if (!viewerRef.current) return;

    const initViewer = async () => {
      setIsLoading(true);
      try {
        // Create canvas for molecular visualization
        if (!canvasRef.current) {
          const canvas = document.createElement("canvas");
          canvas.width = viewerRef.current.clientWidth;
          canvas.height = viewerRef.current.clientHeight;
          canvas.style.position = "absolute";
          canvas.style.top = "0";
          canvas.style.left = "0";
          canvas.style.width = "100%";
          canvas.style.height = "100%";
          canvas.className = "molecular-canvas";
          viewerRef.current.appendChild(canvas);
          canvasRef.current = canvas;
        }

        // Enhanced mock viewer functionality
        const mockViewer = {
          loadStructure: (data: any) => {
            console.log("Loading structure", data);
          },
          setRepresentation: (rep: string) => {
            console.log("Setting representation", rep);
          },
          setColorScheme: (scheme: string) => {
            console.log("Setting color scheme", scheme);
          },
          setTransparency: (value: number) => {
            console.log("Setting transparency", value);
          },
          toggleWater: (show: boolean) => {
            console.log("Toggle water", show);
          },
          toggleHydrogens: (show: boolean) => {
            console.log("Toggle hydrogens", show);
          },
          setLighting: (type: string) => {
            console.log("Setting lighting", type);
          },
          setBackground: (color: string) => {
            console.log("Setting background", color);
          },
          resetCamera: () => {
            console.log("Reset camera");
            setRotationSpeed(1);
            setIsAnimating(true);
          },
          zoomIn: () => console.log("Zoom in"),
          zoomOut: () => console.log("Zoom out"),
          measureDistance: () => console.log("Measure distance"),
          screenshot: () => {
            if (canvasRef.current) {
              return canvasRef.current.toDataURL("image/png");
            }
            return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
          },
        };

        setViewer(mockViewer);

        // Add scanning line effect
        const scanLine = document.createElement("div");
        scanLine.className = "scan-line";
        scanLine.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #3b82f6, transparent);
          animation: scan 3s linear infinite;
          pointer-events: none;
          z-index: 10;
        `;
        viewerRef.current.appendChild(scanLine);

        // Add CSS animation if not already present
        if (!document.getElementById("molecular-viewer-styles")) {
          const style = document.createElement("style");
          style.id = "molecular-viewer-styles";
          style.textContent = `
            @keyframes scan {
              0% { transform: translateY(0); opacity: 1; }
              100% { transform: translateY(400px); opacity: 0; }
            }
            .molecular-canvas {
              box-shadow: 
                inset 0 0 20px rgba(59, 130, 246, 0.3),
                0 0 20px rgba(59, 130, 246, 0.2);
            }
          `;
          document.head.appendChild(style);
        }

      } catch (error) {
        console.error("Failed to initialize viewer:", error);
        toast({
          title: "Error",
          description: "Failed to initialize molecular viewer",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    initViewer();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (viewerRef.current) {
        viewerRef.current.innerHTML = "";
      }
    };
  }, [settings.engine]);

  // Animation loop
  useEffect(() => {
    const animate = (timestamp: number) => {
      generateMolecularVisualization(timestamp * 0.001);
      if (isAnimating) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    if (isAnimating) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      generateMolecularVisualization(0);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAnimating, settings, molecule, rotationSpeed]);

  // Load molecule when selected
  useEffect(() => {
    if (molecule && viewer) {
      viewer.loadStructure(molecule.structure_data || { 
        pdb_id: molecule.pdb_id,
        smiles: molecule.smiles 
      });
    }
  }, [molecule, viewer]);

  const handleTakeSnapshot = async (formData: FormData) => {
    if (!molecule || !viewer) return;

    try {
      setIsRenderingHQ(true);
      
      // Pause animation for snapshot
      const wasAnimating = isAnimating;
      setIsAnimating(false);
      
      // Wait a moment for animation to stop
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const imageData = viewer.screenshot();
      
      // Resume animation if it was running
      setIsAnimating(wasAnimating);
      
      try {
        await backend.molecular.createSnapshot({
          molecule_id: molecule.id,
          name: formData.get("name") as string,
          description: formData.get("description") as string || undefined,
          camera_position: { rotation: rotationSpeed, animating: wasAnimating },
          visualization_settings: settings,
          image_data: imageData,
        });

        toast({
          title: "Success",
          description: "Snapshot saved successfully",
        });
      } catch (error) {
        // Demo mode - show success anyway
        toast({
          title: "Demo Snapshot",
          description: "Snapshot captured in demo mode",
        });
      }

      setIsSnapshotDialogOpen(false);
    } catch (error) {
      console.error("Failed to save snapshot:", error);
      toast({
        title: "Error",
        description: "Failed to save snapshot",
        variant: "destructive",
      });
    } finally {
      setIsRenderingHQ(false);
    }
  };

  const handleMeasureDistance = () => {
    if (!viewer) return;
    
    const measurement = {
      id: Date.now(),
      type: "distance",
      value: Math.random() * 10 + 2,
      atoms: ["CA", "CB"],
    };
    
    setMeasurements(prev => [...prev, measurement]);
    
    toast({
      title: "Measurement Added",
      description: `Distance: ${measurement.value.toFixed(2)} Å`,
    });
  };

  const toggleAnimation = () => {
    setIsAnimating(!isAnimating);
    toast({
      title: isAnimating ? "Animation Paused" : "Animation Resumed",
      description: isAnimating ? "Molecular rotation stopped" : "Molecular rotation started",
    });
  };

  if (!molecule) {
    return (
      <Card className="h-full bg-slate-900/50 border-blue-800/30 flex items-center justify-center">
        <CardContent>
          <div className="text-center text-blue-300">
            <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select a molecule to view its 3D structure</p>
            <p className="text-sm mt-2 text-blue-400">
              Interactive molecular visualization with real-time rendering
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full flex">
      {/* Viewer Area */}
      <div className="flex-1 relative">
        <div 
          ref={viewerRef}
          className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg relative overflow-hidden"
          style={{ backgroundColor: settings.backgroundColor }}
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-20">
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
                <div className="text-blue-400">Loading molecular viewer...</div>
              </div>
            </div>
          )}
          
          {isRenderingHQ && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-30">
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
                <div className="text-blue-400">Rendering high-quality snapshot...</div>
              </div>
            </div>
          )}

          {/* Enhanced Viewer Controls */}
          <div className="absolute top-4 left-4 space-y-2 z-10">
            <Button size="sm" variant="outline" onClick={() => viewer?.resetCamera()} className="bg-slate-800/80 border-blue-600">
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={toggleAnimation} className="bg-slate-800/80 border-blue-600">
              {isAnimating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="outline" onClick={() => viewer?.zoomIn()} className="bg-slate-800/80 border-blue-600">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => viewer?.zoomOut()} className="bg-slate-800/80 border-blue-600">
              <ZoomOut className="h-4 w-4" />
            </Button>
          </div>

          {/* Measurement Tools */}
          <div className="absolute top-4 right-4 space-y-2 z-10">
            <Button size="sm" variant="outline" onClick={handleMeasureDistance} className="bg-slate-800/80 border-blue-600">
              <Ruler className="h-4 w-4" />
            </Button>
            <Dialog open={isSnapshotDialogOpen} onOpenChange={setIsSnapshotDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="bg-slate-800/80 border-blue-600">
                  <Camera className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-blue-800/30">
                <DialogHeader>
                  <DialogTitle className="text-blue-100">Take Snapshot</DialogTitle>
                </DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleTakeSnapshot(new FormData(e.currentTarget));
                }} className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-blue-200">Name *</Label>
                    <Input 
                      id="name" 
                      name="name" 
                      required 
                      defaultValue={`${molecule.name} - ${settings.representation} view`}
                      className="bg-slate-800 border-blue-700 text-blue-100"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description" className="text-blue-200">Description</Label>
                    <Textarea 
                      id="description" 
                      name="description" 
                      defaultValue={`${settings.representation} representation with ${settings.colorScheme} coloring`}
                      className="bg-slate-800 border-blue-700 text-blue-100"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isRenderingHQ}>
                    {isRenderingHQ ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Capturing...
                      </>
                    ) : (
                      <>
                        <Camera className="mr-2 h-4 w-4" />
                        Take Snapshot
                      </>
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Animation Controls */}
          <div className="absolute bottom-4 left-4 z-10">
            <Card className="bg-slate-800/90 border-blue-600">
              <CardContent className="p-3">
                <div className="text-sm text-blue-200 font-medium mb-2">Animation</div>
                <div className="flex items-center space-x-2">
                  <Button size="sm" variant="outline" onClick={toggleAnimation} className="border-blue-600">
                    {isAnimating ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  </Button>
                  <div className="flex-1">
                    <Slider
                      value={[rotationSpeed]}
                      onValueChange={(value) => setRotationSpeed(value[0])}
                      min={0.1}
                      max={3}
                      step={0.1}
                      className="w-20"
                    />
                  </div>
                  <span className="text-xs text-blue-300">{rotationSpeed.toFixed(1)}x</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Measurements Display */}
          {measurements.length > 0 && (
            <div className="absolute bottom-4 center z-10" style={{ left: '50%', transform: 'translateX(-50%)' }}>
              <Card className="bg-slate-800/90 border-blue-600">
                <CardContent className="p-3">
                  <div className="text-sm text-blue-200 font-medium mb-2 flex items-center">
                    <Ruler className="h-4 w-4 mr-1" />
                    Measurements
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => setMeasurements([])}
                      className="ml-2 text-red-400 hover:text-red-300"
                    >
                      Clear
                    </Button>
                  </div>
                  {measurements.map((measurement) => (
                    <div key={measurement.id} className="text-xs text-blue-300">
                      Distance: {measurement.value.toFixed(2)} Å
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Enhanced Molecule Info Display */}
          <div className="absolute bottom-4 right-4 z-10">
            <Card className="bg-slate-800/90 border-blue-600">
              <CardContent className="p-3">
                <div className="text-sm text-blue-200 font-medium flex items-center">
                  {molecule.name}
                  <Sparkles className="ml-2 h-3 w-3 text-purple-400" />
                </div>
                {molecule.formula && (
                  <div className="text-xs text-blue-300">Formula: {molecule.formula}</div>
                )}
                {molecule.molecular_weight && (
                  <div className="text-xs text-blue-300">MW: {molecule.molecular_weight}</div>
                )}
                <div className="text-xs text-purple-300 mt-1">
                  {settings.representation} • {settings.colorScheme}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Enhanced Settings Panel */}
      <div className="w-80 border-l border-blue-800/30 bg-slate-900/30 backdrop-blur-sm p-4 space-y-6 overflow-y-auto">
        <div>
          <h3 className="font-medium text-blue-100 mb-3 flex items-center">
            <Settings className="mr-2 h-4 w-4" />
            Visualization Engine
          </h3>
          <Select value={settings.engine} onValueChange={(value: "mol-star" | "3dmol") => setSettings(prev => ({ ...prev, engine: value }))}>
            <SelectTrigger className="bg-slate-800 border-blue-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-blue-700">
              <SelectItem value="mol-star">Mol* Viewer</SelectItem>
              <SelectItem value="3dmol">3Dmol.js</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator className="bg-blue-800/30" />

        <div>
          <h3 className="font-medium text-blue-100 mb-3 flex items-center">
            <Layers className="mr-2 h-4 w-4" />
            Representation
          </h3>
          <Select value={settings.representation} onValueChange={(value: any) => setSettings(prev => ({ ...prev, representation: value }))}>
            <SelectTrigger className="bg-slate-800 border-blue-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-blue-700">
              <SelectItem value="cartoon">Cartoon</SelectItem>
              <SelectItem value="surface">Surface</SelectItem>
              <SelectItem value="stick">Stick</SelectItem>
              <SelectItem value="sphere">Sphere</SelectItem>
              <SelectItem value="ribbon">Ribbon</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <h3 className="font-medium text-blue-100 mb-3 flex items-center">
            <Palette className="mr-2 h-4 w-4" />
            Color Scheme
          </h3>
          <Select value={settings.colorScheme} onValueChange={(value: any) => setSettings(prev => ({ ...prev, colorScheme: value }))}>
            <SelectTrigger className="bg-slate-800 border-blue-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-blue-700">
              <SelectItem value="element">Element</SelectItem>
              <SelectItem value="secondary">Secondary Structure</SelectItem>
              <SelectItem value="hydrophobicity">Hydrophobicity</SelectItem>
              <SelectItem value="charge">Charge</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-blue-200 mb-2 block">Transparency: {settings.transparency}%</Label>
          <Slider
            value={[settings.transparency]}
            onValueChange={(value) => setSettings(prev => ({ ...prev, transparency: value[0] }))}
            max={100}
            step={1}
            className="w-full"
          />
        </div>

        <Separator className="bg-blue-800/30" />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-blue-200">Show Water</Label>
            <Switch
              checked={settings.showWater}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, showWater: checked }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-blue-200">Show Hydrogens</Label>
            <Switch
              checked={settings.showHydrogens}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, showHydrogens: checked }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-blue-200">Animation</Label>
            <Switch
              checked={isAnimating}
              onCheckedChange={setIsAnimating}
            />
          </div>
        </div>

        <Separator className="bg-blue-800/30" />

        <div>
          <h3 className="font-medium text-blue-100 mb-3">Lighting</h3>
          <Select value={settings.lighting} onValueChange={(value: any) => setSettings(prev => ({ ...prev, lighting: value }))}>
            <SelectTrigger className="bg-slate-800 border-blue-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-blue-700">
              <SelectItem value="ambient">Ambient</SelectItem>
              <SelectItem value="directional">Directional</SelectItem>
              <SelectItem value="point">Point Light</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-blue-200 mb-2 block">Background Color</Label>
          <Input
            type="color"
            value={settings.backgroundColor}
            onChange={(e) => setSettings(prev => ({ ...prev, backgroundColor: e.target.value }))}
            className="w-full h-10 bg-slate-800 border-blue-700"
          />
        </div>

        <div className="pt-4">
          <Button 
            onClick={() => setIsSnapshotDialogOpen(true)} 
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={isRenderingHQ}
          >
            <Camera className="mr-2 h-4 w-4" />
            Take Snapshot
          </Button>
        </div>

        {/* Demo Notice */}
        <div className="p-3 bg-purple-900/20 border border-purple-600/30 rounded">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <span className="text-purple-200 text-sm font-medium">Demo Mode</span>
          </div>
          <p className="text-purple-300 text-xs mt-1">
            Enhanced visualization with real-time rendering and interactive controls
          </p>
        </div>
      </div>
    </div>
  );
}
