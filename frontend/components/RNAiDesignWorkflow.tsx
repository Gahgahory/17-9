import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, Clock, Dna, Target, Zap, BarChart3, Settings } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import backend from '~backend/client';

interface RNAiTarget {
  id: number;
  target_name: string;
  target_sequence: string;
  target_type: 'mRNA' | 'lncRNA' | 'miRNA' | 'custom';
  gene_symbol?: string;
  organism: string;
  created_at: Date;
}

interface RNAiDesign {
  id: number;
  target_id: number;
  design_type: 'siRNA' | 'shRNA' | 'miRNA_mimic' | 'antagomir';
  guide_sequence: string;
  passenger_sequence?: string;
  loop_sequence?: string;
  full_sequence: string;
  specificity_score?: number;
  efficacy_prediction?: number;
  created_at: Date;
}

interface TargetValidationResult {
  is_valid: boolean;
  validation_errors: string[];
  sequence_analysis: {
    length: number;
    gc_content: number;
    complexity_score: number;
    repeat_regions: any[];
    secondary_structure_prediction: any;
  };
  accessibility_analysis: {
    accessible_regions: any[];
    average_accessibility: number;
    recommended_target_sites: any[];
  };
}

interface DesignResult {
  designs: RNAiDesign[];
  design_summary: {
    total_candidates_evaluated: number;
    designs_passing_filters: number;
    average_specificity_score: number;
    recommended_design_id?: number;
  };
}

