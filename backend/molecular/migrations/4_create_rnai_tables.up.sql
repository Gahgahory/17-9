-- RNAi target sequences table
CREATE TABLE rnai_targets (
  id BIGSERIAL PRIMARY KEY,
  target_name TEXT NOT NULL,
  target_sequence TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('mRNA', 'lncRNA', 'miRNA', 'custom')),
  gene_symbol TEXT,
  gene_id TEXT,
  organism TEXT NOT NULL,
  transcript_id TEXT,
  genomic_coordinates JSONB, -- {chromosome, start, end, strand}
  functional_annotation JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- siRNA/shRNA designs table
CREATE TABLE rnai_designs (
  id BIGSERIAL PRIMARY KEY,
  target_id BIGINT REFERENCES rnai_targets(id) ON DELETE CASCADE,
  design_type TEXT NOT NULL CHECK (design_type IN ('siRNA', 'shRNA', 'miRNA_mimic', 'antagomir')),
  guide_sequence TEXT NOT NULL,
  passenger_sequence TEXT,
  loop_sequence TEXT, -- for shRNA designs
  full_sequence TEXT NOT NULL,
  design_parameters JSONB NOT NULL,
  specificity_score DOUBLE PRECISION,
  efficacy_prediction DOUBLE PRECISION,
  thermodynamic_properties JSONB,
  off_target_analysis JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Off-target predictions table
CREATE TABLE off_target_predictions (
  id BIGSERIAL PRIMARY KEY,
  design_id BIGINT REFERENCES rnai_designs(id) ON DELETE CASCADE,
  off_target_sequence TEXT NOT NULL,
  off_target_gene TEXT,
  off_target_transcript TEXT,
  similarity_score DOUBLE PRECISION NOT NULL,
  mismatch_count INTEGER NOT NULL,
  mismatch_positions JSONB,
  seed_region_matches INTEGER,
  binding_energy DOUBLE PRECISION,
  risk_score DOUBLE PRECISION,
  created_at TIMESTAMP DEFAULT NOW()
);

-- RNAi efficiency experiments table
CREATE TABLE rnai_experiments (
  id BIGSERIAL PRIMARY KEY,
  design_id BIGINT REFERENCES rnai_designs(id) ON DELETE CASCADE,
  experiment_name TEXT NOT NULL,
  experiment_type TEXT NOT NULL CHECK (experiment_type IN ('in_silico', 'cell_culture', 'in_vivo', 'literature_derived')),
  cell_line TEXT,
  treatment_conditions JSONB,
  knockdown_efficiency DOUBLE PRECISION,
  viability_impact DOUBLE PRECISION,
  off_target_effects JSONB,
  expression_data JSONB,
  statistical_analysis JSONB,
  experimental_metadata JSONB,
  performed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- RNAi design scoring and validation table
CREATE TABLE rnai_validations (
  id BIGSERIAL PRIMARY KEY,
  design_id BIGINT REFERENCES rnai_designs(id) ON DELETE CASCADE,
  validation_method TEXT NOT NULL,
  validation_score DOUBLE PRECISION NOT NULL,
  validation_details JSONB,
  validation_status TEXT DEFAULT 'pending' CHECK (validation_status IN ('pending', 'passed', 'failed', 'warning')),
  validated_at TIMESTAMP DEFAULT NOW()
);

-- RNAi delivery methods and formulations table
CREATE TABLE rnai_delivery_systems (
  id BIGSERIAL PRIMARY KEY,
  design_id BIGINT REFERENCES rnai_designs(id) ON DELETE CASCADE,
  delivery_method TEXT NOT NULL, -- transfection, electroporation, viral, nanoparticle, etc.
  formulation_details JSONB,
  target_tissues JSONB,
  delivery_efficiency DOUBLE PRECISION,
  stability_profile JSONB,
  safety_assessment JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_rnai_targets_gene_symbol ON rnai_targets(gene_symbol);
CREATE INDEX idx_rnai_targets_organism ON rnai_targets(organism);
CREATE INDEX idx_rnai_targets_target_type ON rnai_targets(target_type);
CREATE INDEX idx_rnai_designs_target_id ON rnai_designs(target_id);
CREATE INDEX idx_rnai_designs_type ON rnai_designs(design_type);
CREATE INDEX idx_rnai_designs_specificity ON rnai_designs(specificity_score);
CREATE INDEX idx_off_target_predictions_design_id ON off_target_predictions(design_id);
CREATE INDEX idx_off_target_predictions_risk ON off_target_predictions(risk_score);
CREATE INDEX idx_rnai_experiments_design_id ON rnai_experiments(design_id);
CREATE INDEX idx_rnai_experiments_type ON rnai_experiments(experiment_type);
CREATE INDEX idx_rnai_validations_design_id ON rnai_validations(design_id);
CREATE INDEX idx_rnai_validations_status ON rnai_validations(validation_status);
CREATE INDEX idx_rnai_delivery_systems_design_id ON rnai_delivery_systems(design_id);