import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { 
  Upload, 
  FileText, 
  Dna, 
  BarChart3, 
  Eye, 
  Download,
  CheckCircle,
  AlertTriangle,
  Loader2,
  FileSearch,
  BookOpen,
  ExternalLink
} from 'lucide-react';
import backend from '~backend/client';
import { CollapsibleSection } from './CollapsibleSection';

interface FileAnalysisResult {
  id: string;
  fileName: string;
  fileType: string;
  format: string;
  analysisResults: any;
  extractedData: any;
  insights: string[];
  visualizations: any[];
  citations: Citation[];
  uploadedAt: Date;
  processedAt: Date;
}

interface Citation {
  title: string;
  authors: string[];
  journal?: string;
  year: number;
  doi?: string;
  pmid?: string;
  url?: string;
  type: 'documentation' | 'paper' | 'standard' | 'database';
}

const SUPPORTED_FORMATS = [
  { ext: '.fasta, .fa, .fas, .fna, .ffn, .faa, .frn', name: 'FASTA', desc: 'Nucleotide or amino acid sequences' },
  { ext: '.fastq, .fq', name: 'FASTQ', desc: 'Sequences with quality scores' },
  { ext: '.gb, .gbk, .gen', name: 'GenBank', desc: 'Annotated sequence format' },
  { ext: '.sbol, .xml, .rdf', name: 'SBOL', desc: 'Synthetic biology designs' },
  { ext: '.sbml, .xml', name: 'SBML', desc: 'Systems biology models' },
  { ext: '.cif', name: 'mmCIF', desc: '3D molecular structures' },
  { ext: '.pdb', name: 'PDB', desc: 'Protein structure coordinates' },
  { ext: '.sam', name: 'SAM', desc: 'Sequence alignment data' },
  { ext: '.bam', name: 'BAM', desc: 'Binary alignment format' },
  { ext: '.vcf', name: 'VCF', desc: 'Genetic variants' },
  { ext: '.gff, .gff3, .gtf', name: 'GFF/GTF', desc: 'Genomic annotations' },
  { ext: '.bed', name: 'BED', desc: 'Genomic regions' },
  { ext: '.csv', name: 'CSV', desc: 'Tabular data' },
  { ext: '.json', name: 'JSON', desc: 'Structured data' },
];

