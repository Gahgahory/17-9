import { api, APIError } from "encore.dev/api";
import { Bucket } from "encore.dev/storage/objects";
import { molecularDB } from "./db";

export const uploadedFiles = new Bucket("uploaded-files", {
  public: false,
  versioned: true,
});

export interface FileUploadRequest {
  fileName: string;
  fileSize: number;
  fileContent: string; // base64 encoded
  contentType: string;
}

export interface FileAnalysisResult {
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

export interface Citation {
  title: string;
  authors: string[];
  journal?: string;
  year: number;
  doi?: string;
  pmid?: string;
  url?: string;
  type: 'documentation' | 'paper' | 'standard' | 'database';
}

export interface SequenceData {
  id: string;
  header: string;
  sequence: string;
  length: number;
  type: 'nucleotide' | 'protein';
  gcContent?: number;
  aminoAcidComposition?: { [key: string]: number };
  features?: any[];
}

export interface StructuralData {
  atoms: number;
  residues: number;
  chains: string[];
  resolution?: number;
  experimentType?: string;
  depositDate?: Date;
}

export interface VariantData {
  chromosome: string;
  position: number;
  reference: string;
  alternate: string;
  quality?: number;
  filter?: string;
  info?: any;
}

// Upload and analyze a bioinformatics file
export const uploadAndAnalyzeFile = api<FileUploadRequest, FileAnalysisResult>(
  { expose: true, method: "POST", path: "/file-analysis/upload" },
  async (req) => {
    const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Decode base64 content
      const fileBuffer = Buffer.from(req.fileContent, 'base64');
      
      // Upload to storage
      await uploadedFiles.upload(`${analysisId}/${req.fileName}`, fileBuffer, {
        contentType: req.contentType,
      });

      // Determine file format from extension
      const fileExtension = req.fileName.toLowerCase().split('.').pop() || '';
      const fileFormat = determineFileFormat(fileExtension, req.fileName);
      
      // Parse and analyze file based on format
      const parseResult = await parseFile(fileBuffer, fileFormat);
      const analysisResults = await performAnalysis(parseResult, fileFormat);
      const insights = generateInsights(parseResult, analysisResults, fileFormat);
      const visualizations = generateVisualizations(parseResult, analysisResults, fileFormat);
      const citations = getCitations(fileFormat);

      const result: FileAnalysisResult = {
        id: analysisId,
        fileName: req.fileName,
        fileType: parseResult.type,
        format: fileFormat,
        analysisResults,
        extractedData: parseResult,
        insights,
        visualizations,
        citations,
        uploadedAt: new Date(),
        processedAt: new Date(),
      };

      // Store analysis result in database
      await molecularDB.exec`
        INSERT INTO file_analyses (
          analysis_id, file_name, file_format, file_type, 
          analysis_results, extracted_data, insights, 
          visualizations, citations, uploaded_at, processed_at
        ) VALUES (
          ${analysisId}, ${req.fileName}, ${fileFormat}, ${parseResult.type},
          ${JSON.stringify(analysisResults)}, ${JSON.stringify(parseResult)},
          ${JSON.stringify(insights)}, ${JSON.stringify(visualizations)},
          ${JSON.stringify(citations)}, NOW(), NOW()
        )
      `;

      return result;
    } catch (error) {
      console.error("File analysis failed:", error);
      throw APIError.internal("Failed to analyze file");
    }
  }
);

// Get analysis result by ID
export const getFileAnalysis = api<{ analysisId: string }, FileAnalysisResult>(
  { expose: true, method: "GET", path: "/file-analysis/:analysisId" },
  async ({ analysisId }) => {
    const result = await molecularDB.queryRow`
      SELECT * FROM file_analyses WHERE analysis_id = ${analysisId}
    `;

    if (!result) {
      throw APIError.notFound("Analysis not found");
    }

    return {
      id: result.analysis_id,
      fileName: result.file_name,
      fileType: result.file_type,
      format: result.file_format,
      analysisResults: result.analysis_results,
      extractedData: result.extracted_data,
      insights: result.insights,
      visualizations: result.visualizations,
      citations: result.citations,
      uploadedAt: result.uploaded_at,
      processedAt: result.processed_at,
    };
  }
);

