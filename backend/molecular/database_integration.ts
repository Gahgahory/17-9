import { api } from "encore.dev/api";

export interface DatabaseSource {
  id: string;
  name: string;
  tier: 1 | 2 | 3 | 4 | 5 | 6;
  category: string;
  url: string;
  status: 'online' | 'offline' | 'maintenance' | 'rate_limited';
  lastChecked: Date;
  responseTime: number;
}

export interface DatabaseQuery {
  sequence: string;
  databases: string[];
  queryType: 'blast' | 'exact' | 'similarity' | 'annotation';
  eValue?: number;
  identityThreshold?: number;
}

export interface DatabaseResult {
  databaseId: string;
  matches: DatabaseMatch[];
  metadata: {
    queryTime: number;
    totalHits: number;
    parameters: any;
  };
}

export interface DatabaseMatch {
  id: string;
  accession: string;
  description: string;
  organism?: string;
  score: number;
  eValue?: number;
  identity?: number;
  coverage?: number;
  alignmentLength?: number;
  annotations: DatabaseAnnotation[];
}

export interface DatabaseAnnotation {
  type: 'function' | 'structure' | 'pathway' | 'regulation' | 'expression' | 'interaction';
  source: string;
  value: string;
  confidence: number;
  evidence: string[];
}

export interface SupportedDatabase {
  key: string;
  name: string;
  category: string;
}

export interface SearchMultipleDatabasesRequest {
  query: string;
  categories: string; // comma-separated
  limit: number;
}

export interface SearchResultEntry {
  id: string;
  name: string;
  description: string;
  url: string;
  data: any;
  relevance_score: number;
}

export interface DatabaseSearchResult {
  database_name: string;
  entries: SearchResultEntry[];
}

export interface CategorySearchResult {
  category: string;
  databases: DatabaseSearchResult[];
}

export interface SearchMultipleDatabasesResponse {
  query: string;
  total_results: number;
  results_by_category: CategorySearchResult[];
}

const TIER_1_DATABASES: DatabaseSource[] = [
  { id: 'ncbi_genbank', name: 'NCBI GenBank', tier: 1, category: 'Genomic & Sequence', url: 'https://www.ncbi.nlm.nih.gov/genbank/', status: 'online', lastChecked: new Date(), responseTime: 150 },
  { id: 'embl_ena', name: 'EMBL-EBI ENA', tier: 1, category: 'Genomic & Sequence', url: 'https://www.ebi.ac.uk/ena/', status: 'online', lastChecked: new Date(), responseTime: 200 },
  { id: 'refseq', name: 'RefSeq', tier: 1, category: 'Genomic & Sequence', url: 'https://www.ncbi.nlm.nih.gov/refseq/', status: 'online', lastChecked: new Date(), responseTime: 120 },
  { id: 'uniparc', name: 'UniParc', tier: 1, category: 'Genomic & Sequence', url: 'https://www.uniprot.org/uniparc/', status: 'online', lastChecked: new Date(), responseTime: 180 },
  { id: 'insdc', name: 'INSDC', tier: 1, category: 'Genomic & Sequence', url: 'https://www.insdc.org/', status: 'online', lastChecked: new Date(), responseTime: 250 },
  { id: 'silva', name: 'SILVA', tier: 1, category: 'Genomic & Sequence', url: 'https://www.arb-silva.de/', status: 'online', lastChecked: new Date(), responseTime: 300 },
  { id: 'rdp', name: 'RDP', tier: 1, category: 'Genomic & Sequence', url: 'https://rdp.cme.msu.edu/', status: 'online', lastChecked: new Date(), responseTime: 280 },
  { id: 'greengenes', name: 'Greengenes', tier: 1, category: 'Genomic & Sequence', url: 'https://greengenes.secondgenome.com/', status: 'online', lastChecked: new Date(), responseTime: 320 },
  { id: 'gtdb', name: 'GTDB', tier: 1, category: 'Genomic & Sequence', url: 'https://gtdb.ecogenomic.org/', status: 'online', lastChecked: new Date(), responseTime: 220 },
  { id: 'img_m', name: 'IMG/M', tier: 1, category: 'Genomic & Sequence', url: 'https://img.jgi.doe.gov/', status: 'online', lastChecked: new Date(), responseTime: 400 },
  // Additional databases...
];

