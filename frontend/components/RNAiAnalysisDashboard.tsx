import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Target, 
  AlertTriangle, 
  TrendingUp, 
  Thermometer, 
  Dna, 
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  Beaker,
  ChartLine
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import backend from '~backend/client';

interface OffTargetPrediction {
  id: number;
  off_target_sequence: string;
  off_target_gene?: string;
  similarity_score: number;
  mismatch_count: number;
  seed_region_matches: number;
  risk_score?: number;
}

interface OffTargetAnalysisResult {
  design_id: number;
  analysis_summary: {
    total_sites_analyzed: number;
    potential_off_targets: number;
    high_confidence_off_targets: number;
    seed_matched_targets: number;
    risk_classification: 'low' | 'moderate' | 'high' | 'critical';
  };
  off_target_predictions: OffTargetPrediction[];
  recommendations: string[];
}

interface ThermodynamicAnalysisResult {
  design_id: number;
  stability_analysis: {
    guide_strand_stability: {
      melting_temperature: number;
      gibbs_free_energy: number;
      stability_score: number;
    };
    passenger_strand_stability: {
      melting_temperature: number;
      gibbs_free_energy: number;
      stability_score: number;
    };
    risc_loading_prediction: {
      guide_loading_probability: number;
      passenger_loading_probability: number;
      predicted_loading_efficiency: number;
      confidence_score: number;
    };
  };
  recommendations: string[];
}

interface EfficiencyPrediction {
  design_id: number;
  predicted_efficiency: number;
  confidence_score: number;
  prediction_factors: Array<{
    factor_name: string;
    contribution_score: number;
    factor_type: string;
    description: string;
  }>;
  recommended_conditions: {
    cell_culture: {
      cell_line: string;
      transfection_protocol: string;
      controls_needed: string[];
    };
    measurement_strategy: {
      primary_readouts: string[];
      time_points: number[];
    };
  };
}

interface RNAiAnalysisDashboardProps {
  designId: number;
  designInfo: {
    id: number;
    guide_sequence: string;
    design_type: string;
    specificity_score?: number;
    efficacy_prediction?: number;
  };
}