// List recent file analyses
export const listFileAnalyses = api<{ limit?: number }, { analyses: FileAnalysisResult[] }>(
  { expose: true, method: "GET", path: "/file-analysis" },
  async ({ limit = 10 }) => {
    const results = await molecularDB.queryAll`
      SELECT * FROM file_analyses 
      ORDER BY uploaded_at DESC 
      LIMIT ${limit}
    `;

    const analyses = results.map(result => ({
      id: result.analysis_id,
      fileName: result.file_name,
      fileType: result.file_type,
      format: result.file_format,
      analysisResults: result.analysis_results,
      extractedData: result.extracted_data,
      insights: result.insights,
      visualizations: result.visualizations,
      citations: result.citations,
      uploadedAt: result.uploaded_at,
      processedAt: result.processed_at,
    }));

    return { analyses };
  }
);

function determineFileFormat(extension: string, fileName: string): string {
  const formatMap: { [key: string]: string } = {
    'fasta': 'FASTA',
    'fa': 'FASTA',
    'fas': 'FASTA',
    'fna': 'FASTA',
    'ffn': 'FASTA',
    'faa': 'FASTA',
    'frn': 'FASTA',
    'fastq': 'FASTQ',
    'fq': 'FASTQ',
    'gb': 'GenBank',
    'gbk': 'GenBank',
    'gen': 'GenBank',
    'sbol': 'SBOL',
    'sbml': 'SBML',
    'cif': 'mmCIF',
    'pdb': 'PDB',
    'sam': 'SAM',
    'bam': 'BAM',
    'cram': 'CRAM',
    'vcf': 'VCF',
    'gff': 'GFF',
    'gff2': 'GFF',
    'gff3': 'GFF',
    'gtf': 'GTF',
    'bed': 'BED',
    'ped': 'PED',
    'map': 'MAP',
    'csv': 'CSV',
    'json': 'JSON',
    'gz': fileName.includes('.tar') ? 'TAR.GZ' : 'GZIP',
    'tgz': 'TAR.GZ',
  };

  return formatMap[extension] || 'Unknown';
}

async function parseFile(fileBuffer: Buffer, format: string): Promise<any> {
  const content = fileBuffer.toString('utf8');
  
  switch (format) {
    case 'FASTA':
      return parseFASTA(content);
    case 'FASTQ':
      return parseFASTQ(content);
    case 'GenBank':
      return parseGenBank(content);
    case 'PDB':
      return parsePDB(content);
    case 'mmCIF':
      return parseMMCIF(content);
    case 'VCF':
      return parseVCF(content);
    case 'GFF':
    case 'GTF':
      return parseGFF(content);
    case 'BED':
      return parseBED(content);
    case 'CSV':
      return parseCSV(content);
    case 'JSON':
      return parseJSON(content);
    default:
      return { type: 'unknown', content: content.substring(0, 1000) };
  }
}

function parseFASTA(content: string): any {
  const sequences: SequenceData[] = [];
  const lines = content.split('\n');
  let currentSequence: Partial<SequenceData> = {};
  
  for (const line of lines) {
    if (line.startsWith('>')) {
      if (currentSequence.sequence) {
        sequences.push(finalizeFASTASequence(currentSequence));
      }
      currentSequence = {
        id: Math.random().toString(36).substr(2, 9),
        header: line.substring(1),
        sequence: '',
      };
    } else if (line.trim()) {
      currentSequence.sequence = (currentSequence.sequence || '') + line.trim();
    }
  }
  
  if (currentSequence.sequence) {
    sequences.push(finalizeFASTASequence(currentSequence));
  }
  
  return {
    type: 'sequence',
    format: 'FASTA',
    sequences,
    totalSequences: sequences.length,
    totalLength: sequences.reduce((sum, seq) => sum + seq.length, 0),
  };
}

function finalizeFASTASequence(seq: Partial<SequenceData>): SequenceData {
  const sequence = seq.sequence || '';
  const isProtein = /[EQFILPYWH]/.test(sequence.toUpperCase());
  
  return {
    id: seq.id || '',
    header: seq.header || '',
    sequence,
    length: sequence.length,
    type: isProtein ? 'protein' : 'nucleotide',
    gcContent: isProtein ? undefined : calculateGCContent(sequence),
    aminoAcidComposition: isProtein ? calculateAAComposition(sequence) : undefined,
  };
}

