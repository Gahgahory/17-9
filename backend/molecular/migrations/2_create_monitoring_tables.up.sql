-- Model benchmarks table
CREATE TABLE model_benchmarks (
  id BIGSERIAL PRIMARY KEY,
  benchmark_id TEXT UNIQUE NOT NULL,
  model_name TEXT NOT NULL,
  benchmark_type TEXT NOT NULL,
  results JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- System metrics history table
CREATE TABLE system_metrics_history (
  id BIGSERIAL PRIMARY KEY,
  metric_type TEXT NOT NULL,
  metric_value DOUBLE PRECISION NOT NULL,
  metadata JSONB,
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- Alert logs table
CREATE TABLE alert_logs (
  id BIGSERIAL PRIMARY KEY,
  alert_id TEXT UNIQUE NOT NULL,
  severity TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  message TEXT NOT NULL,
  affected_components JSONB,
  suggested_actions JSONB,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

-- Expert review assignments table
CREATE TABLE expert_reviews (
  id BIGSERIAL PRIMARY KEY,
  review_id TEXT UNIQUE NOT NULL,
  molecule_id BIGINT REFERENCES molecules(id) ON DELETE CASCADE,
  expert_id TEXT NOT NULL,
  expert_name TEXT NOT NULL,
  expertise_areas JSONB NOT NULL,
  assignment_reason TEXT,
  status TEXT DEFAULT 'assigned',
  estimated_hours INTEGER,
  actual_hours INTEGER,
  review_comments TEXT,
  risk_assessment JSONB,
  recommendation TEXT,
  assigned_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Export requests table
CREATE TABLE export_requests (
  id BIGSERIAL PRIMARY KEY,
  analysis_id BIGINT REFERENCES analysis_results(id) ON DELETE CASCADE,
  export_format TEXT NOT NULL,
  export_parameters JSONB,
  file_path TEXT,
  file_size BIGINT,
  status TEXT DEFAULT 'pending',
  requested_by TEXT,
  requested_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Performance baselines table
CREATE TABLE performance_baselines (
  id BIGSERIAL PRIMARY KEY,
  model_name TEXT NOT NULL,
  model_version TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  baseline_value DOUBLE PRECISION NOT NULL,
  confidence_interval_lower DOUBLE PRECISION,
  confidence_interval_upper DOUBLE PRECISION,
  dataset_name TEXT,
  established_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(model_name, model_version, metric_name)
);

-- Create indexes for better performance
CREATE INDEX idx_model_benchmarks_model ON model_benchmarks(model_name, benchmark_type);
CREATE INDEX idx_system_metrics_type_time ON system_metrics_history(metric_type, recorded_at);
CREATE INDEX idx_alert_logs_severity_status ON alert_logs(severity, status);
CREATE INDEX idx_expert_reviews_molecule ON expert_reviews(molecule_id, status);
CREATE INDEX idx_expert_reviews_expert ON expert_reviews(expert_id, status);
CREATE INDEX idx_export_requests_analysis ON export_requests(analysis_id, status);
CREATE INDEX idx_performance_baselines_model ON performance_baselines(model_name, model_version);