export function RNAiAnalysisDashboard({ designId, designInfo }: RNAiAnalysisDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [offTargetAnalysis, setOffTargetAnalysis] = useState<OffTargetAnalysisResult | null>(null);
  const [thermodynamicAnalysis, setThermodynamicAnalysis] = useState<ThermodynamicAnalysisResult | null>(null);
  const [efficiencyPrediction, setEfficiencyPrediction] = useState<EfficiencyPrediction | null>(null);
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const { toast } = useToast();

  const runOffTargetAnalysis = async () => {
    setLoading({ ...loading, offTarget: true });
    try {
      const result = await backend.molecular.analyzeOffTargets({
        design_id: designId,
        genome_database: 'human',
        analysis_parameters: {
          max_mismatches: 3,
          seed_mismatch_tolerance: 1,
          minimum_binding_score: 0.6,
          include_utr_regions: true,
          include_intergenic_regions: false,
          filter_by_expression: true
        }
      });
      setOffTargetAnalysis(result);
      toast({ title: 'Success', description: 'Off-target analysis completed' });
    } catch (error) {
      console.error('Off-target analysis failed:', error);
      toast({ title: 'Error', description: 'Off-target analysis failed', variant: 'destructive' });
    } finally {
      setLoading({ ...loading, offTarget: false });
    }
  };

  const runThermodynamicAnalysis = async () => {
    setLoading({ ...loading, thermodynamic: true });
    try {
      const result = await backend.molecular.analyzeThermodynamics({
        design_id: designId,
        analysis_conditions: {
          temperature: 37,
          salt_concentration: 150,
          mg_concentration: 2
        }
      });
      setThermodynamicAnalysis(result);
      toast({ title: 'Success', description: 'Thermodynamic analysis completed' });
    } catch (error) {
      console.error('Thermodynamic analysis failed:', error);
      toast({ title: 'Error', description: 'Thermodynamic analysis failed', variant: 'destructive' });
    } finally {
      setLoading({ ...loading, thermodynamic: false });
    }
  };

  const runEfficiencyPrediction = async () => {
    setLoading({ ...loading, efficiency: true });
    try {
      const result = await backend.molecular.predictEfficiency({
        design_id: designId,
        prediction_parameters: {
          cell_line: 'HEK293T',
          include_delivery_factors: true
        }
      });
      setEfficiencyPrediction(result);
      toast({ title: 'Success', description: 'Efficiency prediction completed' });
    } catch (error) {
      console.error('Efficiency prediction failed:', error);
      toast({ title: 'Error', description: 'Efficiency prediction failed', variant: 'destructive' });
    } finally {
      setLoading({ ...loading, efficiency: false });
    }
  };

  const getRiskBadgeVariant = (risk: string) => {
    switch (risk) {
      case 'low': return 'default';
      case 'moderate': return 'secondary';
      case 'high': return 'destructive';
      case 'critical': return 'destructive';
      default: return 'outline';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600';
      case 'moderate': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Design Overview Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Dna className="w-5 h-5" />
            <span>RNAi Design Analysis - Design {designInfo.id}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">Guide Sequence</label>
                <div className="font-mono bg-muted/30 p-3 rounded-lg text-sm break-all">
                  {designInfo.guide_sequence}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Design Type</label>
                  <Badge variant="outline" className="ml-2">{designInfo.design_type}</Badge>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Length</label>
                  <span className="ml-2 font-medium">{designInfo.guide_sequence.length} nt</span>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {((designInfo.specificity_score || 0) * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-blue-600">Specificity Score</div>
                  <Progress value={(designInfo.specificity_score || 0) * 100} className="mt-2" />
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {((designInfo.efficacy_prediction || 0) * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-green-600">Efficacy Prediction</div>
                  <Progress value={(designInfo.efficacy_prediction || 0) * 100} className="mt-2" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="off-targets">Off-Targets</TabsTrigger>
          <TabsTrigger value="thermodynamics">Thermodynamics</TabsTrigger>
          <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Target className="w-5 h-5 text-red-500" />
                  <span>Off-Target Analysis</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {offTargetAnalysis ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Risk Level</span>
                      <Badge variant={getRiskBadgeVariant(offTargetAnalysis.analysis_summary.risk_classification)}>
                        {offTargetAnalysis.analysis_summary.risk_classification.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-center p-3 bg-muted/20 rounded-lg">
                      <div className="text-xl font-bold">{offTargetAnalysis.analysis_summary.high_confidence_off_targets}</div>
                      <div className="text-sm text-muted-foreground">High Confidence Off-Targets</div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full" onClick={() => setActiveTab('off-targets')}>
                      View Details <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center space-y-3">
                    <p className="text-sm text-muted-foreground">Run analysis to identify potential off-target sites</p>
                    <Button 
                      onClick={runOffTargetAnalysis} 
                      disabled={loading.offTarget}
                      className="w-full"
                    >
                      {loading.offTarget ? 'Analyzing...' : 'Run Analysis'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Thermometer className="w-5 h-5 text-blue-500" />
                  <span>Thermodynamics</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {thermodynamicAnalysis ? (
                  <div className="space-y-3">
                    <div className="text-center p-3 bg-muted/20 rounded-lg">
                      <div className="text-xl font-bold">
                        {(thermodynamicAnalysis.stability_analysis.risc_loading_prediction.predicted_loading_efficiency * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">RISC Loading Efficiency</div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Guide Stability</span>
                        <span className="font-medium">
                          {thermodynamicAnalysis.stability_analysis.guide_strand_stability.melting_temperature.toFixed(1)}°C
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Guide Loading Prob.</span>
                        <span className="font-medium">
                          {(thermodynamicAnalysis.stability_analysis.risc_loading_prediction.guide_loading_probability * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full" onClick={() => setActiveTab('thermodynamics')}>
                      View Details <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center space-y-3">
                    <p className="text-sm text-muted-foreground">Analyze thermodynamic properties and RISC loading</p>
                    <Button 
                      onClick={runThermodynamicAnalysis} 
                      disabled={loading.thermodynamic}
                      className="w-full"
                    >
                      {loading.thermodynamic ? 'Analyzing...' : 'Run Analysis'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  <span>Efficiency Prediction</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {efficiencyPrediction ? (
                  <div className="space-y-3">
                    <div className="text-center p-3 bg-muted/20 rounded-lg">
                      <div className="text-xl font-bold">
                        {(efficiencyPrediction.predicted_efficiency * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Predicted Efficiency</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">Confidence</div>
                      <Progress value={efficiencyPrediction.confidence_score * 100} className="mt-1" />
                    </div>
                    <Button variant="outline" size="sm" className="w-full" onClick={() => setActiveTab('efficiency')}>
                      View Details <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center space-y-3">
                    <p className="text-sm text-muted-foreground">Predict experimental efficiency using ML models</p>
                    <Button 
                      onClick={runEfficiencyPrediction} 
                      disabled={loading.efficiency}
                      className="w-full"
                    >
                      {loading.efficiency ? 'Predicting...' : 'Run Prediction'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="off-targets" className="space-y-6">
          {offTargetAnalysis ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Off-Target Analysis Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-4 bg-muted/20 rounded-lg">
                      <div className="text-2xl font-bold">{offTargetAnalysis.analysis_summary.total_sites_analyzed}</div>
                      <div className="text-sm text-muted-foreground">Sites Analyzed</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">{offTargetAnalysis.analysis_summary.potential_off_targets}</div>
                      <div className="text-sm text-yellow-600">Potential Off-Targets</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{offTargetAnalysis.analysis_summary.high_confidence_off_targets}</div>
                      <div className="text-sm text-red-600">High Confidence</div>
                    </div>
                    <div className="text-center p-4 rounded-lg">
                      <div className={`text-2xl font-bold ${getRiskColor(offTargetAnalysis.analysis_summary.risk_classification)}`}>
                        {offTargetAnalysis.analysis_summary.risk_classification.toUpperCase()}
                      </div>
                      <div className="text-sm text-muted-foreground">Risk Level</div>
                    </div>
                  </div>

                  {offTargetAnalysis.recommendations.length > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Recommendations:</strong>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          {offTargetAnalysis.recommendations.map((rec, idx) => (
                            <li key={idx}>{rec}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Off-Target Predictions</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {offTargetAnalysis.off_target_predictions
                        .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
                        .slice(0, 10)
                        .map((prediction, idx) => (
                          <div key={prediction.id} className="p-4 border rounded-lg space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline">#{idx + 1}</Badge>
                                <span className="font-medium">{prediction.off_target_gene || 'Unknown Gene'}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm">Risk: </span>
                                <div className="w-16">
                                  <Progress value={(prediction.risk_score || 0) * 100} />
                                </div>
                                <span className="text-sm font-medium">{((prediction.risk_score || 0) * 100).toFixed(1)}%</span>
                              </div>
                            </div>
                            <div className="font-mono text-xs bg-muted/30 p-2 rounded break-all">
                              {prediction.off_target_sequence}
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>Similarity: {(prediction.similarity_score * 100).toFixed(1)}%</div>
                              <div>Mismatches: {prediction.mismatch_count}</div>
                              <div>Seed Matches: {prediction.seed_region_matches}/7</div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Off-Target Analysis Available</h3>
                <p className="text-muted-foreground mb-4">Run off-target analysis to identify potential unintended targets</p>
                <Button onClick={runOffTargetAnalysis} disabled={loading.offTarget}>
                  {loading.offTarget ? 'Running Analysis...' : 'Start Off-Target Analysis'}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="thermodynamics" className="space-y-6">
          {thermodynamicAnalysis ? (
            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Strand Stability Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-3">Guide Strand</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-blue-700 dark:text-blue-300">Melting Temperature</div>
                          <div className="font-bold text-lg">
                            {thermodynamicAnalysis.stability_analysis.guide_strand_stability.melting_temperature.toFixed(1)}°C
                          </div>
                        </div>
                        <div>
                          <div className="text-blue-700 dark:text-blue-300">Stability Score</div>
                          <div className="font-bold text-lg">
                            {(thermodynamicAnalysis.stability_analysis.guide_strand_stability.stability_score * 100).toFixed(1)}%
                          </div>
                        </div>
                        <div className="col-span-2">
                          <div className="text-blue-700 dark:text-blue-300">Gibbs Free Energy</div>
                          <div className="font-bold text-lg">
                            {thermodynamicAnalysis.stability_analysis.guide_strand_stability.gibbs_free_energy.toFixed(1)} kcal/mol
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <h4 className="font-medium text-green-900 dark:text-green-100 mb-3">Passenger Strand</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-green-700 dark:text-green-300">Melting Temperature</div>
                          <div className="font-bold text-lg">
                            {thermodynamicAnalysis.stability_analysis.passenger_strand_stability.melting_temperature.toFixed(1)}°C
                          </div>
                        </div>
                        <div>
                          <div className="text-green-700 dark:text-green-300">Stability Score</div>
                          <div className="font-bold text-lg">
                            {(thermodynamicAnalysis.stability_analysis.passenger_strand_stability.stability_score * 100).toFixed(1)}%
                          </div>
                        </div>
                        <div className="col-span-2">
                          <div className="text-green-700 dark:text-green-300">Gibbs Free Energy</div>
                          <div className="font-bold text-lg">
                            {thermodynamicAnalysis.stability_analysis.passenger_strand_stability.gibbs_free_energy.toFixed(1)} kcal/mol
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>RISC Loading Prediction</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-6 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                    <div className="text-3xl font-bold text-purple-600 mb-2">
                      {(thermodynamicAnalysis.stability_analysis.risc_loading_prediction.predicted_loading_efficiency * 100).toFixed(1)}%
                    </div>
                    <div className="text-purple-700 dark:text-purple-300">Predicted Loading Efficiency</div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Guide Loading Probability</span>
                      <div className="flex items-center space-x-2">
                        <Progress 
                          value={thermodynamicAnalysis.stability_analysis.risc_loading_prediction.guide_loading_probability * 100} 
                          className="w-20"
                        />
                        <span className="text-sm font-medium">
                          {(thermodynamicAnalysis.stability_analysis.risc_loading_prediction.guide_loading_probability * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Passenger Loading Probability</span>
                      <div className="flex items-center space-x-2">
                        <Progress 
                          value={thermodynamicAnalysis.stability_analysis.risc_loading_prediction.passenger_loading_probability * 100} 
                          className="w-20"
                        />
                        <span className="text-sm font-medium">
                          {(thermodynamicAnalysis.stability_analysis.risc_loading_prediction.passenger_loading_probability * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Confidence Score</span>
                      <div className="flex items-center space-x-2">
                        <Progress 
                          value={thermodynamicAnalysis.stability_analysis.risc_loading_prediction.confidence_score * 100} 
                          className="w-20"
                        />
                        <span className="text-sm font-medium">
                          {(thermodynamicAnalysis.stability_analysis.risc_loading_prediction.confidence_score * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {thermodynamicAnalysis.recommendations.length > 0 && (
                    <Alert>
                      <Thermometer className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Recommendations:</strong>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          {thermodynamicAnalysis.recommendations.map((rec, idx) => (
                            <li key={idx} className="text-sm">{rec}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Thermometer className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Thermodynamic Analysis Available</h3>
                <p className="text-muted-foreground mb-4">Analyze thermodynamic properties and RISC loading predictions</p>
                <Button onClick={runThermodynamicAnalysis} disabled={loading.thermodynamic}>
                  {loading.thermodynamic ? 'Running Analysis...' : 'Start Thermodynamic Analysis'}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="efficiency" className="space-y-6">
          {efficiencyPrediction ? (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Efficiency Prediction</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center space-y-4">
                    <div className="p-6 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <div className="text-4xl font-bold text-green-600 mb-2">
                        {(efficiencyPrediction.predicted_efficiency * 100).toFixed(1)}%
                      </div>
                      <div className="text-green-700 dark:text-green-300">Predicted Efficiency</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-2">Confidence Score</div>
                      <Progress value={efficiencyPrediction.confidence_score * 100} />
                      <div className="text-sm font-medium mt-1">
                        {(efficiencyPrediction.confidence_score * 100).toFixed(1)}%
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="col-span-2">
                  <CardHeader>
                    <CardTitle>Prediction Factors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {efficiencyPrediction.prediction_factors.map((factor, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                          <div>
                            <div className="font-medium">{factor.factor_name}</div>
                            <div className="text-sm text-muted-foreground">{factor.description}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{(factor.contribution_score * 100).toFixed(1)}%</div>
                            <Badge variant="outline" className="text-xs">{factor.factor_type}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recommended Experimental Conditions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-medium flex items-center space-x-2">
                        <Beaker className="w-4 h-4" />
                        <span>Cell Culture Conditions</span>
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Recommended Cell Line:</span>
                          <span className="font-medium">{efficiencyPrediction.recommended_conditions.cell_culture.cell_line}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Transfection Protocol:</span>
                          <div className="mt-1 p-2 bg-muted/30 rounded text-xs">
                            {efficiencyPrediction.recommended_conditions.cell_culture.transfection_protocol}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Required Controls:</span>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            {efficiencyPrediction.recommended_conditions.cell_culture.controls_needed.map((control, idx) => (
                              <li key={idx} className="text-xs">{control}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium flex items-center space-x-2">
                        <ChartLine className="w-4 h-4" />
                        <span>Measurement Strategy</span>
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Primary Readouts:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {efficiencyPrediction.recommended_conditions.measurement_strategy.primary_readouts.map((readout, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">{readout}</Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Recommended Time Points:</span>
                          <div className="flex space-x-2 mt-1">
                            {efficiencyPrediction.recommended_conditions.measurement_strategy.time_points.map((time, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">{time}h</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Efficiency Prediction Available</h3>
                <p className="text-muted-foreground mb-4">Use machine learning models to predict experimental efficiency</p>
                <Button onClick={runEfficiencyPrediction} disabled={loading.efficiency}>
                  {loading.efficiency ? 'Running Prediction...' : 'Start Efficiency Prediction'}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}