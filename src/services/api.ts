import {
  PredictionRequest,
  PredictionResponse,
  AnalyticsSummary,
  ModelMetrics,
  FeatureImportanceItem,
  MLModelType,
  PropertyInput,
} from '../types/estate';
import { mlEngine, MODEL_COLUMNS } from './mlEngine';

const FASTAPI_STORAGE_KEY = 'estatiq_fastapi_url';

export function getApiBaseUrl(): string {
  const custom = getConfiguredFastApiUrl();
  if (custom) return custom;
  const envUrl = (import.meta as { env?: Record<string, string> }).env?.VITE_API_URL;
  if (envUrl) return envUrl.replace(/\/+$/, '');
  return '';
}

export function getConfiguredFastApiUrl(): string {
  try {
    return localStorage.getItem(FASTAPI_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function setConfiguredFastApiUrl(url: string): void {
  try {
    if (url.trim()) {
      localStorage.setItem(FASTAPI_STORAGE_KEY, url.trim().replace(/\/+$/, ''));
    } else {
      localStorage.removeItem(FASTAPI_STORAGE_KEY);
    }
  } catch {
    // Ignore storage error
  }
}

/**
 * POST /api/predict
 */
export async function predictPropertyPrice(
  request: PredictionRequest
): Promise<PredictionResponse> {
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/predict`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        area: Number(request.area),
        bedrooms: Number(request.bedrooms),
        bathrooms: Number(request.bathrooms),
        stories: Number(request.stories),
        mainroad: request.mainroad,
        guestroom: request.guestroom,
        basement: request.basement,
        hotwaterheating: request.hotwaterheating,
        airconditioning: request.airconditioning,
        parking: Number(request.parking),
        prefarea: request.prefarea,
        furnishingstatus: request.furnishingstatus,
        model: request.model,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      // If external FastAPI returns minimal response { success, predicted_price, model, currency }, enrich with local feature contributions
      if (typeof data.predicted_price === 'number') {
        const fallbackCalc = mlEngine.predict(request, request.model, 'fastapi_backend');
        return {
          ...fallbackCalc,
          ...data,
          execution_mode: baseUrl ? 'fastapi_backend' : (data.execution_mode || 'trained_ml_engine'),
        };
      }
    }
  } catch {
    // Graceful fallback to in-memory trained OLS / CART engine
  }

  // Simulate realistic 350ms model inference latency for smooth UI feedback
  await new Promise((resolve) => setTimeout(resolve, 350));
  return mlEngine.predict(request, request.model, 'trained_ml_engine');
}

/**
 * GET /api/analytics
 */
export async function fetchAnalyticsSummary(): Promise<AnalyticsSummary> {
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/analytics`;

  try {
    const res = await fetch(endpoint);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback to trained engine summary
  }
  return mlEngine.analyticsSummary;
}

/**
 * GET /api/model-performance
 */
export async function fetchModelPerformance(): Promise<Record<MLModelType, ModelMetrics>> {
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/model-performance`;

  try {
    const res = await fetch(endpoint);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback to trained engine metrics
  }
  return mlEngine.metrics;
}

/**
 * GET /api/feature-importance
 */
export async function fetchFeatureImportance(): Promise<FeatureImportanceItem[]> {
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/feature-importance`;

  try {
    const res = await fetch(endpoint);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }
  return mlEngine.featureImportanceList;
}

/**
 * GET /api/health
 */
export async function fetchHealthStatus(): Promise<{
  status: string;
  mode: string;
  models: string[];
  modelColumns: readonly string[];
  datasetRecords: number;
}> {
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/health`;

  try {
    const res = await fetch(endpoint);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }
  return {
    status: 'healthy',
    mode: 'Trained ML Engine (Housing.csv 545 records)',
    models: ['linear_regression', 'decision_tree'],
    modelColumns: MODEL_COLUMNS,
    datasetRecords: mlEngine.analyticsSummary.totalRecords,
  };
}

/**
 * POST /api/predict/compare
 * Evaluates a property under both Linear Regression and Decision Tree simultaneously.
 */
export async function compareModels(input: PropertyInput): Promise<{
  success: boolean;
  timestamp: string;
  linear_regression: PredictionResponse;
  decision_tree: PredictionResponse;
  comparison: {
    price_difference: number;
    price_difference_pct: number;
    higher_estimate: MLModelType;
    agreement: boolean;
  };
}> {
  try {
    const res = await fetch('/api/predict/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback to in-memory calculation
  }

  const linear = mlEngine.predict(input, 'linear_regression', 'trained_ml_engine');
  const tree = mlEngine.predict(input, 'decision_tree', 'trained_ml_engine');
  const diff = tree.predicted_price - linear.predicted_price;
  const pct = Number(((diff / linear.predicted_price) * 100).toFixed(2));

  return {
    success: true,
    timestamp: new Date().toISOString(),
    linear_regression: linear,
    decision_tree: tree,
    comparison: {
      price_difference: Math.abs(diff),
      price_difference_pct: Math.abs(pct),
      higher_estimate: diff >= 0 ? 'decision_tree' : 'linear_regression',
      agreement: Math.abs(pct) < 10,
    },
  };
}

/**
 * POST /api/predict/batch
 * Batch predictions for multiple properties.
 */
export async function predictBatch(
  properties: Array<PropertyInput & { model?: MLModelType }>
): Promise<{
  success: boolean;
  total: number;
  processed: number;
  failed: number;
  results: Array<PredictionResponse & { index: number }>;
}> {
  try {
    const res = await fetch('/api/predict/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ properties }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }

  const results = properties.map((prop, index) => {
    const model = prop.model || 'linear_regression';
    const pred = mlEngine.predict(prop, model, 'trained_ml_engine');
    return { index, ...pred };
  });

  return {
    success: true,
    total: properties.length,
    processed: properties.length,
    failed: 0,
    results,
  };
}

/**
 * GET /api/dataset
 * Paginated and filterable dataset records.
 */
export async function fetchDatasetRecords(params?: {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  furnishingstatus?: string;
  airconditioning?: string;
  prefarea?: string;
  mainroad?: string;
  guestroom?: string;
  basement?: string;
}) {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) query.set(k, String(v));
    });
  }

  try {
    const res = await fetch(`/api/dataset?${query.toString()}`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }
  return {
    page: 1,
    limit: 20,
    total: mlEngine.analyticsSummary.totalRecords,
    totalPages: Math.ceil(mlEngine.analyticsSummary.totalRecords / 20),
    count: 0,
    data: [],
  };
}

/**
 * GET /api/models
 */
export async function fetchModelsMetadata() {
  try {
    const res = await fetch('/api/models');
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }
  return {
    models: [
      {
        id: 'linear_regression',
        name: 'Linear Regression (OLS)',
        artifact: 'linear_model.pkl',
        metrics: mlEngine.metrics.linear_regression,
      },
      {
        id: 'decision_tree',
        name: 'Decision Tree Regressor (CART)',
        artifact: 'decision_tree_model.pkl',
        metrics: mlEngine.metrics.decision_tree,
      },
    ],
  };
}


