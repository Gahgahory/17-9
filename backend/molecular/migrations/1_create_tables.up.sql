-- Molecules table
CREATE TABLE molecules (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  formula TEXT,
  smiles TEXT,
  inchi TEXT,
  inchi_key TEXT,
  molecular_weight DOUBLE PRECISION,
  structure_data JSONB,
  pdb_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Risk assessments table
CREATE TABLE risk_assessments (
  id BIGSERIAL PRIMARY KEY,
  molecule_id BIGINT REFERENCES molecules(id) ON DELETE CASCADE,
  toxicity_score DOUBLE PRECISION,
  carcinogenicity_score DOUBLE PRECISION,
  mutagenicity_score DOUBLE PRECISION,
  reproductive_toxicity_score DOUBLE PRECISION,
  skin_sensitization_score DOUBLE PRECISION,
  eye_irritation_score DOUBLE PRECISION,
  respiratory_toxicity_score DOUBLE PRECISION,
  environmental_impact_score DOUBLE PRECISION,
  bioaccumulation_score DOUBLE PRECISION,
  persistence_score DOUBLE PRECISION,
  overall_risk_score DOUBLE PRECISION,
  confidence_score DOUBLE PRECISION,
  uncertainty_lower DOUBLE PRECISION,
  uncertainty_upper DOUBLE PRECISION,
  evidence_sources JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Database references table
CREATE TABLE database_references (
  id BIGSERIAL PRIMARY KEY,
  molecule_id BIGINT REFERENCES molecules(id) ON DELETE CASCADE,
  database_name TEXT NOT NULL,
  database_id TEXT NOT NULL,
  reference_url TEXT,
  data JSONB,
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Analysis results table
CREATE TABLE analysis_results (
  id BIGSERIAL PRIMARY KEY,
  molecule_id BIGINT REFERENCES molecules(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL, -- 'rna', 'protein', 'pathway'
  results JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User snapshots table
CREATE TABLE snapshots (
  id BIGSERIAL PRIMARY KEY,
  molecule_id BIGINT REFERENCES molecules(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  camera_position JSONB,
  visualization_settings JSONB,
  image_data TEXT, -- base64 encoded image
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_molecules_pdb_id ON molecules(pdb_id);
CREATE INDEX idx_molecules_inchi_key ON molecules(inchi_key);
CREATE INDEX idx_risk_assessments_molecule_id ON risk_assessments(molecule_id);
CREATE INDEX idx_database_references_molecule_id ON database_references(molecule_id);
CREATE INDEX idx_database_references_database ON database_references(database_name, database_id);
CREATE INDEX idx_analysis_results_molecule_id ON analysis_results(molecule_id);
CREATE INDEX idx_analysis_results_type ON analysis_results(analysis_type);
CREATE INDEX idx_snapshots_molecule_id ON snapshots(molecule_id);
