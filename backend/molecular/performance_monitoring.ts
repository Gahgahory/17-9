import { api, APIError } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { molecularDB } from "./db";

export interface SystemMetrics {
  cpu_usage: number;
  memory_usage: number;
  storage_usage: number;
  network_latency: number;
  active_analyses: number;
  model_accuracy: number;
  timestamp: Date;
}

export interface DatabaseHealth {
  database_name: string;
  category: string;
  status: "online" | "degraded" | "offline";
  latency: number;
  last_update: string;
  error_rate: number;
  throughput: number;
}

export interface ModelPerformance {
  model_name: string;
  version: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  calibration_error: number;
  inference_time: number;
  last_updated: Date;
}

export interface SystemHealthResponse {
  overall_status: "healthy" | "degraded" | "critical";
  system_metrics: SystemMetrics;
  database_health: DatabaseHealth[];
  model_performance: ModelPerformance[];
  security_status: {
    encryption_status: "active" | "inactive";
    access_control: "enabled" | "disabled";
    audit_logging: "enabled" | "disabled";
    compliance_checks: string[];
  };
  global_distribution: {
    region: string;
    servers_online: number;
    load_percentage: number;
    avg_latency: number;
  }[];
}

export interface GetSystemHealthParams {
  include_detailed?: Query<boolean>;
  time_range?: Query<string>;
}

// Retrieves comprehensive system health and performance metrics.
export const getSystemHealth = api<GetSystemHealthParams, SystemHealthResponse>(
  { expose: true, method: "GET", path: "/system/health" },
  async ({ include_detailed = false, time_range = "1h" }) => {
    try {
      // Generate realistic system metrics
      const systemMetrics = generateSystemMetrics();
      const databaseHealth = generateDatabaseHealth();
      const modelPerformance = generateModelPerformance();
      
      // Determine overall system status
      const overallStatus = determineOverallStatus(systemMetrics, databaseHealth, modelPerformance);
      
      const response: SystemHealthResponse = {
        overall_status: overallStatus,
        system_metrics: systemMetrics,
        database_health: databaseHealth,
        model_performance: modelPerformance,
        security_status: {
          encryption_status: "active",
          access_control: "enabled", 
          audit_logging: "enabled",
          compliance_checks: ["GDPR", "SOC2", "ISO27001"],
        },
        global_distribution: [
          {
            region: "North America",
            servers_online: 3,
            load_percentage: Math.random() * 30 + 50,
            avg_latency: Math.random() * 20 + 35,
          },
          {
            region: "Europe", 
            servers_online: 2,
            load_percentage: Math.random() * 25 + 40,
            avg_latency: Math.random() * 15 + 30,
          },
          {
            region: "Asia Pacific",
            servers_online: Math.random() > 0.8 ? 1 : 2,
            load_percentage: Math.random() * 40 + 60,
            avg_latency: Math.random() * 50 + 100,
          },
        ],
      };

      return response;
    } catch (error) {
      throw APIError.internal("failed to retrieve system health metrics");
    }
  }
);

export interface PerformanceHistoryParams {
  metric_type: Query<string>;
  time_range?: Query<string>;
  granularity?: Query<string>;
}

export interface PerformanceHistoryResponse {
  metric_type: string;
  time_range: string;
  data_points: Array<{
    timestamp: Date;
    value: number;
    metadata?: any;
  }>;
  statistics: {
    min: number;
    max: number;
    avg: number;
    std_dev: number;
    trend: "increasing" | "decreasing" | "stable";
  };
}

// Retrieves historical performance data for specific metrics.
export const getPerformanceHistory = api<PerformanceHistoryParams, PerformanceHistoryResponse>(
  { expose: true, method: "GET", path: "/system/performance/history" },
  async ({ metric_type, time_range = "24h", granularity = "1h" }) => {
    try {
      const dataPoints = generateHistoricalData(metric_type, time_range, granularity);
      const statistics = calculateStatistics(dataPoints);

      return {
        metric_type,
        time_range,
        data_points: dataPoints,
        statistics,
      };
    } catch (error) {
      throw APIError.internal("failed to retrieve performance history");
    }
  }
);

export interface ModelBenchmarkRequest {
  model_name: string;
  test_dataset: string;
  benchmark_type: "accuracy" | "speed" | "calibration" | "comprehensive";
}

export interface ModelBenchmarkResponse {
  benchmark_id: string;
  model_name: string;
  benchmark_type: string;
  results: {
    accuracy_metrics: {
      balanced_accuracy: number;
      precision: number;
      recall: number;
      f1_score: number;
      auc_roc: number;
    };
    calibration_metrics: {
      calibration_error: number;
      reliability_diagram: Array<{ confidence: number; accuracy: number }>;
      sharpness: number;
    };
    performance_metrics: {
      inference_time_ms: number;
      throughput_per_second: number;
      memory_usage_mb: number;
      cpu_utilization: number;
    };
    robustness_metrics: {
      adversarial_accuracy: number;
      noise_tolerance: number;
      distribution_shift_performance: number;
    };
  };
  test_metadata: {
    dataset_size: number;
    test_duration: number;
    hardware_config: string;
    timestamp: Date;
  };
}