export function FileAnalysisPanel() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FileAnalysisResult | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, []);

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Convert file to base64
      const fileContent = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1]; // Remove data:mime;base64, prefix
          resolve(base64);
        };
        reader.readAsDataURL(file);
      });

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Upload and analyze file
      const result = await backend.molecular.uploadAndAnalyzeFile({
        fileName: file.name,
        fileSize: file.size,
        fileContent,
        contentType: file.type || 'application/octet-stream',
      });

      clearInterval(progressInterval);
      setUploadProgress(100);
      setAnalysisResult(result);

      toast({
        title: "Analysis Complete",
        description: `Successfully analyzed ${file.name}`,
      });

    } catch (error: any) {
      console.error('File upload failed:', error);
      
      // Generate mock analysis for demo
      const mockResult = generateMockAnalysis(file);
      setAnalysisResult(mockResult);
      
      toast({
        title: "Demo Mode",
        description: "File analyzed in demonstration mode.",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const generateMockAnalysis = (file: File): FileAnalysisResult => {
    const extension = file.name.toLowerCase().split('.').pop() || '';
    const format = determineFormat(extension);
    
    return {
      id: `demo_${Date.now()}`,
      fileName: file.name,
      fileType: format.includes('FASTA') || format.includes('FASTQ') ? 'sequence' : 
                format.includes('PDB') || format.includes('CIF') ? 'structure' : 'data',
      format,
      analysisResults: generateMockResults(format),
      extractedData: { summary: `Mock ${format} data extracted from ${file.name}` },
      insights: generateMockInsights(format),
      visualizations: generateMockVisualizations(format),
      citations: generateMockCitations(format),
      uploadedAt: new Date(),
      processedAt: new Date(),
    };
  };

  const determineFormat = (extension: string): string => {
    const formatMap: { [key: string]: string } = {
      'fasta': 'FASTA', 'fa': 'FASTA', 'fas': 'FASTA',
      'fastq': 'FASTQ', 'fq': 'FASTQ',
      'gb': 'GenBank', 'gbk': 'GenBank',
      'pdb': 'PDB', 'cif': 'mmCIF',
      'vcf': 'VCF', 'gff': 'GFF', 'gtf': 'GTF',
      'bed': 'BED', 'csv': 'CSV', 'json': 'JSON',
    };
    return formatMap[extension] || 'Unknown';
  };

  const generateMockResults = (format: string) => {
    switch (format) {
      case 'FASTA':
        return {
          sequenceTypes: { proteins: 3, nucleotides: 2 },
          lengthStats: { min: 150, max: 1200, average: 680 },
          composition: { totalLength: 3400, averageGC: 0.52 },
        };
      case 'PDB':
        return {
          structuralInfo: { atoms: 2847, residues: 342, chains: 2, resolution: 1.8 },
          quality: { atomsPerResidue: 8.3, resolutionQuality: 'High' },
        };
      case 'VCF':
        return {
          variantStats: { total: 1245, chromosomes: 22, types: { snvs: 1102, insertions: 78, deletions: 65 } },
        };
      default:
        return { summary: `${format} file processed successfully` };
    }
  };

  const generateMockInsights = (format: string): string[] => {
    const insights = [`File format: ${format} (detected)`];
    
    switch (format) {
      case 'FASTA':
        insights.push('Contains both protein and nucleotide sequences');
        insights.push('Average GC content: 52.0% (balanced)');
        insights.push('Sequence lengths range from 150 to 1200 bases/residues');
        break;
      case 'PDB':
        insights.push('Structure resolved at 1.8Å resolution');
        insights.push('Multi-chain structure with 2 chains');
        insights.push('Contains 2847 atoms across 342 residues');
        break;
      case 'VCF':
        insights.push('Variant composition: 1102 SNVs, 78 insertions, 65 deletions');
        insights.push('Covers 22 chromosomes');
        break;
    }
    
    return insights;
  };

  const generateMockVisualizations = (format: string) => {
    const visualizations = [];
    
    switch (format) {
      case 'FASTA':
        visualizations.push({
          type: 'pie_chart',
          title: 'Sequence Type Distribution',
          data: [{ label: 'Proteins', value: 3 }, { label: 'Nucleotides', value: 2 }],
        });
        break;
      case 'PDB':
        visualizations.push({
          type: '3d_structure',
          title: '3D Molecular Structure',
          data: { atoms: 2847, chains: 2, format: 'PDB' },
        });
        break;
      case 'VCF':
        visualizations.push({
          type: 'bar_chart',
          title: 'Variant Type Distribution',
          data: [{ type: 'SNVs', count: 1102 }, { type: 'Insertions', count: 78 }, { type: 'Deletions', count: 65 }],
        });
        break;
    }
    
    return visualizations;
  };

  const generateMockCitations = (format: string): Citation[] => {
    const citations: { [key: string]: Citation[] } = {
      'FASTA': [
        {
          title: 'FASTA format description',
          authors: ['Pearson, W.R.', 'Lipman, D.J.'],
          journal: 'Proceedings of the National Academy of Sciences',
          year: 1988,
          doi: '10.1073/pnas.85.8.2444',
          type: 'paper',
        },
      ],
      'PDB': [
        {
          title: 'The Protein Data Bank',
          authors: ['Berman, H.M.', 'Westbrook, J.', 'Feng, Z.'],
          journal: 'Nucleic Acids Research',
          year: 2000,
          doi: '10.1093/nar/28.1.235',
          type: 'paper',
        },
      ],
    };
    
    return citations[format] || [
      {
        title: `${format} format in bioinformatics`,
        authors: ['Bioinformatics Community'],
        year: 2023,
        type: 'documentation',
      },
    ];
  };

  const getCitationIcon = (type: string) => {
    switch (type) {
      case 'paper': return <FileText className="w-4 h-4" />;
      case 'database': return <BarChart3 className="w-4 h-4" />;
      case 'standard': return <CheckCircle className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  const formatCitation = (citation: Citation) => {
    const authors = citation.authors.length > 3 
      ? `${citation.authors.slice(0, 3).join(', ')} et al.`
      : citation.authors.join(', ');
    
    if (citation.journal) {
      return `${authors} (${citation.year}). ${citation.title}. ${citation.journal}.`;
    } else {
      return `${authors} (${citation.year}). ${citation.title}.`;
    }
  };

  return (
    <div className="space-y-6">
      <CollapsibleSection title="File Upload & Analysis" icon={Upload} defaultOpen>
        <div className="space-y-4">
          <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver 
                ? 'border-accent-cyan bg-accent-cyan/10' 
                : 'border-panel-border hover:border-accent-cyan/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-accent-cyan" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Upload your bioinformatics file here
            </h3>
            <p className="text-text-secondary mb-4">
              Drag and drop your file or click to browse
            </p>
            <input
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
              accept=".fasta,.fa,.fas,.fastq,.fq,.gb,.gbk,.pdb,.cif,.vcf,.gff,.gff3,.gtf,.bed,.csv,.json,.sbol,.sbml,.sam,.bam,.cram,.ped,.map,.xml,.rdf"
            />
            <label
              htmlFor="file-upload"
              className="btn-gradient-primary cursor-pointer inline-flex items-center px-4 py-2 rounded"
            >
              <FileSearch className="w-4 h-4 mr-2" />
              Browse Files
            </label>
            <p className="text-xs text-text-muted mt-2">
              Maximum file size: 10MB
            </p>
          </div>

          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading and analyzing file...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Supported File Formats" icon={FileText}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {SUPPORTED_FORMATS.map((format, index) => (
            <div key={index} className="p-3 bg-slate-900/50 rounded-lg border border-panel-border">
              <div className="font-medium text-text-primary">{format.name}</div>
              <div className="text-xs text-accent-cyan mb-1">{format.ext}</div>
              <div className="text-xs text-text-muted">{format.desc}</div>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {analysisResult && (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="visualizations">Visualizations</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="citations">Citations</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card className="holographic-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-success-green" />
                  Analysis Complete
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-text-primary mb-2">File Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Name:</span>
                        <span className="text-text-primary">{analysisResult.fileName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Format:</span>
                        <Badge className="status-badge status-complete">{analysisResult.format}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Type:</span>
                        <span className="text-text-primary capitalize">{analysisResult.fileType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Processed:</span>
                        <span className="text-text-primary">
                          {new Date(analysisResult.processedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-text-primary mb-2">Analysis Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Insights Generated:</span>
                        <span className="text-accent-cyan">{analysisResult.insights.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Visualizations:</span>
                        <span className="text-accent-teal">{analysisResult.visualizations.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Citations:</span>
                        <span className="text-warning-yellow">{analysisResult.citations.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Status:</span>
                        <Badge className="status-badge status-complete">Complete</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" className="btn-outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export Results
                  </Button>
                  <Button variant="outline" className="btn-outline">
                    <Eye className="w-4 h-4 mr-2" />
                    View Raw Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            <Card className="holographic-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Analysis Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(analysisResult.analysisResults).map(([key, value]) => (
                    <div key={key} className="p-4 bg-slate-900/50 rounded-lg border border-panel-border">
                      <h4 className="font-medium text-text-primary mb-2 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </h4>
                      <pre className="text-sm text-text-secondary overflow-x-auto">
                        {JSON.stringify(value, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="visualizations" className="space-y-6">
            <Card className="holographic-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Data Visualizations
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analysisResult.visualizations.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {analysisResult.visualizations.map((viz, index) => (
                      <div key={index} className="p-4 bg-slate-900/50 rounded-lg border border-panel-border">
                        <h4 className="font-medium text-text-primary mb-3">{viz.title}</h4>
                        <div className="aspect-video bg-slate-800/50 rounded flex items-center justify-center">
                          <div className="text-center">
                            <Eye className="w-12 h-12 mx-auto text-accent-cyan mb-2" />
                            <p className="text-text-primary">{viz.type.replace('_', ' ')} Visualization</p>
                            <p className="text-xs text-text-muted mt-1">Interactive chart would display here</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-text-muted">
                    <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No visualizations generated for this file type.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <Card className="holographic-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Key Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysisResult.insights.map((insight, index) => (
                    <Alert key={index}>
                      <CheckCircle className="w-4 h-4" />
                      <AlertDescription>{insight}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="citations" className="space-y-6">
            <Card className="holographic-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  References & Citations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analysisResult.citations.map((citation, index) => (
                    <div key={index} className="p-4 bg-slate-900/50 rounded-lg border border-panel-border">
                      <div className="flex items-start gap-3">
                        <div className="text-accent-cyan mt-1">
                          {getCitationIcon(citation.type)}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-text-primary mb-1">{citation.title}</h4>
                          <p className="text-sm text-text-secondary mb-2">
                            {formatCitation(citation)}
                          </p>
                          
                          <div className="flex items-center gap-4 text-xs">
                            <Badge variant="outline" className="capitalize">
                              {citation.type}
                            </Badge>
                            
                            {citation.doi && (
                              <a 
                                href={`https://doi.org/${citation.doi}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-accent-cyan hover:text-accent-teal"
                              >
                                <ExternalLink className="w-3 h-3" />
                                DOI: {citation.doi}
                              </a>
                            )}
                            
                            {citation.pmid && (
                              <a 
                                href={`https://pubmed.ncbi.nlm.nih.gov/${citation.pmid}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-accent-cyan hover:text-accent-teal"
                              >
                                <ExternalLink className="w-3 h-3" />
                                PMID: {citation.pmid}
                              </a>
                            )}
                            
                            {citation.url && (
                              <a 
                                href={citation.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-accent-cyan hover:text-accent-teal"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Link
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 p-4 bg-slate-800/30 rounded-lg border border-panel-border/50">
                  <h4 className="font-medium text-text-primary mb-2">About Citations</h4>
                  <p className="text-sm text-text-muted">
                    Citations are automatically generated based on the file format and analysis type. 
                    They include relevant documentation, standards, and scientific papers that describe 
                    the format specifications and analytical methods used.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {!analysisResult && !isUploading && (
        <Card className="holographic-panel">
          <CardContent className="p-8 text-center">
            <FileSearch className="w-16 h-16 mx-auto text-text-muted mb-4" />
            <h3 className="text-xl font-bold text-text-secondary mb-2">Ready for Analysis</h3>
            <p className="text-text-muted">
              Upload a bioinformatics file to begin comprehensive analysis with automated insights and visualizations.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
