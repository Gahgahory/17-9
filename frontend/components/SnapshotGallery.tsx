import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { 
  Camera, 
  Download, 
  Trash2, 
  Eye,
  Calendar,
  Image as ImageIcon,
  Loader2,
  Sparkles
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import backend from "~backend/client";
import type { Molecule } from "~backend/molecular/types";
import { CollapsibleSection } from "./CollapsibleSection";

interface SnapshotGalleryProps {
  molecule: Molecule | null;
}

const SAMPLE_SNAPSHOTS: any[] = [
  { id: 1, molecule_id: 1, name: "Aspirin - Cartoon View", description: "Cartoon representation with element coloring", camera_position: {}, visualization_settings: { engine: "mol-star", representation: "cartoon", colorScheme: "element", transparency: 0 }, image_data: "sample_1", created_at: new Date(Date.now() - 86400000) },
  { id: 2, molecule_id: 1, name: "Aspirin - Surface View", description: "Surface representation showing molecular surface", camera_position: {}, visualization_settings: { engine: "mol-star", representation: "surface", colorScheme: "hydrophobicity", transparency: 20 }, image_data: "sample_2", created_at: new Date(Date.now() - 172800000) },
  { id: 3, molecule_id: 1, name: "Aspirin - Stick Model", description: "Stick representation for bond visualization", camera_position: {}, visualization_settings: { engine: "3dmol", representation: "stick", colorScheme: "charge", transparency: 0 }, image_data: "sample_3", created_at: new Date(Date.now() - 259200000) },
];

export function SnapshotGallery({ molecule }: SnapshotGalleryProps) {
  const [selectedSnapshot, setSelectedSnapshot] = useState<any>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [loadingImages, setLoadingImages] = useState<Set<number>>(new Set());
  const [imageUrls, setImageUrls] = useState<Record<number, string>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: snapshots, isLoading } = useQuery({
    queryKey: ["snapshots", molecule?.id],
    queryFn: async () => {
      if (!molecule) return [];
      try {
        const response = await backend.molecular.getSnapshots({ molecule_id: molecule.id });
        return response.snapshots;
      } catch (error) {
        return molecule.id === 1 ? SAMPLE_SNAPSHOTS : [];
      }
    },
    enabled: !!molecule,
  });

  const deleteSnapshotMutation = useMutation({
    mutationFn: (snapshotId: number) => backend.molecular.deleteSnapshot({ id: snapshotId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["snapshots", molecule?.id] });
      toast({ title: "Success", description: "Snapshot deleted." });
    },
    onError: () => toast({ title: "Demo Mode", description: "Delete not available in demo.", variant: "destructive" }),
  });

  const generatePlaceholderImage = (snapshot: any) => {
    const canvas = document.createElement('canvas');
    canvas.width = 400; 
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    
    const gradient = ctx.createLinearGradient(0, 0, 400, 300);
    gradient.addColorStop(0, '#1e293b'); 
    gradient.addColorStop(1, '#0f172a');
    ctx.fillStyle = gradient; 
    ctx.fillRect(0, 0, 400, 300);
    
    ctx.strokeStyle = '#3b82f6'; 
    ctx.lineWidth = 3;
    
    if (snapshot.visualization_settings?.representation === 'sphere') {
      for (let i = 0; i < 8; i++) {
        const x = 100 + (i % 3) * 100; 
        const y = 80 + Math.floor(i / 3) * 80;
        ctx.beginPath(); 
        ctx.arc(x, y, 15, 0, Math.PI * 2);
        ctx.fillStyle = ['#ff4444', '#44ff44', '#4444ff'][i % 3]; 
        ctx.fill(); 
        ctx.stroke();
      }
    } else {
      ctx.beginPath(); 
      ctx.moveTo(100, 100); 
      ctx.bezierCurveTo(150, 50, 250, 250, 300, 200); 
      ctx.stroke();
    }
    
    ctx.fillStyle = '#94a3b8'; 
    ctx.font = '16px sans-serif'; 
    ctx.textAlign = 'center';
    ctx.fillText(snapshot.name, 200, 280);
    return canvas.toDataURL();
  };

  const loadSnapshotImage = async (snapshot: any) => {
    if (imageUrls[snapshot.id] || loadingImages.has(snapshot.id)) return;
    setLoadingImages(prev => new Set(prev).add(snapshot.id));
    try {
      const response = await backend.molecular.getSnapshotImage({ id: snapshot.id });
      setImageUrls(prev => ({ ...prev, [snapshot.id]: response.image_url }));
    } catch (error) {
      setImageUrls(prev => ({ ...prev, [snapshot.id]: generatePlaceholderImage(snapshot) }));
    } finally {
      setLoadingImages(prev => { const newSet = new Set(prev); newSet.delete(snapshot.id); return newSet; });
    }
  };

  React.useEffect(() => {
    snapshots?.forEach(s => { 
      if (s.image_data && !imageUrls[s.id] && !loadingImages.has(s.id)) {
        loadSnapshotImage(s); 
      }
    });
  }, [snapshots, imageUrls, loadingImages]);

  const handleDownload = async (snapshot: any) => {
    const imageUrl = imageUrls[snapshot.id] || generatePlaceholderImage(snapshot);
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${snapshot.name.replace(/[^a-z0-9]/gi, '_')}.png`;
    document.body.appendChild(link); 
    link.click(); 
    document.body.removeChild(link);
    toast({ title: "Download Started", description: "Snapshot image is being downloaded." });
  };

  if (!molecule) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Camera className="h-16 w-16 mx-auto text-text-muted mb-4" />
          <h3 className="text-xl font-bold text-text-secondary">Snapshot Gallery</h3>
          <p className="text-text-muted">Select a molecule to view its snapshots.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CollapsibleSection title="Snapshot Gallery" icon={Camera} defaultOpen>
        <p className="text-text-secondary">
          Saved visualizations of <span className="font-bold text-text-primary">{molecule.name}</span>. 
          You have <span className="font-bold text-accent-cyan">{snapshots?.length || 0}</span> snapshots.
        </p>
      </CollapsibleSection>

      {isLoading ? (
        <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin text-accent-cyan" /></div>
      ) : !snapshots || snapshots.length === 0 ? (
        <div className="text-center py-8 overview-section">
          <ImageIcon className="h-12 w-12 mx-auto text-text-muted mb-4" />
          <p className="text-text-muted">No snapshots available.</p>
          <p className="text-sm mt-2">Take snapshots from the 3D viewer to see them here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {snapshots.map((snapshot) => (
            <div key={snapshot.id} className="overview-section !p-0 group">
              <div className="aspect-video bg-slate-800 rounded-t-lg flex items-center justify-center border-b border-panel-border overflow-hidden relative">
                {loadingImages.has(snapshot.id) ? (
                  <Loader2 className="h-8 w-8 text-accent-cyan animate-spin" />
                ) : imageUrls[snapshot.id] ? (
                  <img src={imageUrls[snapshot.id]} alt={snapshot.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                ) : (
                  <div className="text-center text-text-muted">
                    <ImageIcon className="h-8 w-8 mx-auto mb-2" /> 
                    No Preview
                  </div>
                )}
              </div>
              <div className="p-4 space-y-3">
                <h4 className="font-semibold text-text-primary truncate">{snapshot.name}</h4>
                <p className="text-xs text-text-secondary truncate">{snapshot.description}</p>
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <div className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    {new Date(snapshot.created_at).toLocaleDateString()}
                  </div>
                  {snapshots === SAMPLE_SNAPSHOTS && <Badge className="status-badge status-ood !py-0">Demo</Badge>}
                </div>
                <div className="flex space-x-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => { setSelectedSnapshot(snapshot); setIsViewerOpen(true); }} className="btn-outline flex-1">
                    <Eye className="h-4 w-4 mr-1" />View
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDownload(snapshot)} className="btn-outline">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => deleteSnapshotMutation.mutate(snapshot.id)} className="btn-danger-outline">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedSnapshot?.name}</DialogTitle>
          </DialogHeader>
          {selectedSnapshot && (
            <div className="space-y-4">
              <div className="bg-slate-800 rounded-lg flex items-center justify-center border border-panel-border overflow-hidden min-h-[400px]">
                {imageUrls[selectedSnapshot.id] ? (
                  <img src={imageUrls[selectedSnapshot.id]} alt={selectedSnapshot.name} className="max-w-full max-h-[60vh] object-contain" />
                ) : (
                  <div className="p-8 text-text-muted">No preview available.</div>
                )}
              </div>
              <div className="flex justify-end space-x-2">
                <Button onClick={() => handleDownload(selectedSnapshot)} className="btn-gradient-secondary">
                  <Download className="h-4 w-4 mr-2" />Download
                </Button>
                <Button onClick={() => setIsViewerOpen(false)} variant="outline" className="btn-outline">Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