function parseFASTQ(content: string): any {
  const sequences: any[] = [];
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i += 4) {
    if (i + 3 < lines.length && lines[i].startsWith('@')) {
      const header = lines[i].substring(1);
      const sequence = lines[i + 1];
      const quality = lines[i + 3];
      
      sequences.push({
        id: Math.random().toString(36).substr(2, 9),
        header,
        sequence,
        quality,
        length: sequence.length,
        avgQuality: calculateAvgQuality(quality),
        type: 'nucleotide',
        gcContent: calculateGCContent(sequence),
      });
    }
  }
  
  return {
    type: 'sequence',
    format: 'FASTQ',
    sequences,
    totalSequences: sequences.length,
    totalLength: sequences.reduce((sum: number, seq: any) => sum + seq.length, 0),
  };
}

function parseGenBank(content: string): any {
  const features: any[] = [];
  const annotations: any = {};
  let sequence = '';
  
  const lines = content.split('\n');
  let inFeatures = false;
  let inOrigin = false;
  
  for (const line of lines) {
    if (line.startsWith('LOCUS')) {
      const parts = line.split(/\s+/);
      annotations.locus = parts[1];
      annotations.length = parseInt(parts[2]);
      annotations.type = parts[4];
    } else if (line.startsWith('DEFINITION')) {
      annotations.definition = line.substring(12).trim();
    } else if (line.startsWith('ORGANISM')) {
      annotations.organism = line.substring(12).trim();
    } else if (line.startsWith('FEATURES')) {
      inFeatures = true;
    } else if (line.startsWith('ORIGIN')) {
      inFeatures = false;
      inOrigin = true;
    } else if (inFeatures && line.match(/^\s{5}\S/)) {
      const match = line.match(/^\s{5}(\S+)\s+(.+)/);
      if (match) {
        features.push({
          type: match[1],
          location: match[2],
          qualifiers: {},
        });
      }
    } else if (inOrigin && line.match(/^\s*\d/)) {
      sequence += line.replace(/[\d\s]/g, '');
    }
  }
  
  return {
    type: 'annotated_sequence',
    format: 'GenBank',
    annotations,
    features,
    sequence,
    length: sequence.length,
    gcContent: calculateGCContent(sequence),
  };
}

function parsePDB(content: string): any {
  const atoms: any[] = [];
  const chains = new Set<string>();
  let resolution: number | undefined;
  let experimentType: string | undefined;
  
  const lines = content.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('ATOM') || line.startsWith('HETATM')) {
      const atom = {
        type: line.substring(0, 6).trim(),
        serial: parseInt(line.substring(6, 11)),
        name: line.substring(12, 16).trim(),
        residue: line.substring(17, 20).trim(),
        chain: line.substring(21, 22),
        resSeq: parseInt(line.substring(22, 26)),
        x: parseFloat(line.substring(30, 38)),
        y: parseFloat(line.substring(38, 46)),
        z: parseFloat(line.substring(46, 54)),
        element: line.substring(76, 78).trim(),
      };
      atoms.push(atom);
      chains.add(atom.chain);
    } else if (line.startsWith('REMARK   2 RESOLUTION.')) {
      const match = line.match(/(\d+\.\d+)/);
      if (match) {
        resolution = parseFloat(match[1]);
      }
    } else if (line.startsWith('EXPDTA')) {
      experimentType = line.substring(10).trim();
    }
  }
  
  const residues = new Set(atoms.map(atom => `${atom.chain}:${atom.resSeq}:${atom.residue}`)).size;
  
  return {
    type: 'structure',
    format: 'PDB',
    atoms: atoms.length,
    residues,
    chains: Array.from(chains),
    resolution,
    experimentType,
    atomData: atoms.slice(0, 100), // Sample for analysis
  };
}

function parseMMCIF(content: string): any {
  // Simplified mmCIF parsing
  const lines = content.split('\n');
  let atoms = 0;
  const chains = new Set<string>();
  
  for (const line of lines) {
    if (line.startsWith('ATOM') || line.startsWith('HETATM')) {
      atoms++;
      const parts = line.split(/\s+/);
      if (parts.length > 18) {
        chains.add(parts[18]);
      }
    }
  }
  
  return {
    type: 'structure',
    format: 'mmCIF',
    atoms,
    chains: Array.from(chains),
    residues: Math.floor(atoms / 8), // Estimate
  };
}