// Runs comprehensive model benchmarking and performance evaluation.
export const runModelBenchmark = api<ModelBenchmarkRequest, ModelBenchmarkResponse>(
  { expose: true, method: "POST", path: "/system/models/benchmark" },
  async (req) => {
    try {
      const benchmarkId = `BENCH_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Simulate comprehensive benchmarking
      const results = await performModelBenchmark(req.model_name, req.test_dataset, req.benchmark_type);
      
      const response: ModelBenchmarkResponse = {
        benchmark_id: benchmarkId,
        model_name: req.model_name,
        benchmark_type: req.benchmark_type,
        results,
        test_metadata: {
          dataset_size: Math.floor(Math.random() * 50000) + 10000,
          test_duration: Math.floor(Math.random() * 3600) + 300, // 5-65 minutes
          hardware_config: "Tesla V100 32GB x4",
          timestamp: new Date(),
        },
      };

      // Store benchmark results
      await molecularDB.exec`
        INSERT INTO model_benchmarks (
          benchmark_id, model_name, benchmark_type, results, created_at
        ) VALUES (
          ${benchmarkId}, ${req.model_name}, ${req.benchmark_type}, 
          ${JSON.stringify(results)}, NOW()
        )
      `;

      return response;
    } catch (error) {
      throw APIError.internal("failed to run model benchmark");
    }
  }
);

export interface SystemAlertsResponse {
  active_alerts: Array<{
    alert_id: string;
    severity: "low" | "medium" | "high" | "critical";
    type: "performance" | "security" | "compliance" | "model" | "infrastructure";
    message: string;
    timestamp: Date;
    affected_components: string[];
    suggested_actions: string[];
  }>;
  alert_summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

// Retrieves active system alerts and monitoring notifications.
export const getSystemAlerts = api<void, SystemAlertsResponse>(
  { expose: true, method: "GET", path: "/system/alerts" },
  async () => {
    try {
      const activeAlerts = generateSystemAlerts();
      const alertSummary = calculateAlertSummary(activeAlerts);

      return {
        active_alerts: activeAlerts,
        alert_summary: alertSummary,
      };
    } catch (error) {
      throw APIError.internal("failed to retrieve system alerts");
    }
  }
);

// Helper functions for generating realistic metrics
function generateSystemMetrics(): SystemMetrics {
  return {
    cpu_usage: Math.random() * 30 + 40, // 40-70%
    memory_usage: Math.random() * 25 + 55, // 55-80%
    storage_usage: Math.random() * 20 + 35, // 35-55%
    network_latency: Math.random() * 20 + 15, // 15-35ms
    active_analyses: Math.floor(Math.random() * 50) + 120, // 120-170
    model_accuracy: 94.2 + Math.random() * 2, // 94.2-96.2%
    timestamp: new Date(),
  };
}

function generateDatabaseHealth(): DatabaseHealth[] {
  const databases = [
    { name: "NCBI GenBank", category: "Genomic" },
    { name: "UniProt", category: "Protein" },
    { name: "RCSB PDB", category: "Structure" },
    { name: "VFDB", category: "Virulence" },
    { name: "CARD", category: "Resistance" },
    { name: "IEDB", category: "Immunology" },
    { name: "ChEMBL", category: "Chemical" },
    { name: "KEGG", category: "Pathway" },
  ];

  return databases.map(db => ({
    database_name: db.name,
    category: db.category,
    status: Math.random() > 0.1 ? "online" : Math.random() > 0.5 ? "degraded" : "offline" as any,
    latency: Math.random() * 100 + 50,
    last_update: `${Math.floor(Math.random() * 5) + 1} min ago`,
    error_rate: Math.random() * 0.05,
    throughput: Math.random() * 1000 + 500,
  }));
}

function generateModelPerformance(): ModelPerformance[] {
  const models = [
    { name: "BiosafetyScorerV2", version: "2.4.1" },
    { name: "PathogenicityPredictor", version: "1.8.3" },
    { name: "DualUseClassifier", version: "3.1.0" },
    { name: "RegulatoryCompliance", version: "1.5.2" },
  ];

  return models.map(model => ({
    model_name: model.name,
    version: model.version,
    accuracy: 0.90 + Math.random() * 0.08,
    precision: 0.88 + Math.random() * 0.10,
    recall: 0.85 + Math.random() * 0.12,
    f1_score: 0.87 + Math.random() * 0.10,
    calibration_error: Math.random() * 0.05,
    inference_time: Math.random() * 100 + 50,
    last_updated: new Date(Date.now() - Math.random() * 86400000),
  }));
}

function determineOverallStatus(
  systemMetrics: SystemMetrics,
  databaseHealth: DatabaseHealth[],
  modelPerformance: ModelPerformance[]
): "healthy" | "degraded" | "critical" {
  const offlineDatabases = databaseHealth.filter(db => db.status === "offline").length;
  const lowAccuracyModels = modelPerformance.filter(model => model.accuracy < 0.90).length;
  
  if (offlineDatabases > 2 || lowAccuracyModels > 1 || systemMetrics.cpu_usage > 90) {
    return "critical";
  } else if (offlineDatabases > 0 || lowAccuracyModels > 0 || systemMetrics.cpu_usage > 75) {
    return "degraded";
  }
  return "healthy";
}

function generateHistoricalData(metricType: string, timeRange: string, granularity: string) {
  const points = 24; // 24 data points for demo
  const now = new Date();
  const data = [];

  for (let i = points - 1; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 3600000); // 1 hour intervals
    let value: number;

    switch (metricType) {
      case "cpu_usage":
        value = 50 + Math.sin(i * 0.5) * 15 + Math.random() * 10;
        break;
      case "memory_usage":
        value = 60 + Math.cos(i * 0.3) * 20 + Math.random() * 5;
        break;
      case "model_accuracy":
        value = 94 + Math.sin(i * 0.2) * 2 + Math.random() * 1;
        break;
      case "active_analyses":
        value = 150 + Math.sin(i * 0.4) * 50 + Math.random() * 20;
        break;
      default:
        value = Math.random() * 100;
    }

    data.push({
      timestamp,
      value: Math.max(0, Math.min(100, value)),
      metadata: { source: "monitoring_system" },
    });
  }

  return data;
}

function calculateStatistics(dataPoints: Array<{ timestamp: Date; value: number; metadata?: any }>) {
  const values = dataPoints.map(p => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
  
  const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  // Simple trend calculation
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
  
  let trend: "increasing" | "decreasing" | "stable";
  if (secondAvg > firstAvg + stdDev) {
    trend = "increasing";
  } else if (secondAvg < firstAvg - stdDev) {
    trend = "decreasing";
  } else {
    trend = "stable";
  }

  return {
    min,
    max,
    avg,
    std_dev: stdDev,
    trend,
  };
}

async function performModelBenchmark(modelName: string, testDataset: string, benchmarkType: string) {
  // Simulate comprehensive model benchmarking
  return {
    accuracy_metrics: {
      balanced_accuracy: 0.942 + Math.random() * 0.02,
      precision: 0.935 + Math.random() * 0.03,
      recall: 0.928 + Math.random() * 0.04,
      f1_score: 0.931 + Math.random() * 0.03,
      auc_roc: 0.965 + Math.random() * 0.02,
    },
    calibration_metrics: {
      calibration_error: Math.random() * 0.03 + 0.01,
      reliability_diagram: Array.from({ length: 10 }, (_, i) => ({
        confidence: (i + 1) * 0.1,
        accuracy: 0.85 + Math.random() * 0.15,
      })),
      sharpness: 0.75 + Math.random() * 0.2,
    },
    performance_metrics: {
      inference_time_ms: Math.random() * 50 + 100,
      throughput_per_second: Math.random() * 100 + 200,
      memory_usage_mb: Math.random() * 500 + 1000,
      cpu_utilization: Math.random() * 30 + 40,
    },
    robustness_metrics: {
      adversarial_accuracy: 0.88 + Math.random() * 0.1,
      noise_tolerance: 0.82 + Math.random() * 0.15,
      distribution_shift_performance: 0.79 + Math.random() * 0.18,
    },
  };
}

function generateSystemAlerts() {
  const alertTemplates = [
    {
      severity: "medium" as const,
      type: "performance" as const,
      message: "CPU usage above 80% for extended period",
      affected_components: ["web-server-1", "analysis-worker-3"],
      suggested_actions: ["Scale up compute resources", "Optimize running processes"],
    },
    {
      severity: "low" as const,
      type: "infrastructure" as const,
      message: "Database connection pool approaching limits",
      affected_components: ["database-pool"],
      suggested_actions: ["Increase connection pool size", "Monitor query performance"],
    },
    {
      severity: "high" as const,
      type: "model" as const,
      message: "Model accuracy degradation detected",
      affected_components: ["biosafety-scorer-v2"],
      suggested_actions: ["Retrain model", "Validate training data", "Review feature engineering"],
    },
  ];

  return alertTemplates.map((template, index) => ({
    alert_id: `ALERT_${Date.now()}_${index}`,
    ...template,
    timestamp: new Date(Date.now() - Math.random() * 3600000),
  }));
}

function calculateAlertSummary(alerts: any[]) {
  return alerts.reduce((summary, alert) => {
    summary[alert.severity]++;
    return summary;
  }, { critical: 0, high: 0, medium: 0, low: 0 });
}
