import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Search, Loader2, Sparkles, Database, Dna } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import backend from "~backend/client";
import type { Molecule } from "~backend/molecular/types";
import { CollapsibleSection } from "./CollapsibleSection";

interface MoleculeSelectorProps {
  selectedMolecule: Molecule | null;
  onMoleculeSelect: (molecule: Molecule) => void;
}

const SAMPLE_PROTEINS: Molecule[] = [
  { 
    id: 1, 
    name: "Human Insulin", 
    formula: "C256H381N65O76S6", 
    smiles: undefined, 
    molecular_weight: 5808, 
    pdb_id: "1ZNI", 
    created_at: new Date(), 
    updated_at: new Date(), 
    structure_data: { type: 'protein', organism: 'Homo sapiens', function: 'Hormone regulation' } 
  },
  { 
    id: 2, 
    name: "E. coli Beta-Lactamase", 
    formula: "C1562H2447N407O434S14", 
    smiles: undefined, 
    molecular_weight: 28900, 
    pdb_id: "1BTL", 
    created_at: new Date(), 
    updated_at: new Date(), 
    structure_data: { type: 'protein', organism: 'Escherichia coli', function: 'Antibiotic resistance' } 
  },
  { 
    id: 3, 
    name: "Green Fluorescent Protein", 
    formula: "C1178H1795N329O337S2", 
    smiles: undefined, 
    molecular_weight: 26900, 
    pdb_id: "1GFL", 
    created_at: new Date(), 
    updated_at: new Date(), 
    structure_data: { type: 'protein', organism: 'Aequorea victoria', function: 'Fluorescent reporter' } 
  },
  { 
    id: 4, 
    name: "SARS-CoV-2 Spike Protein RBD", 
    formula: "C3348H5044N972O1036S28", 
    smiles: undefined, 
    molecular_weight: 74200, 
    pdb_id: "6M0J", 
    created_at: new Date(), 
    updated_at: new Date(), 
    structure_data: { type: 'protein', organism: 'SARS-CoV-2', function: 'Viral receptor binding' } 
  },
  { 
    id: 5, 
    name: "Cas9 Nuclease", 
    formula: "C6844H10576N1824O2056S32", 
    smiles: undefined, 
    molecular_weight: 158000, 
    pdb_id: "4UN3", 
    created_at: new Date(), 
    updated_at: new Date(), 
    structure_data: { type: 'protein', organism: 'Streptococcus pyogenes', function: 'Genome editing' } 
  },
];

const SAMPLE_RNA: Molecule[] = [
  { 
    id: 6, 
    name: "Human tRNA-Phe", 
    formula: "C718H814N284O530P72", 
    smiles: undefined, 
    molecular_weight: 24500, 
    pdb_id: "1EHZ", 
    created_at: new Date(), 
    updated_at: new Date(), 
    structure_data: { type: 'rna', organism: 'Homo sapiens', function: 'Protein synthesis' } 
  },
  { 
    id: 7, 
    name: "E. coli 16S rRNA Fragment", 
    formula: "C4840H5534N1984O3574P507", 
    smiles: undefined, 
    molecular_weight: 164000, 
    pdb_id: "4V4H", 
    created_at: new Date(), 
    updated_at: new Date(), 
    structure_data: { type: 'rna', organism: 'Escherichia coli', function: 'Ribosomal structure' } 
  },
  { 
    id: 8, 
    name: "SARS-CoV-2 5' UTR", 
    formula: "C2520H2880N1020O1870P265", 
    smiles: undefined, 
    molecular_weight: 85000, 
    pdb_id: undefined, 
    created_at: new Date(), 
    updated_at: new Date(), 
    structure_data: { type: 'rna', organism: 'SARS-CoV-2', function: 'Translation regulation' } 
  },
  { 
    id: 9, 
    name: "Human microRNA let-7a", 
    formula: "C220H252N88O158P22", 
    smiles: undefined, 
    molecular_weight: 7100, 
    pdb_id: undefined, 
    created_at: new Date(), 
    updated_at: new Date(), 
    structure_data: { type: 'rna', organism: 'Homo sapiens', function: 'Gene regulation' } 
  },
  { 
    id: 10, 
    name: "Ribozyme Hammerhead", 
    formula: "C1340H1528N548O992P134", 
    smiles: undefined, 
    molecular_weight: 43000, 
    pdb_id: "1HMH", 
    created_at: new Date(), 
    updated_at: new Date(), 
    structure_data: { type: 'rna', organism: 'Synthetic', function: 'Catalytic RNA' } 
  },
  { 
    id: 11, 
    name: "Bacterial RNase P RNA", 
    formula: "C2420H2760N988O1786P243", 
    smiles: undefined, 
    molecular_weight: 78000, 
    pdb_id: "3Q1Q", 
    created_at: new Date(), 
    updated_at: new Date(), 
    structure_data: { type: 'rna', organism: 'Escherichia coli', function: 'tRNA processing' } 
  },
];