function parseVCF(content: string): any {
  const variants: VariantData[] = [];
  const lines = content.split('\n');
  
  for (const line of lines) {
    if (!line.startsWith('#') && line.trim()) {
      const parts = line.split('\t');
      if (parts.length >= 5) {
        variants.push({
          chromosome: parts[0],
          position: parseInt(parts[1]),
          reference: parts[3],
          alternate: parts[4],
          quality: parts[5] !== '.' ? parseFloat(parts[5]) : undefined,
          filter: parts[6] !== '.' ? parts[6] : undefined,
          info: parts[7] !== '.' ? parseVCFInfo(parts[7]) : undefined,
        });
      }
    }
  }
  
  return {
    type: 'variants',
    format: 'VCF',
    variants,
    totalVariants: variants.length,
    chromosomes: [...new Set(variants.map(v => v.chromosome))],
  };
}

function parseGFF(content: string): any {
  const features: any[] = [];
  const lines = content.split('\n');
  
  for (const line of lines) {
    if (!line.startsWith('#') && line.trim()) {
      const parts = line.split('\t');
      if (parts.length >= 9) {
        features.push({
          seqId: parts[0],
          source: parts[1],
          type: parts[2],
          start: parseInt(parts[3]),
          end: parseInt(parts[4]),
          score: parts[5] !== '.' ? parseFloat(parts[5]) : undefined,
          strand: parts[6],
          phase: parts[7] !== '.' ? parseInt(parts[7]) : undefined,
          attributes: parseGFFAttributes(parts[8]),
        });
      }
    }
  }
  
  return {
    type: 'annotations',
    format: 'GFF',
    features,
    totalFeatures: features.length,
    featureTypes: [...new Set(features.map(f => f.type))],
    sequences: [...new Set(features.map(f => f.seqId))],
  };
}

function parseBED(content: string): any {
  const regions: any[] = [];
  const lines = content.split('\n');
  
  for (const line of lines) {
    if (!line.startsWith('#') && line.trim()) {
      const parts = line.split('\t');
      if (parts.length >= 3) {
        regions.push({
          chromosome: parts[0],
          start: parseInt(parts[1]),
          end: parseInt(parts[2]),
          name: parts[3] || undefined,
          score: parts[4] ? parseInt(parts[4]) : undefined,
          strand: parts[5] || undefined,
        });
      }
    }
  }
  
  return {
    type: 'regions',
    format: 'BED',
    regions,
    totalRegions: regions.length,
    chromosomes: [...new Set(regions.map(r => r.chromosome))],
  };
}

function parseCSV(content: string): any {
  const lines = content.split('\n');
  const headers = lines[0] ? lines[0].split(',').map(h => h.trim()) : [];
  const rows: any[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }
  }
  
  return {
    type: 'tabular',
    format: 'CSV',
    headers,
    rows,
    totalRows: rows.length,
    columns: headers.length,
  };
}

function parseJSON(content: string): any {
  try {
    const data = JSON.parse(content);
    return {
      type: 'structured',
      format: 'JSON',
      data,
      keys: Object.keys(data),
      size: JSON.stringify(data).length,
    };
  } catch (error) {
    return {
      type: 'invalid',
      format: 'JSON',
      error: 'Invalid JSON format',
    };
  }
}

async function performAnalysis(parseResult: any, format: string): Promise<any> {
  switch (parseResult.type) {
    case 'sequence':
      return analyzeSequences(parseResult);
    case 'annotated_sequence':
      return analyzeAnnotatedSequence(parseResult);
    case 'structure':
      return analyzeStructure(parseResult);
    case 'variants':
      return analyzeVariants(parseResult);
    case 'annotations':
      return analyzeAnnotations(parseResult);
    case 'regions':
      return analyzeRegions(parseResult);
    case 'tabular':
      return analyzeTabular(parseResult);
    default:
      return { summary: 'Basic file information extracted' };
  }
}