const TIER_2_DATABASES: DatabaseSource[] = [
  { id: 'pdb', name: 'PDB', tier: 2, category: 'Protein Structure & Function', url: 'https://www.rcsb.org/', status: 'online', lastChecked: new Date(), responseTime: 100 },
  { id: 'wwpdb', name: 'wwPDB', tier: 2, category: 'Protein Structure & Function', url: 'https://www.wwpdb.org/', status: 'online', lastChecked: new Date(), responseTime: 150 },
  { id: 'pdbe', name: 'PDBe', tier: 2, category: 'Protein Structure & Function', url: 'https://www.ebi.ac.uk/pdbe/', status: 'online', lastChecked: new Date(), responseTime: 130 },
  { id: 'rcsb_pdb', name: 'RCSB PDB', tier: 2, category: 'Protein Structure & Function', url: 'https://www.rcsb.org/', status: 'online', lastChecked: new Date(), responseTime: 120 },
  { id: 'pdbj', name: 'PDBj', tier: 2, category: 'Protein Structure & Function', url: 'https://pdbj.org/', status: 'online', lastChecked: new Date(), responseTime: 200 },
  { id: 'scop', name: 'SCOP', tier: 2, category: 'Protein Structure & Function', url: 'https://scop.mrc-lmb.cam.ac.uk/', status: 'online', lastChecked: new Date(), responseTime: 250 },
  { id: 'cath', name: 'CATH', tier: 2, category: 'Protein Structure & Function', url: 'https://www.cathdb.info/', status: 'online', lastChecked: new Date(), responseTime: 180 },
  { id: 'pfam', name: 'Pfam', tier: 2, category: 'Protein Structure & Function', url: 'https://pfam.xfam.org/', status: 'online', lastChecked: new Date(), responseTime: 160 },
  { id: 'interpro', name: 'InterPro', tier: 2, category: 'Protein Structure & Function', url: 'https://www.ebi.ac.uk/interpro/', status: 'online', lastChecked: new Date(), responseTime: 140 },
  { id: 'prosite', name: 'PROSITE', tier: 2, category: 'Protein Structure & Function', url: 'https://prosite.expasy.org/', status: 'online', lastChecked: new Date(), responseTime: 190 },
  // Additional databases...
];

const TIER_3_DATABASES: DatabaseSource[] = [
  { id: 'vfdb', name: 'VFDB', tier: 3, category: 'Pathogenicity & Virulence', url: 'http://www.mgc.ac.cn/VFs/', status: 'online', lastChecked: new Date(), responseTime: 300 },
  { id: 'mvirdb', name: 'MvirDB', tier: 3, category: 'Pathogenicity & Virulence', url: 'http://mvirdb.llnl.gov/', status: 'online', lastChecked: new Date(), responseTime: 350 },
  { id: 'patric_vf', name: 'PATRIC VF', tier: 3, category: 'Pathogenicity & Virulence', url: 'https://www.patricbrc.org/', status: 'online', lastChecked: new Date(), responseTime: 280 },
  { id: 'phi_base', name: 'PHI-base', tier: 3, category: 'Pathogenicity & Virulence', url: 'http://www.phi-base.org/', status: 'online', lastChecked: new Date(), responseTime: 320 },
  { id: 'phidias', name: 'PHIDIAS', tier: 3, category: 'Pathogenicity & Virulence', url: 'https://www.phidias.us/', status: 'online', lastChecked: new Date(), responseTime: 400 },
  // Additional databases...
];

const ALL_DATABASES = [...TIER_1_DATABASES, ...TIER_2_DATABASES, ...TIER_3_DATABASES];

function simplifyCategory(category: string): string {
  const lower = category.toLowerCase();
  if (lower.includes('genomic')) return 'genomic';
  if (lower.includes('protein')) return 'protein';
  if (lower.includes('pathogenicity')) return 'pathogenicity';
  if (lower.includes('resistance')) return 'resistance';
  if (lower.includes('immunology')) return 'immunology';
  if (lower.includes('regulatory')) return 'regulatory';
  return 'other';
}

export const getSupportedDatabases = api(
  { method: "GET", path: "/databases/supported", expose: true },
  async (): Promise<{ databases: SupportedDatabase[] }> => {
    const databases = ALL_DATABASES.map(db => ({
      key: db.id,
      name: db.name,
      category: simplifyCategory(db.category),
    }));
    return { databases };
  }
);

