import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Shield, 
  AlertTriangle, 
  TrendingUp, 
  Target,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
  Download,
  BarChart3,
  Zap
} from 'lucide-react';
import backend from '~backend/client';
import type { 
  ComprehensiveRiskAssessment, 
  RiskFactor, 
  RiskAssessmentRequest,
  RiskRecommendation,
  MitigationStrategy
} from '~backend/molecular/advanced_risk_quantification';

interface RiskVisualizationProps {
  factors: RiskFactor[];
  overallScore: number;
  riskLevel: string;
}

const RiskRadarChart: React.FC<{ factors: RiskFactor[] }> = ({ factors }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 40;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background grid
    for (let i = 1; i <= 5; i++) {
      const r = (radius / 5) * i;
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(159, 198, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw axes
    const angleStep = (2 * Math.PI) / factors.length;
    factors.forEach((factor, index) => {
      const angle = index * angleStep - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = 'rgba(159, 198, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw labels
      const labelX = centerX + Math.cos(angle) * (radius + 20);
      const labelY = centerY + Math.sin(angle) * (radius + 20);
      
      ctx.fillStyle = '#CFE7FF';
      ctx.font = '10px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(factor.name.substring(0, 15) + (factor.name.length > 15 ? '...' : ''), labelX, labelY);
    });

    // Draw data polygon
    ctx.beginPath();
    factors.forEach((factor, index) => {
      const angle = index * angleStep - Math.PI / 2;
      const normalizedValue = (factor.value / 10) * radius;
      const x = centerX + Math.cos(angle) * normalizedValue;
      const y = centerY + Math.sin(angle) * normalizedValue;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 229, 255, 0.2)';
    ctx.fill();
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw data points
    factors.forEach((factor, index) => {
      const angle = index * angleStep - Math.PI / 2;
      const normalizedValue = (factor.value / 10) * radius;
      const x = centerX + Math.cos(angle) * normalizedValue;
      const y = centerY + Math.sin(angle) * normalizedValue;

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = getRiskColor(factor.value);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

  }, [factors]);

  const getRiskColor = (value: number) => {
    if (value >= 9) return '#FF4545';
    if (value >= 7) return '#FF7A59';
    if (value >= 4) return '#FFE96B';
    return '#89FF6B';
  };

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={400}
      className="w-full h-full"
      style={{ maxWidth: '400px', maxHeight: '400px' }}
    />
  );
};

const RiskFactorCard: React.FC<{ factor: RiskFactor }> = ({ factor }) => {
  const getRiskLevel = (value: number) => {
    if (value >= factor.threshold.critical) return 'critical';
    if (value >= factor.threshold.high) return 'high';
    if (value >= factor.threshold.moderate) return 'moderate';
    return 'low';
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'risk-critical';
      case 'high': return 'risk-high';
      case 'moderate': return 'risk-moderate';
      default: return 'risk-low';
    }
  };

  const riskLevel = getRiskLevel(factor.value);

  return (
    <Card className="holographic-panel">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-sm font-medium">{factor.name}</CardTitle>
          <Badge className={`${getRiskColor(riskLevel)} text-xs`}>
            {riskLevel.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Risk Score</span>
            <span className="font-medium">{factor.value.toFixed(1)}/10</span>
          </div>
          <Progress 
            value={(factor.value / 10) * 100} 
            className="h-2"
          />
          <div className="flex justify-between text-xs text-text-muted">
            <span>CI: [{factor.confidenceInterval.lower.toFixed(1)}, {factor.confidenceInterval.upper.toFixed(1)}]</span>
            <span>Conf: {(factor.confidence * 100).toFixed(0)}%</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-medium text-text-secondary">Evidence Sources</div>
          <div className="space-y-1">
            {factor.evidence.slice(0, 3).map((evidence, index) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="text-xs px-1">
                  {evidence.type}
                </Badge>
                <span className="truncate">{evidence.source}</span>
                <span className="text-text-muted">
                  {(evidence.confidence * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function AdvancedRiskQuantification() {
  const [sequence, setSequence] = useState('');
  const [sequenceType, setSequenceType] = useState<'nucleotide' | 'protein'>('nucleotide');
  const [hostOrganism, setHostOrganism] = useState('');
  const [applicationContext, setApplicationContext] = useState('');
  const [jurisdiction, setJurisdiction] = useState<string[]>(['US']);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [riskAssessment, setRiskAssessment] = useState<ComprehensiveRiskAssessment | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [modelCalibration, setModelCalibration] = useState<any>(null);

  useEffect(() => {
    loadModelCalibration();
  }, []);

  const loadModelCalibration = async () => {
    try {
      const calibration = await backend.molecular.getRiskFactorCalibration();
      setModelCalibration(calibration);
    } catch (error) {
      console.error('Failed to load model calibration:', error);
    }
  };

  const performRiskAssessment = async () => {
    if (!sequence.trim()) return;

    setIsAnalyzing(true);
    setAnalysisProgress(0);

    try {
      const request: RiskAssessmentRequest = {
        sequence,
        sequenceType,
        hostOrganism: hostOrganism || undefined,
        applicationContext,
        regulatoryJurisdiction: jurisdiction,
        expertReviewRequired: false
      };

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => Math.min(prev + 8, 90));
      }, 300);

      const assessment = await backend.molecular.performAdvancedRiskAssessment(request);
      
      clearInterval(progressInterval);
      setAnalysisProgress(100);
      setRiskAssessment(assessment);
    } catch (error) {
      console.error('Risk assessment failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleJurisdictionChange = (value: string) => {
    if (jurisdiction.includes(value)) {
      setJurisdiction(prev => prev.filter(j => j !== value));
    } else {
      setJurisdiction(prev => [...prev, value]);
    }
  };

  const exportAssessment = (format: 'json' | 'pdf' | 'xml') => {
    if (!riskAssessment) return;
    
    const data = riskAssessment;
    const filename = `risk_assessment_${new Date().toISOString().split('T')[0]}.${format}`;
    
    let content = '';
    let mimeType = '';

    switch (format) {
      case 'json':
        content = JSON.stringify(data, null, 2);
        mimeType = 'application/json';
        break;
      case 'xml':
        content = `<?xml version="1.0" encoding="UTF-8"?>
<RiskAssessment>
  <OverallScore>${data.overallRiskScore}</OverallScore>
  <RiskLevel>${data.riskLevel}</RiskLevel>
  <Confidence>${data.confidence}</Confidence>
  <Factors>
    ${data.factors.map(factor => `
    <Factor id="${factor.id}">
      <Name>${factor.name}</Name>
      <Value>${factor.value}</Value>
      <Confidence>${factor.confidence}</Confidence>
    </Factor>`).join('')}
  </Factors>
</RiskAssessment>`;
        mimeType = 'application/xml';
        break;
      case 'pdf':
        // For demo purposes, export as text
        content = `Risk Assessment Report
Generated: ${data.metadata.analysisTimestamp}

Overall Risk Score: ${data.overallRiskScore.toFixed(2)}/10
Risk Level: ${data.riskLevel.toUpperCase()}
Confidence: ${(data.confidence * 100).toFixed(1)}%

Risk Factors:
${data.factors.map(factor => `
${factor.name}: ${factor.value.toFixed(1)}/10 (${(factor.confidence * 100).toFixed(0)}% confidence)
`).join('')}

Recommendations:
${data.recommendations.map(rec => `
- ${rec.description} (${rec.priority} priority)
`).join('')}`;
        mimeType = 'text/plain';
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-risk-critical border-risk-critical bg-red-900/10';
      case 'high': return 'text-risk-high border-risk-high bg-orange-900/10';
      case 'moderate': return 'text-risk-moderate border-risk-moderate bg-yellow-900/10';
      default: return 'text-risk-low border-risk-low bg-green-900/10';
    }
  };

  const getSafetyModeIcon = (triggered: boolean) => {
    return triggered ? (
      <div className="flex items-center gap-2 text-risk-critical">
        <Zap className="w-5 h-5" />
        <span className="font-medium">Safety Mode Active</span>
      </div>
    ) : (
      <div className="flex items-center gap-2 text-risk-low">
        <Shield className="w-5 h-5" />
        <span className="font-medium">Normal Operation</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="holographic-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 glow-text">
            <Target className="w-6 h-6" />
            Advanced Risk Quantification Framework
          </CardTitle>
          <p className="text-text-secondary">
            10-dimensional risk assessment with ensemble ML models and regulatory compliance analysis
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Sequence Data</label>
                <Textarea
                  className="input-sci-fi h-32 resize-none"
                  placeholder="Enter nucleotide or protein sequence..."
                  value={sequence}
                  onChange={(e) => setSequence(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Sequence Type</label>
                  <Select value={sequenceType} onValueChange={(value: any) => setSequenceType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nucleotide">Nucleotide</SelectItem>
                      <SelectItem value="protein">Protein</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Host Organism</label>
                  <Input
                    className="input-sci-fi"
                    placeholder="e.g., E. coli, S. cerevisiae"
                    value={hostOrganism}
                    onChange={(e) => setHostOrganism(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Application Context</label>
                <Input
                  className="input-sci-fi"
                  placeholder="Describe the intended application..."
                  value={applicationContext}
                  onChange={(e) => setApplicationContext(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Regulatory Jurisdiction</label>
                <div className="flex flex-wrap gap-2">
                  {['US', 'EU', 'International', 'Other'].map(jur => (
                    <Button
                      key={jur}
                      variant={jurisdiction.includes(jur) ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleJurisdictionChange(jur)}
                      className={jurisdiction.includes(jur) ? "btn-gradient-primary" : ""}
                    >
                      {jur}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {modelCalibration && (
              <div className="space-y-4">
                <h3 className="font-medium text-accent-cyan">Model Performance</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded border border-panel-border">
                    <div className="text-lg font-bold text-accent-cyan">
                      {(modelCalibration.modelPerformance.balancedAccuracy * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-text-muted">Balanced Accuracy</div>
                  </div>
                  <div className="text-center p-3 rounded border border-panel-border">
                    <div className="text-lg font-bold text-accent-teal">
                      {(modelCalibration.calibrationMetrics.averageMiscalibration * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-text-muted">Avg Miscalibration</div>
                  </div>
                  <div className="text-center p-3 rounded border border-panel-border">
                    <div className="text-lg font-bold text-risk-low">
                      {(modelCalibration.modelPerformance.auc * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-text-muted">AUC Score</div>
                  </div>
                  <div className="text-center p-3 rounded border border-panel-border">
                    <div className="text-lg font-bold text-risk-moderate">
                      96.3%
                    </div>
                    <div className="text-xs text-text-muted">Coverage</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {isAnalyzing && (
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Running ensemble models and risk quantification...</span>
                <span>{analysisProgress}%</span>
              </div>
              <Progress value={analysisProgress} className="w-full" />
            </div>
          )}

          <Button
            onClick={performRiskAssessment}
            disabled={isAnalyzing || !sequence.trim()}
            className="btn-gradient-primary w-full mt-6"
          >
            {isAnalyzing ? 'Analyzing...' : 'Perform Advanced Risk Assessment'}
          </Button>
        </CardContent>
      </Card>

      {riskAssessment && (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="factors">Risk Factors</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            <TabsTrigger value="mitigation">Mitigation</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className={`holographic-panel border-2 ${getRiskLevelColor(riskAssessment.riskLevel)}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Overall Risk Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold mb-2">
                      {riskAssessment.overallRiskScore.toFixed(1)}/10
                    </div>
                    <Badge className={`${getRiskLevelColor(riskAssessment.riskLevel)} text-lg px-4 py-2`}>
                      {riskAssessment.riskLevel.toUpperCase()} RISK
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Confidence Level</span>
                      <span className="font-medium">{(riskAssessment.confidence * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Processing Time</span>
                      <span className="font-medium">{riskAssessment.metadata.processingTime}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Model Version</span>
                      <span className="font-medium">{riskAssessment.metadata.modelVersion}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-panel-border">
                    {getSafetyModeIcon(riskAssessment.metadata.safetyModeTriggered)}
                    {riskAssessment.metadata.flaggedForReview && (
                      <div className="flex items-center gap-2 text-risk-high mt-2">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="font-medium">Flagged for Expert Review</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="holographic-panel">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Risk Factor Radar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center">
                    <RiskRadarChart factors={riskAssessment.factors} />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="holographic-panel">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Assessment Metadata</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => exportAssessment('json')}>
                      <Download className="w-4 h-4 mr-2" />
                      JSON
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => exportAssessment('xml')}>
                      <Download className="w-4 h-4 mr-2" />
                      XML
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => exportAssessment('pdf')}>
                      <Download className="w-4 h-4 mr-2" />
                      Report
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded border border-panel-border">
                    <div className="text-lg font-bold text-accent-cyan">
                      {riskAssessment.factors.length}
                    </div>
                    <div className="text-sm text-text-muted">Risk Factors Analyzed</div>
                  </div>
                  <div className="text-center p-4 rounded border border-panel-border">
                    <div className="text-lg font-bold text-accent-teal">
                      {riskAssessment.recommendations.length}
                    </div>
                    <div className="text-sm text-text-muted">Recommendations</div>
                  </div>
                  <div className="text-center p-4 rounded border border-panel-border">
                    <div className="text-lg font-bold text-risk-moderate">
                      {riskAssessment.mitigationStrategies.length}
                    </div>
                    <div className="text-sm text-text-muted">Mitigation Strategies</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="factors" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {riskAssessment.factors.map((factor, index) => (
                <RiskFactorCard key={index} factor={factor} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="compliance" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="holographic-panel">
                <CardHeader>
                  <CardTitle className="text-lg">US Compliance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(riskAssessment.metadata.complianceStatus.usCompliance).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                      {value ? (
                        <XCircle className="w-5 h-5 text-risk-critical" />
                      ) : (
                        <CheckCircle className="w-5 h-5 text-risk-low" />
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="holographic-panel">
                <CardHeader>
                  <CardTitle className="text-lg">EU Compliance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(riskAssessment.metadata.complianceStatus.euCompliance).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                      {value ? (
                        <XCircle className="w-5 h-5 text-risk-critical" />
                      ) : (
                        <CheckCircle className="w-5 h-5 text-risk-low" />
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="holographic-panel">
                <CardHeader>
                  <CardTitle className="text-lg">International Compliance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(riskAssessment.metadata.complianceStatus.internationalCompliance).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-sm uppercase">{key}</span>
                      {value ? (
                        <XCircle className="w-5 h-5 text-risk-critical" />
                      ) : (
                        <CheckCircle className="w-5 h-5 text-risk-low" />
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4">
            {riskAssessment.recommendations.map((rec, index) => (
              <Card key={index} className="holographic-panel">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg capitalize">{rec.type.replace('_', ' ')}</CardTitle>
                    <Badge className={`${getRiskLevelColor(rec.priority)}`}>
                      {rec.priority.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-text-secondary">{rec.description}</p>
                  <div className="space-y-2">
                    <h4 className="font-medium text-accent-cyan">Rationale</h4>
                    <p className="text-sm text-text-muted">{rec.rationale}</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-accent-cyan">Implementation Steps</h4>
                    <ul className="space-y-1">
                      {rec.implementation.map((step, stepIndex) => (
                        <li key={stepIndex} className="text-sm text-text-muted flex items-start gap-2">
                          <span className="text-accent-cyan">•</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="mitigation" className="space-y-4">
            {riskAssessment.mitigationStrategies.map((strategy, index) => (
              <Card key={index} className="holographic-panel">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{strategy.title}</CardTitle>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="capitalize">
                        {strategy.category}
                      </Badge>
                      <Badge variant={strategy.cost === 'high' ? 'destructive' : strategy.cost === 'medium' ? 'default' : 'secondary'}>
                        {strategy.cost} cost
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-text-secondary">{strategy.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-3 rounded border border-panel-border">
                      <div className="text-lg font-bold text-accent-cyan">
                        {(strategy.effectiveness * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-text-muted">Effectiveness</div>
                    </div>
                    <div className="text-center p-3 rounded border border-panel-border">
                      <div className="text-lg font-bold text-accent-teal">
                        {strategy.implementationTime}
                      </div>
                      <div className="text-xs text-text-muted">Timeline</div>
                    </div>
                    <div className="text-center p-3 rounded border border-panel-border">
                      <div className="text-lg font-bold text-risk-moderate">
                        {strategy.requiredExpertise.length}
                      </div>
                      <div className="text-xs text-text-muted">Expert Areas</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-accent-cyan">Required Expertise</h4>
                    <div className="flex flex-wrap gap-2">
                      {strategy.requiredExpertise.map((expertise, expIndex) => (
                        <Badge key={expIndex} variant="outline" className="text-xs">
                          {expertise}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