export function MoleculeSelector({ selectedMolecule, onMoleculeSelect }: MoleculeSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [sequenceType, setSequenceType] = useState<"protein" | "rna">("protein");
  const { toast } = useToast();

  const { data: molecules, isLoading, refetch } = useQuery({
    queryKey: ["molecules", searchTerm],
    queryFn: async () => {
      try {
        const response = await backend.molecular.listMolecules({ search: searchTerm || undefined, limit: 20 });
        return response.molecules;
      } catch (error) {
        console.warn("Using sample data as backend is unavailable.", error);
        const allSamples = [...SAMPLE_PROTEINS, ...SAMPLE_RNA];
        return allSamples.filter(mol => 
          !searchTerm || 
          mol.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          mol.formula?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          mol.structure_data?.organism?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
    },
  });

  const handleCreateMolecule = async (formData: FormData) => {
    const newMoleculeData = {
      name: formData.get("name") as string,
      formula: formData.get("formula") as string || undefined,
      smiles: formData.get("smiles") as string || undefined,
      pdb_id: formData.get("pdb_id") as string || undefined,
      molecular_weight: formData.get("molecular_weight") ? parseFloat(formData.get("molecular_weight") as string) : undefined,
      structure_data: {
        type: sequenceType,
        organism: formData.get("organism") as string || undefined,
        function: formData.get("function") as string || undefined,
        sequence: formData.get("sequence") as string || undefined,
      },
    };

    try {
      const newMolecule = await backend.molecular.createMolecule(newMoleculeData);
      onMoleculeSelect(newMolecule);
      refetch();
      toast({ title: "Success", description: "Sequence created successfully" });
    } catch (error) {
      console.error("Failed to create molecule:", error);
      const mockMolecule: Molecule = { 
        id: Date.now(), 
        created_at: new Date(), 
        updated_at: new Date(), 
        structure_data: newMoleculeData.structure_data, 
        ...newMoleculeData 
      };
      onMoleculeSelect(mockMolecule);
      toast({ title: "Demo Mode", description: "Sequence created in demo mode" });
    }
    setIsCreateDialogOpen(false);
  };

  const displayMolecules = molecules || [];
  const sampleProteins = SAMPLE_PROTEINS.filter(mol => 
    !searchTerm || 
    mol.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mol.structure_data?.organism?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const sampleRNA = SAMPLE_RNA.filter(mol => 
    !searchTerm || 
    mol.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mol.structure_data?.organism?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <CollapsibleSection title="Sequence Database" icon={Search} defaultOpen>
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-muted" />
          <Input
            placeholder="Search proteins and RNA..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-gradient-secondary w-full">
              <Plus className="h-4 w-4 mr-2" /> Add New Sequence
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Biological Sequence</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleCreateMolecule(new FormData(e.currentTarget)); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input id="name" name="name" required placeholder="e.g., Human Insulin" />
                </div>
                <div>
                  <Label htmlFor="sequence_type">Sequence Type *</Label>
                  <Select value={sequenceType} onValueChange={(v: any) => setSequenceType(v)} name="sequence_type">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="protein">Protein</SelectItem>
                      <SelectItem value="rna">RNA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="sequence">Sequence</Label>
                <Textarea 
                  id="sequence" 
                  name="sequence" 
                  placeholder={sequenceType === 'protein' ? 'MSKGEELFTGVVPILVELDGDVNGHKF...' : 'GCGGAUUUAGCUCAGUUGGGAGAGCGCC...'}
                  className="h-24"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="formula">Formula</Label>
                  <Input id="formula" name="formula" placeholder="e.g., C256H381N65O76S6" />
                </div>
                <div>
                  <Label htmlFor="molecular_weight">Molecular Weight</Label>
                  <Input id="molecular_weight" name="molecular_weight" type="number" placeholder="e.g., 5808" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="smiles">SMILES</Label>
                  <Input id="smiles" name="smiles" placeholder="SMILES string..." />
                </div>
                <div>
                  <Label htmlFor="pdb_id">PDB ID</Label>
                  <Input id="pdb_id" name="pdb_id" placeholder="e.g., 1ZNI" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="organism">Organism</Label>
                  <Input id="organism" name="organism" placeholder="e.g., Homo sapiens" />
                </div>
                <div>
                  <Label htmlFor="function">Function</Label>
                  <Input id="function" name="function" placeholder="e.g., Hormone regulation" />
                </div>
              </div>

              <Button type="submit" className="w-full btn-gradient-primary">Create Sequence</Button>
            </form>
          </DialogContent>
        </Dialog>
      </CollapsibleSection>

      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-accent-cyan" />
          </div>
        ) : (
          <>
            <CollapsibleSection title="Database Results" icon={Database} defaultOpen>
              <div className="space-y-2">
                {displayMolecules.map((molecule) => (
                  <button
                    key={molecule.id}
                    onClick={() => onMoleculeSelect(molecule)}
                    className={`w-full text-left p-2 rounded-md transition-colors ${
                      selectedMolecule?.id === molecule.id
                        ? "bg-accent-cyan/20 text-accent-cyan"
                        : "hover:bg-accent-cyan/10"
                    }`}
                  >
                    <div className="font-medium">{molecule.name}</div>
                    <div className="text-xs text-text-muted flex items-center justify-between">
                      <span>{molecule.structure_data?.organism || molecule.formula}</span>
                      <Badge variant="outline" className="text-xs">{molecule.structure_data?.type || 'molecule'}</Badge>
                    </div>
                  </button>
                ))}
                {displayMolecules.length === 0 && !searchTerm && (
                  <p className="text-sm text-text-muted text-center py-4">No molecules in database. Add one to get started.</p>
                )}
                {displayMolecules.length === 0 && searchTerm && (
                  <p className="text-sm text-text-muted text-center py-4">No results found for "{searchTerm}".</p>
                )}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Sample Proteins" icon={Sparkles}>
              <div className="space-y-2">
                {sampleProteins.map((molecule) => (
                  <button
                    key={molecule.id}
                    onClick={() => onMoleculeSelect(molecule)}
                    className={`w-full text-left p-2 rounded-md transition-colors ${
                      selectedMolecule?.id === molecule.id
                        ? "bg-accent-cyan/20 text-accent-cyan"
                        : "hover:bg-accent-cyan/10"
                    }`}
                  >
                    <div className="font-medium">{molecule.name}</div>
                    <div className="text-xs text-text-muted">{molecule.structure_data?.organism}</div>
                  </button>
                ))}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Sample RNA" icon={Dna}>
              <div className="space-y-2">
                {sampleRNA.map((molecule) => (
                  <button
                    key={molecule.id}
                    onClick={() => onMoleculeSelect(molecule)}
                    className={`w-full text-left p-2 rounded-md transition-colors ${
                      selectedMolecule?.id === molecule.id
                        ? "bg-accent-cyan/20 text-accent-cyan"
                        : "hover:bg-accent-cyan/10"
                    }`}
                  >
                    <div className="font-medium">{molecule.name}</div>
                    <div className="text-xs text-text-muted">{molecule.structure_data?.organism}</div>
                  </button>
                ))}
              </div>
            </CollapsibleSection>
          </>
        )}
      </div>
    </div>
  );
}