export function RNAiDesignWorkflow() {
  const [currentStep, setCurrentStep] = useState(1);
  const [targets, setTargets] = useState<RNAiTarget[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<RNAiTarget | null>(null);
  const [designs, setDesigns] = useState<RNAiDesign[]>([]);
  const [loading, setLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<TargetValidationResult | null>(null);
  const { toast } = useToast();

  // Target creation form state
  const [targetForm, setTargetForm] = useState({
    target_name: '',
    target_sequence: '',
    target_type: 'mRNA' as const,
    gene_symbol: '',
    organism: 'human',
    transcript_id: ''
  });

  // Design parameters state
  const [designParams, setDesignParams] = useState({
    design_type: 'siRNA' as const,
    max_designs: 10,
    gc_content_range: { min: 0.3, max: 0.7 },
    avoid_seed_complementarity: true,
    filter_repeats: true,
    thermodynamic_asymmetry: true
  });

  useEffect(() => {
    loadTargets();
  }, []);

  const loadTargets = async () => {
    try {
      const response = await backend.molecular.listTargets({});
      setTargets(response.targets);
    } catch (error) {
      console.error('Failed to load targets:', error);
      toast({ title: 'Error', description: 'Failed to load targets', variant: 'destructive' });
    }
  };

  const handleCreateTarget = async () => {
    setLoading(true);
    try {
      const response = await backend.molecular.createTarget(targetForm);
      setSelectedTarget(response.target);
      setValidationResult(response.validation);
      setTargets([response.target, ...targets]);
      toast({ title: 'Success', description: 'Target created successfully' });
      setCurrentStep(2);
    } catch (error) {
      console.error('Failed to create target:', error);
      toast({ title: 'Error', description: 'Failed to create target', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleValidateTarget = async () => {
    if (!targetForm.target_sequence) return;
    
    setLoading(true);
    try {
      const result = await backend.molecular.validateTarget({
        sequence: targetForm.target_sequence,
        target_type: targetForm.target_type,
        organism: targetForm.organism
      });
      setValidationResult(result);
    } catch (error) {
      console.error('Failed to validate target:', error);
      toast({ title: 'Error', description: 'Failed to validate target', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDesignRNAi = async () => {
    if (!selectedTarget) return;

    setLoading(true);
    try {
      const response = await backend.molecular.designRNAi({
        target_id: selectedTarget.id,
        design_type: designParams.design_type,
        max_designs: designParams.max_designs,
        design_parameters: {
          length: designParams.design_type === 'siRNA' ? 21 : 19,
          gc_content_range: designParams.gc_content_range,
          avoid_seed_complementarity: designParams.avoid_seed_complementarity,
          filter_repeats: designParams.filter_repeats,
          filter_snps: true,
          minimum_distance_between_designs: 50,
          target_region_preference: 'any',
          thermodynamic_asymmetry: designParams.thermodynamic_asymmetry,
          algorithm_version: 'v2.1'
        }
      });
      setDesigns(response.designs);
      toast({ 
        title: 'Success', 
        description: `Generated ${response.designs.length} designs with average specificity ${(response.design_summary.average_specificity_score * 100).toFixed(1)}%` 
      });
      setCurrentStep(3);
    } catch (error) {
      console.error('Failed to design RNAi:', error);
      toast({ title: 'Error', description: 'Failed to generate designs', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectExistingTarget = (target: RNAiTarget) => {
    setSelectedTarget(target);
    setCurrentStep(2);
  };

  const getStepIcon = (step: number) => {
    if (step < currentStep) return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (step === currentStep) return <Clock className="w-5 h-5 text-blue-500" />;
    return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">RNA Interference Design Platform</h1>
        <p className="text-muted-foreground">Design and optimize siRNA/shRNA constructs with advanced analysis</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center space-x-8 p-6 bg-muted/20 rounded-lg">
        <div className="flex items-center space-x-2">
          {getStepIcon(1)}
          <span className={`font-medium ${currentStep >= 1 ? 'text-foreground' : 'text-muted-foreground'}`}>Target Selection</span>
        </div>
        <div className="w-12 h-0.5 bg-gray-300" />
        <div className="flex items-center space-x-2">
          {getStepIcon(2)}
          <span className={`font-medium ${currentStep >= 2 ? 'text-foreground' : 'text-muted-foreground'}`}>Design Generation</span>
        </div>
        <div className="w-12 h-0.5 bg-gray-300" />
        <div className="flex items-center space-x-2">
          {getStepIcon(3)}
          <span className={`font-medium ${currentStep >= 3 ? 'text-foreground' : 'text-muted-foreground'}`}>Analysis & Testing</span>
        </div>
      </div>

      {/* Step Content */}
      {currentStep === 1 && (
        <Tabs defaultValue="create" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create New Target</TabsTrigger>
            <TabsTrigger value="existing">Select Existing Target</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="w-5 h-5" />
                  <span>Create RNAi Target</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="target_name">Target Name</Label>
                    <Input
                      id="target_name"
                      placeholder="e.g., GAPDH_001"
                      value={targetForm.target_name}
                      onChange={(e) => setTargetForm({ ...targetForm, target_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gene_symbol">Gene Symbol</Label>
                    <Input
                      id="gene_symbol"
                      placeholder="e.g., GAPDH"
                      value={targetForm.gene_symbol}
                      onChange={(e) => setTargetForm({ ...targetForm, gene_symbol: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="target_type">Target Type</Label>
                    <Select value={targetForm.target_type} onValueChange={(value: any) => setTargetForm({ ...targetForm, target_type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mRNA">mRNA</SelectItem>
                        <SelectItem value="lncRNA">lncRNA</SelectItem>
                        <SelectItem value="miRNA">miRNA</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="organism">Organism</Label>
                    <Select value={targetForm.organism} onValueChange={(value) => setTargetForm({ ...targetForm, organism: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="human">Human</SelectItem>
                        <SelectItem value="mouse">Mouse</SelectItem>
                        <SelectItem value="rat">Rat</SelectItem>
                        <SelectItem value="zebrafish">Zebrafish</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="transcript_id">Transcript ID</Label>
                    <Input
                      id="transcript_id"
                      placeholder="e.g., NM_002046"
                      value={targetForm.transcript_id}
                      onChange={(e) => setTargetForm({ ...targetForm, transcript_id: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target_sequence">Target Sequence</Label>
                  <Textarea
                    id="target_sequence"
                    placeholder="Enter nucleotide sequence (A, T, C, G, U)..."
                    className="min-h-[120px] font-mono"
                    value={targetForm.target_sequence}
                    onChange={(e) => setTargetForm({ ...targetForm, target_sequence: e.target.value.toUpperCase() })}
                  />
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Length: {targetForm.target_sequence.length} nucleotides</span>
                    <Button variant="outline" size="sm" onClick={handleValidateTarget} disabled={!targetForm.target_sequence || loading}>
                      {loading ? 'Validating...' : 'Validate Sequence'}
                    </Button>
                  </div>
                </div>

                {validationResult && (
                  <Alert className={validationResult.is_valid ? 'border-green-500' : 'border-red-500'}>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {validationResult.is_valid ? (
                        <div className="space-y-2">
                          <p className="text-green-700">✓ Sequence validation passed</p>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>GC Content: {(validationResult.sequence_analysis.gc_content * 100).toFixed(1)}%</div>
                            <div>Complexity Score: {validationResult.sequence_analysis.complexity_score.toFixed(2)}</div>
                            <div>Accessibility: {(validationResult.accessibility_analysis.average_accessibility * 100).toFixed(1)}%</div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {validationResult.accessibility_analysis.recommended_target_sites.length} recommended target sites identified
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-red-700">⚠ Validation issues found:</p>
                          <ul className="list-disc list-inside text-sm space-y-1">
                            {validationResult.validation_errors.map((error, idx) => (
                              <li key={idx} className="text-red-600">{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                <Button 
                  onClick={handleCreateTarget} 
                  disabled={!targetForm.target_name || !targetForm.target_sequence || loading || (validationResult ? !validationResult.is_valid : false)}
                  className="w-full"
                >
                  {loading ? 'Creating Target...' : 'Create Target & Continue'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="existing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Select Existing Target</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {targets.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No targets available. Create a new target to get started.</p>
                  ) : (
                    <div className="grid gap-4">
                      {targets.map((target) => (
                        <div
                          key={target.id}
                          className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => handleSelectExistingTarget(target)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <h4 className="font-medium">{target.target_name}</h4>
                              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                <span>Gene: {target.gene_symbol || 'N/A'}</span>
                                <Badge variant="outline">{target.target_type}</Badge>
                                <span>{target.organism}</span>
                                <span>{target.target_sequence.length} bp</span>
                              </div>
                            </div>
                            <Button variant="outline" size="sm">Select</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {currentStep === 2 && selectedTarget && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <Dna className="w-5 h-5" />
                  <span>Design RNAi Constructs</span>
                </span>
                <Button variant="outline" onClick={() => setCurrentStep(1)}>Back to Targets</Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-muted/20 rounded-lg">
                <h4 className="font-medium mb-2">Selected Target: {selectedTarget.target_name}</h4>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>Gene: {selectedTarget.gene_symbol || 'N/A'}</div>
                  <div>Type: {selectedTarget.target_type}</div>
                  <div>Organism: {selectedTarget.organism}</div>
                  <div>Length: {selectedTarget.target_sequence.length} bp</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center space-x-2">
                    <Settings className="w-4 h-4" />
                    <span>Design Parameters</span>
                  </h4>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Design Type</Label>
                      <Select value={designParams.design_type} onValueChange={(value: any) => setDesignParams({ ...designParams, design_type: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="siRNA">siRNA (Small interfering RNA)</SelectItem>
                          <SelectItem value="shRNA">shRNA (Short hairpin RNA)</SelectItem>
                          <SelectItem value="miRNA_mimic">miRNA Mimic</SelectItem>
                          <SelectItem value="antagomir">Antagomir</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Maximum Designs</Label>
                      <Input
                        type="number"
                        min="1"
                        max="50"
                        value={designParams.max_designs}
                        onChange={(e) => setDesignParams({ ...designParams, max_designs: parseInt(e.target.value) || 10 })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>GC Content Range (%)</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="Min"
                          value={designParams.gc_content_range.min * 100}
                          onChange={(e) => setDesignParams({ 
                            ...designParams, 
                            gc_content_range: { ...designParams.gc_content_range, min: parseFloat(e.target.value) / 100 || 0.3 }
                          })}
                        />
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="Max"
                          value={designParams.gc_content_range.max * 100}
                          onChange={(e) => setDesignParams({ 
                            ...designParams, 
                            gc_content_range: { ...designParams.gc_content_range, max: parseFloat(e.target.value) / 100 || 0.7 }
                          })}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="avoid_seed"
                          checked={designParams.avoid_seed_complementarity}
                          onChange={(e) => setDesignParams({ ...designParams, avoid_seed_complementarity: e.target.checked })}
                        />
                        <Label htmlFor="avoid_seed" className="text-sm">Avoid seed complementarity</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="filter_repeats"
                          checked={designParams.filter_repeats}
                          onChange={(e) => setDesignParams({ ...designParams, filter_repeats: e.target.checked })}
                        />
                        <Label htmlFor="filter_repeats" className="text-sm">Filter repeat sequences</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="thermo_asymmetry"
                          checked={designParams.thermodynamic_asymmetry}
                          onChange={(e) => setDesignParams({ ...designParams, thermodynamic_asymmetry: e.target.checked })}
                        />
                        <Label htmlFor="thermo_asymmetry" className="text-sm">Optimize thermodynamic asymmetry</Label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Design Information</h4>
                  <div className="space-y-3 text-sm">
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-1">siRNA Design</h5>
                      <p className="text-blue-700 dark:text-blue-300">
                        21-nucleotide double-stranded RNA for gene silencing via RISC pathway. 
                        Optimal for transient knockdown in cell culture.
                      </p>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <h5 className="font-medium text-green-900 dark:text-green-100 mb-1">Key Features</h5>
                      <ul className="text-green-700 dark:text-green-300 space-y-1">
                        <li>• Thermodynamic asymmetry optimization</li>
                        <li>• Off-target prediction analysis</li>
                        <li>• Accessibility-based target selection</li>
                        <li>• Specificity scoring algorithms</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <Button onClick={handleDesignRNAi} disabled={loading} className="w-full" size="lg">
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Generating Designs...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Zap className="w-4 h-4" />
                    <span>Generate RNAi Designs</span>
                  </div>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {currentStep === 3 && designs.length > 0 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span>Design Results & Analysis</span>
                </span>
                <Button variant="outline" onClick={() => setCurrentStep(2)}>Back to Design</Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{designs.length}</div>
                  <div className="text-sm text-blue-600">Designs Generated</div>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {designs.filter(d => (d.specificity_score || 0) > 0.8).length}
                  </div>
                  <div className="text-sm text-green-600">High Specificity</div>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {designs.filter(d => (d.efficacy_prediction || 0) > 0.7).length}
                  </div>
                  <div className="text-sm text-purple-600">High Efficacy</div>
                </div>
                <div className="text-center p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {Math.round((designs.reduce((sum, d) => sum + (d.specificity_score || 0), 0) / designs.length) * 100)}%
                  </div>
                  <div className="text-sm text-orange-600">Avg Specificity</div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Top RNAi Designs</h4>
                <div className="space-y-3">
                  {designs
                    .sort((a, b) => (b.specificity_score || 0) - (a.specificity_score || 0))
                    .slice(0, 5)
                    .map((design, idx) => (
                      <div key={design.id} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Badge variant={idx === 0 ? 'default' : 'secondary'}>
                              {idx === 0 ? 'Recommended' : `#${idx + 1}`}
                            </Badge>
                            <span className="font-medium">Design {design.id}</span>
                            <Badge variant="outline">{design.design_type}</Badge>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <div className="text-sm font-medium">
                                Specificity: {((design.specificity_score || 0) * 100).toFixed(1)}%
                              </div>
                              <Progress 
                                value={(design.specificity_score || 0) * 100} 
                                className="w-20 h-2"
                              />
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">
                                Efficacy: {((design.efficacy_prediction || 0) * 100).toFixed(1)}%
                              </div>
                              <Progress 
                                value={(design.efficacy_prediction || 0) * 100} 
                                className="w-20 h-2"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <Label className="text-xs text-muted-foreground">Guide Sequence</Label>
                            <div className="font-mono bg-muted/30 p-2 rounded text-xs break-all">
                              {design.guide_sequence}
                            </div>
                          </div>
                          {design.passenger_sequence && (
                            <div>
                              <Label className="text-xs text-muted-foreground">Passenger Sequence</Label>
                              <div className="font-mono bg-muted/30 p-2 rounded text-xs break-all">
                                {design.passenger_sequence}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" size="sm">View Details</Button>
                          <Button variant="outline" size="sm">Off-Target Analysis</Button>
                          <Button variant="outline" size="sm">Predict Efficiency</Button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}