export const searchMultipleDatabases = api<SearchMultipleDatabasesRequest, SearchMultipleDatabasesResponse>(
  { method: "POST", path: "/databases/search", expose: true },
  async (req) => {
    const categories = req.categories.split(',');
    const results_by_category: CategorySearchResult[] = [];
    let total_results = 0;

    for (const categoryKey of categories) {
      const categoryDatabases = ALL_DATABASES.filter(db => simplifyCategory(db.category) === categoryKey && db.status === 'online');
      
      if (categoryDatabases.length === 0) continue;

      const categoryResult: CategorySearchResult = {
        category: categoryKey,
        databases: [],
      };

      for (const db of categoryDatabases) {
        const mockMatches = generateMockMatches(db, {
          sequence: req.query,
          databases: [db.id],
          queryType: 'blast',
        }).slice(0, req.limit);

        const entries: SearchResultEntry[] = mockMatches.map(match => ({
          id: match.accession,
          name: `${req.query} match in ${db.name}`,
          description: match.description,
          url: `https://example.com/search?db=${db.id}&id=${match.accession}`,
          data: {
            formula: 'C9H8O4',
            molecular_weight: 180.16,
            smiles: 'CC(=O)OC1=CC=CC=C1C(=O)O'
          },
          relevance_score: match.score / 1000,
        }));

        if (entries.length > 0) {
          categoryResult.databases.push({
            database_name: db.name,
            entries: entries,
          });
          total_results += entries.length;
        }
      }
      if (categoryResult.databases.length > 0) {
        results_by_category.push(categoryResult);
      }
    }

    return {
      query: req.query,
      total_results,
      results_by_category,
    };
  }
);

export const listDatabases = api(
  { method: "GET", path: "/databases", expose: true },
  async (): Promise<{ databases: DatabaseSource[], summary: any }> => {
    const summary = {
      totalDatabases: ALL_DATABASES.length,
      byTier: {
        tier1: TIER_1_DATABASES.length,
        tier2: TIER_2_DATABASES.length,
        tier3: TIER_3_DATABASES.length,
        tier4: 0,
        tier5: 0,
        tier6: 0
      },
      byStatus: {
        online: ALL_DATABASES.filter(db => db.status === 'online').length,
        offline: ALL_DATABASES.filter(db => db.status === 'offline').length,
        maintenance: ALL_DATABASES.filter(db => db.status === 'maintenance').length,
        rate_limited: ALL_DATABASES.filter(db => db.status === 'rate_limited').length
      },
      averageResponseTime: ALL_DATABASES.reduce((sum, db) => sum + db.responseTime, 0) / ALL_DATABASES.length
    };

    return { databases: ALL_DATABASES, summary };
  }
);

export const queryDatabases = api(
  { method: "POST", path: "/databases/query", expose: true },
  async (query: DatabaseQuery): Promise<{ results: DatabaseResult[], metadata: any }> => {
    // Simulate database queries with realistic delays and responses
    const results: DatabaseResult[] = [];
    const startTime = Date.now();

    for (const dbId of query.databases) {
      const database = ALL_DATABASES.find(db => db.id === dbId);
      if (!database || database.status !== 'online') {
        continue;
      }

      // Simulate query delay based on database response time
      await new Promise(resolve => setTimeout(resolve, database.responseTime));

      // Generate mock results based on database tier and category
      const mockMatches = generateMockMatches(database, query);
      
      results.push({
        databaseId: dbId,
        matches: mockMatches,
        metadata: {
          queryTime: database.responseTime,
          totalHits: mockMatches.length,
          parameters: {
            eValue: query.eValue || 0.01,
            identityThreshold: query.identityThreshold || 0.7,
            queryType: query.queryType
          }
        }
      });
    }

    const totalTime = Date.now() - startTime;
    const metadata = {
      totalQueryTime: totalTime,
      successfulQueries: results.length,
      failedQueries: query.databases.length - results.length,
      averageHitsPerDatabase: results.reduce((sum, r) => sum + r.matches.length, 0) / results.length || 0
    };

    return { results, metadata };
  }
);

export const getDatabaseStatus = api(
  { method: "GET", path: "/databases/status", expose: true },
  async (): Promise<{ status: string, databases: any[], lastUpdate: Date }> => {
    // Simulate real-time database status monitoring
    const statusChecks = ALL_DATABASES.map(db => ({
      id: db.id,
      name: db.name,
      status: db.status,
      responseTime: db.responseTime,
      lastChecked: db.lastChecked,
      tier: db.tier,
      category: db.category
    }));

    return {
      status: 'healthy',
      databases: statusChecks,
      lastUpdate: new Date()
    };
  }
);

export interface DatabaseAnnotationSearchRequest {
  accession: string;
  databases?: string[];
}

export interface DatabaseAnnotationSearchResponse {
  annotations: DatabaseAnnotation[];
}