function analyzeSequences(data: any): any {
  const sequences = data.sequences || [];
  const proteins = sequences.filter((s: any) => s.type === 'protein');
  const nucleotides = sequences.filter((s: any) => s.type === 'nucleotide');
  
  return {
    sequenceTypes: {
      proteins: proteins.length,
      nucleotides: nucleotides.length,
    },
    lengthStats: {
      min: Math.min(...sequences.map((s: any) => s.length)),
      max: Math.max(...sequences.map((s: any) => s.length)),
      average: sequences.reduce((sum: number, s: any) => sum + s.length, 0) / sequences.length,
    },
    composition: {
      totalLength: data.totalLength,
      averageGC: nucleotides.length > 0 
        ? nucleotides.reduce((sum: number, s: any) => sum + (s.gcContent || 0), 0) / nucleotides.length 
        : undefined,
    },
    quality: data.format === 'FASTQ' ? {
      averageQuality: sequences.reduce((sum: number, s: any) => sum + (s.avgQuality || 0), 0) / sequences.length,
    } : undefined,
  };
}

function analyzeAnnotatedSequence(data: any): any {
  return {
    sequenceInfo: {
      length: data.length,
      gcContent: data.gcContent,
      organism: data.annotations?.organism,
    },
    features: {
      total: data.features?.length || 0,
      types: [...new Set(data.features?.map((f: any) => f.type) || [])],
    },
    annotations: data.annotations,
  };
}

function analyzeStructure(data: any): any {
  return {
    structuralInfo: {
      atoms: data.atoms,
      residues: data.residues,
      chains: data.chains?.length || 0,
      resolution: data.resolution,
      experimentType: data.experimentType,
    },
    quality: {
      atomsPerResidue: data.residues ? data.atoms / data.residues : undefined,
      resolutionQuality: data.resolution ? 
        (data.resolution < 2.0 ? 'High' : data.resolution < 3.0 ? 'Medium' : 'Low') : undefined,
    },
  };
}

function analyzeVariants(data: any): any {
  const variants = data.variants || [];
  
  return {
    variantStats: {
      total: variants.length,
      chromosomes: data.chromosomes?.length || 0,
      types: {
        snvs: variants.filter((v: any) => v.reference?.length === 1 && v.alternate?.length === 1).length,
        insertions: variants.filter((v: any) => v.reference?.length < v.alternate?.length).length,
        deletions: variants.filter((v: any) => v.reference?.length > v.alternate?.length).length,
      },
    },
    qualityStats: {
      withQuality: variants.filter((v: any) => v.quality !== undefined).length,
      averageQuality: variants
        .filter((v: any) => v.quality !== undefined)
        .reduce((sum: number, v: any) => sum + v.quality!, 0) / 
        variants.filter((v: any) => v.quality !== undefined).length || 0,
    },
  };
}

function analyzeAnnotations(data: any): any {
  const features = data.features || [];
  
  return {
    annotationStats: {
      totalFeatures: features.length,
      sequences: data.sequences?.length || 0,
      featureTypes: data.featureTypes || [],
      typeDistribution: data.featureTypes?.map((type: string) => ({
        type,
        count: features.filter((f: any) => f.type === type).length,
      })) || [],
    },
    coverage: {
      totalBases: features.reduce((sum: number, f: any) => sum + (f.end - f.start + 1), 0),
    },
  };
}

function analyzeRegions(data: any): any {
  const regions = data.regions || [];
  
  return {
    regionStats: {
      totalRegions: regions.length,
      chromosomes: data.chromosomes?.length || 0,
      totalBases: regions.reduce((sum: number, r: any) => sum + (r.end - r.start), 0),
      averageLength: regions.length > 0 
        ? regions.reduce((sum: number, r: any) => sum + (r.end - r.start), 0) / regions.length 
        : 0,
    },
  };
}

function analyzeTabular(data: any): any {
  return {
    tableStats: {
      rows: data.totalRows,
      columns: data.columns,
      headers: data.headers,
    },
    dataTypes: data.headers?.map((header: string) => {
      const column = data.rows?.map((row: any) => row[header]) || [];
      const numeric = column.filter((val: any) => !isNaN(parseFloat(val))).length;
      return {
        column: header,
        type: numeric > column.length * 0.8 ? 'numeric' : 'text',
        coverage: column.filter((val: any) => val && val.trim()).length / column.length,
      };
    }) || [],
  };
}

function generateInsights(parseResult: any, analysisResults: any, format: string): string[] {
  const insights: string[] = [];
  
  switch (parseResult.type) {
    case 'sequence':
      if (analysisResults.sequenceTypes?.proteins > 0) {
        insights.push(`Contains ${analysisResults.sequenceTypes.proteins} protein sequences`);
      }
      if (analysisResults.sequenceTypes?.nucleotides > 0) {
        insights.push(`Contains ${analysisResults.sequenceTypes.nucleotides} nucleotide sequences`);
        if (analysisResults.composition?.averageGC) {
          const gc = analysisResults.composition.averageGC * 100;
          insights.push(`Average GC content: ${gc.toFixed(1)}% ${gc > 60 ? '(GC-rich)' : gc < 40 ? '(AT-rich)' : '(balanced)'}`);
        }
      }
      if (analysisResults.lengthStats) {
        insights.push(`Sequence lengths range from ${analysisResults.lengthStats.min} to ${analysisResults.lengthStats.max} bases/residues`);
      }
      break;
      
    case 'structure':
      if (analysisResults.structuralInfo?.resolution) {
        insights.push(`Structure resolved at ${analysisResults.structuralInfo.resolution}Å resolution`);
      }
      if (analysisResults.structuralInfo?.chains > 1) {
        insights.push(`Multi-chain structure with ${analysisResults.structuralInfo.chains} chains`);
      }
      insights.push(`Contains ${analysisResults.structuralInfo?.atoms} atoms across ${analysisResults.structuralInfo?.residues} residues`);
      break;
      
    case 'variants':
      if (analysisResults.variantStats?.types) {
        const types = analysisResults.variantStats.types;
        insights.push(`Variant composition: ${types.snvs} SNVs, ${types.insertions} insertions, ${types.deletions} deletions`);
      }
      break;
      
    case 'annotations':
      insights.push(`Annotated ${analysisResults.annotationStats?.totalFeatures} genomic features`);
      if (analysisResults.annotationStats?.featureTypes?.length > 0) {
        insights.push(`Feature types include: ${analysisResults.annotationStats.featureTypes.slice(0, 5).join(', ')}`);
      }
      break;
  }
  
  insights.push(`File format: ${format} (${parseResult.format || 'detected'})`);
  
  return insights;
}

function generateVisualizations(parseResult: any, analysisResults: any, format: string): any[] {
  const visualizations: any[] = [];
  
  switch (parseResult.type) {
    case 'sequence':
      if (analysisResults.sequenceTypes) {
        visualizations.push({
          type: 'pie_chart',
          title: 'Sequence Type Distribution',
          data: [
            { label: 'Proteins', value: analysisResults.sequenceTypes.proteins },
            { label: 'Nucleotides', value: analysisResults.sequenceTypes.nucleotides },
          ],
        });
      }
      
      if (analysisResults.lengthStats) {
        visualizations.push({
          type: 'histogram',
          title: 'Sequence Length Distribution',
          data: parseResult.sequences?.map((s: any) => ({ length: s.length, count: 1 })) || [],
        });
      }
      break;
      
    case 'structure':
      visualizations.push({
        type: '3d_structure',
        title: '3D Molecular Structure',
        data: {
          atoms: analysisResults.structuralInfo?.atoms,
          chains: analysisResults.structuralInfo?.chains,
          format: format,
        },
      });
      break;
      
    case 'variants':
      if (analysisResults.variantStats?.types) {
        visualizations.push({
          type: 'bar_chart',
          title: 'Variant Type Distribution',
          data: Object.entries(analysisResults.variantStats.types).map(([type, count]) => ({
            type: type.toUpperCase(),
            count,
          })),
        });
      }
      break;
      
    case 'annotations':
      if (analysisResults.annotationStats?.typeDistribution) {
        visualizations.push({
          type: 'bar_chart',
          title: 'Feature Type Distribution',
          data: analysisResults.annotationStats.typeDistribution,
        });
      }
      break;
  }
  
  return visualizations;
}