export const searchDatabaseAnnotations = api(
  { method: "POST", path: "/databases/annotations/search", expose: true },
  async (req: DatabaseAnnotationSearchRequest): Promise<DatabaseAnnotationSearchResponse> => {
    // Simulate annotation search across multiple databases
    const annotations: DatabaseAnnotation[] = [];
    
    // Mock annotations based on accession pattern
    if (req.accession.startsWith('NP_')) {
      annotations.push({
        type: 'function',
        source: 'NCBI RefSeq',
        value: 'DNA-binding transcriptional regulator',
        confidence: 0.95,
        evidence: ['experimental', 'sequence similarity']
      });
    }

    if (req.accession.includes('toxin') || req.accession.includes('virulence')) {
      annotations.push({
        type: 'function',
        source: 'VFDB',
        value: 'Virulence factor',
        confidence: 0.88,
        evidence: ['experimental', 'literature']
      });
    }

    annotations.push({
      type: 'pathway',
      source: 'KEGG',
      value: 'Metabolic pathway: purine biosynthesis',
      confidence: 0.75,
      evidence: ['computational prediction']
    });

    return { annotations };
  }
);

function generateMockMatches(database: DatabaseSource, query: DatabaseQuery): DatabaseMatch[] {
  const matches: DatabaseMatch[] = [];
  const numMatches = Math.floor(Math.random() * 10) + 1;

  for (let i = 0; i < numMatches; i++) {
    const score = Math.random() * 1000;
    const identity = 0.5 + Math.random() * 0.5;
    const eValue = Math.pow(10, -Math.random() * 20);

    matches.push({
      id: `${database.id}_${i + 1}`,
      accession: generateMockAccession(database),
      description: generateMockDescription(database),
      organism: generateMockOrganism(database),
      score,
      eValue,
      identity,
      coverage: 0.6 + Math.random() * 0.4,
      alignmentLength: Math.floor(Math.random() * 500) + 100,
      annotations: generateMockAnnotations(database)
    });
  }

  return matches.sort((a, b) => b.score - a.score);
}

function generateMockAccession(database: DatabaseSource): string {
  const prefixes = {
    'ncbi_genbank': 'GB',
    'embl_ena': 'EM',
    'refseq': 'NP',
    'pdb': 'PDB',
    'pfam': 'PF',
    'vfdb': 'VF'
  };
  
  const prefix = prefixes[database.id as keyof typeof prefixes] || 'DB';
  return `${prefix}_${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
}

function generateMockDescription(database: DatabaseSource): string {
  const descriptions = {
    'Genomic & Sequence': [
      'Hypothetical protein',
      'DNA polymerase',
      'RNA polymerase subunit',
      'Ribosomal protein',
      'Metabolic enzyme'
    ],
    'Protein Structure & Function': [
      'Alpha/beta hydrolase fold',
      'Immunoglobulin-like domain',
      'Helix-turn-helix motif',
      'Zinc finger domain',
      'Leucine zipper'
    ],
    'Pathogenicity & Virulence': [
      'Type III secretion system effector',
      'Adhesin protein',
      'Toxin component',
      'Virulence regulator',
      'Invasion protein'
    ]
  };

  const categoryDescriptions = descriptions[database.category as keyof typeof descriptions] || descriptions['Genomic & Sequence'];
  return categoryDescriptions[Math.floor(Math.random() * categoryDescriptions.length)];
}

function generateMockOrganism(database: DatabaseSource): string {
  const organisms = [
    'Escherichia coli',
    'Saccharomyces cerevisiae',
    'Homo sapiens',
    'Mus musculus',
    'Drosophila melanogaster',
    'Caenorhabditis elegans',
    'Arabidopsis thaliana',
    'Bacillus subtilis'
  ];

  return organisms[Math.floor(Math.random() * organisms.length)];
}

function generateMockAnnotations(database: DatabaseSource): DatabaseAnnotation[] {
  const annotations: DatabaseAnnotation[] = [];
  
  if (Math.random() > 0.3) {
    annotations.push({
      type: 'function',
      source: database.name,
      value: 'Catalytic activity',
      confidence: 0.8 + Math.random() * 0.2,
      evidence: ['sequence similarity', 'domain analysis']
    });
  }

  if (Math.random() > 0.7) {
    annotations.push({
      type: 'pathway',
      source: 'KEGG',
      value: 'Central metabolism',
      confidence: 0.6 + Math.random() * 0.3,
      evidence: ['pathway analysis']
    });
  }

  return annotations;
}