function getCitations(format: string): Citation[] {
  const citationMap: { [key: string]: Citation[] } = {
    'FASTA': [
      {
        title: 'FASTA format description',
        authors: ['Pearson, W.R.', 'Lipman, D.J.'],
        journal: 'Proceedings of the National Academy of Sciences',
        year: 1988,
        doi: '10.1073/pnas.85.8.2444',
        pmid: '3162770',
        type: 'paper',
      },
      {
        title: 'NCBI FASTA Format Specification',
        authors: ['NCBI'],
        year: 2023,
        url: 'https://www.ncbi.nlm.nih.gov/blast/fasta.shtml',
        type: 'documentation',
      },
    ],
    'FASTQ': [
      {
        title: 'The FASTQ file format for sequences with quality scores',
        authors: ['Cock, P.J.A.', 'Fields, C.J.', 'Goto, N.', 'Heuer, M.L.', 'Rice, P.M.'],
        journal: 'Nucleic Acids Research',
        year: 2010,
        doi: '10.1093/nar/gkp1137',
        type: 'paper',
      },
    ],
    'GenBank': [
      {
        title: 'GenBank: NIH genetic sequence database',
        authors: ['Benson, D.A.', 'Karsch-Mizrachi, I.', 'Lipman, D.J.', 'Ostell, J.', 'Wheeler, D.L.'],
        journal: 'Nucleic Acids Research',
        year: 2008,
        doi: '10.1093/nar/gkm929',
        type: 'paper',
      },
      {
        title: 'GenBank Format Documentation',
        authors: ['NCBI'],
        year: 2023,
        url: 'https://www.ncbi.nlm.nih.gov/genbank/samplerecord/',
        type: 'documentation',
      },
    ],
    'PDB': [
      {
        title: 'The Protein Data Bank',
        authors: ['Berman, H.M.', 'Westbrook, J.', 'Feng, Z.', 'Gilliland, G.', 'Bhat, T.N.'],
        journal: 'Nucleic Acids Research',
        year: 2000,
        doi: '10.1093/nar/28.1.235',
        type: 'paper',
      },
      {
        title: 'PDB Format Documentation',
        authors: ['wwPDB'],
        year: 2023,
        url: 'https://www.wwpdb.org/documentation/file-format',
        type: 'documentation',
      },
    ],
    'VCF': [
      {
        title: 'The variant call format and VCFtools',
        authors: ['Danecek, P.', 'Auton, A.', 'Abecasis, G.', 'Albers, C.A.', 'Banks, E.'],
        journal: 'Bioinformatics',
        year: 2011,
        doi: '10.1093/bioinformatics/btr330',
        type: 'paper',
      },
    ],
    'GFF': [
      {
        title: 'The Generic Feature Format Version 3 (GFF3)',
        authors: ['The Sequence Ontology Consortium'],
        year: 2013,
        url: 'https://github.com/The-Sequence-Ontology/Specifications/blob/master/gff3.md',
        type: 'standard',
      },
    ],
    'SBOL': [
      {
        title: 'Synthetic Biology Open Language (SBOL) Version 3.0.0',
        authors: ['SBOL Community'],
        year: 2020,
        url: 'https://sbolstandard.org/dataexchange-spec/',
        type: 'standard',
      },
    ],
  };
  
  return citationMap[format] || [
    {
      title: `${format} format in bioinformatics`,
      authors: ['Bioinformatics Community'],
      year: 2023,
      type: 'documentation',
    },
  ];
}

// Helper functions
function calculateGCContent(sequence: string): number {
  const gc = (sequence.match(/[GC]/gi) || []).length;
  return sequence.length > 0 ? gc / sequence.length : 0;
}

function calculateAAComposition(sequence: string): { [key: string]: number } {
  const composition: { [key: string]: number } = {};
  const aminoAcids = 'ACDEFGHIKLMNPQRSTVWY';
  
  for (const aa of aminoAcids) {
    const count = (sequence.match(new RegExp(aa, 'gi')) || []).length;
    composition[aa] = sequence.length > 0 ? count / sequence.length : 0;
  }
  
  return composition;
}

function calculateAvgQuality(qualityString: string): number {
  let sum = 0;
  for (const char of qualityString) {
    sum += char.charCodeAt(0) - 33; // Phred+33 encoding
  }
  return qualityString.length > 0 ? sum / qualityString.length : 0;
}

function parseVCFInfo(infoString: string): any {
  const info: any = {};
  const pairs = infoString.split(';');
  for (const pair of pairs) {
    const [key, value] = pair.split('=');
    info[key] = value || true;
  }
  return info;
}

function parseGFFAttributes(attributeString: string): any {
  const attributes: any = {};
  const pairs = attributeString.split(';');
  for (const pair of pairs) {
    const [key, value] = pair.split('=');
    if (key && value) {
      attributes[key] = decodeURIComponent(value);
    }
  }
  return attributes;
}
