import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  PropertyInput,
  MLModelType,
  PredictionResponse,
  PredictionHistoryItem,
  AnalyticsSummary,
  ModelMetrics,
  FeatureImportanceItem,
} from '../types/estate';
import {
  predictPropertyPrice,
  fetchAnalyticsSummary,
  fetchModelPerformance,
  fetchFeatureImportance,
} from '../services/api';
import { mlEngine } from '../services/mlEngine';
import {
  ParsedCSVPropertyRow,
  downloadPredictionHistoryCSV,
} from '../utils/csvSchema';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

interface EstateContextValue {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  currency: 'BDT' | 'USD';
  toggleCurrency: () => void;
  selectedModel: MLModelType;
  setSelectedModel: (model: MLModelType) => void;
  currentInputs: PropertyInput;
  setCurrentInputs: React.Dispatch<React.SetStateAction<PropertyInput>>;
  latestPrediction: PredictionResponse | null;
  comparisonPrediction: PredictionResponse | null;
  isQuickCompareEnabled: boolean;
  isPredicting: boolean;
  isComparing: boolean;
  runPrediction: (inputs: PropertyInput, model: MLModelType) => Promise<PredictionResponse>;
  toggleQuickCompare: (forceState?: boolean, forceReRun?: boolean) => Promise<void>;
  swapComparedModels: () => void;
  history: PredictionHistoryItem[];
  deleteHistoryItem: (id: string) => void;
  clearHistory: () => void;
  loadHistoryItemIntoResults: (item: PredictionHistoryItem) => void;
  importCSVRowsToHistory: (
    rows: ParsedCSVPropertyRow[],
    defaultModel?: MLModelType,
    includeQuickCompare?: boolean
  ) => PredictionHistoryItem[];
  exportHistoryCSV: (items?: PredictionHistoryItem[]) => void;
  analytics: AnalyticsSummary;
  modelMetrics: Record<MLModelType, ModelMetrics>;
  featureImportance: FeatureImportanceItem[];
  isLoadingData: boolean;
  toasts: ToastMessage[];
  addToast: (title: string, description?: string, type?: ToastMessage['type']) => void;
  removeToast: (id: string) => void;
}

const DEFAULT_INPUTS: PropertyInput = {
  area: 7420,
  bedrooms: 4,
  bathrooms: 2,
  stories: 3,
  mainroad: 'yes',
  guestroom: 'no',
  basement: 'no',
  hotwaterheating: 'no',
  airconditioning: 'yes',
  parking: 2,
  prefarea: 'yes',
  furnishingstatus: 'furnished',
};

const HISTORY_STORAGE_KEY = 'estatiq_prediction_history_v1';
const THEME_STORAGE_KEY = 'estatiq_theme_v1';

function buildInitialSeededHistory(): PredictionHistoryItem[] {
  const sampleProperties: { inputs: PropertyInput; model: MLModelType; offsetMinutes: number }[] = [
    {
      inputs: {
        area: 7420,
        bedrooms: 4,
        bathrooms: 2,
        stories: 3,
        mainroad: 'yes',
        guestroom: 'no',
        basement: 'no',
        hotwaterheating: 'no',
        airconditioning: 'yes',
        parking: 2,
        prefarea: 'yes',
        furnishingstatus: 'furnished',
      },
      model: 'linear_regression',
      offsetMinutes: 14,
    },
    {
      inputs: {
        area: 6360,
        bedrooms: 3,
        bathrooms: 2,
        stories: 4,
        mainroad: 'yes',
        guestroom: 'no',
        basement: 'no',
        hotwaterheating: 'no',
        airconditioning: 'yes',
        parking: 1,
        prefarea: 'yes',
        furnishingstatus: 'furnished',
      },
      model: 'decision_tree',
      offsetMinutes: 68,
    },
    {
      inputs: {
        area: 4880,
        bedrooms: 4,
        bathrooms: 2,
        stories: 2,
        mainroad: 'yes',
        guestroom: 'yes',
        basement: 'yes',
        hotwaterheating: 'no',
        airconditioning: 'yes',
        parking: 2,
        prefarea: 'no',
        furnishingstatus: 'semi-furnished',
      },
      model: 'linear_regression',
      offsetMinutes: 210,
    },
  ];

  return sampleProperties.map((item, idx) => {
    const primaryRes = mlEngine.predict(item.inputs, item.model);
    const altModel: MLModelType =
      item.model === 'linear_regression' ? 'decision_tree' : 'linear_regression';
    const altRes = mlEngine.predict(item.inputs, altModel);
    const ts = new Date(Date.now() - item.offsetMinutes * 60 * 1000).toISOString();
    return {
      id: `pred-seed-${idx + 1}`,
      timestamp: ts,
      inputs: item.inputs,
      primaryModel: item.model,
      primaryPrice: primaryRes.predicted_price,
      secondaryModel: altModel,
      secondaryPrice: altRes.predicted_price,
      currency: 'BDT',
      featureContributions: primaryRes.feature_contributions,
    };
  });
}

const EstateContext = createContext<EstateContextValue | undefined>(undefined);

export const EstateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      // default light
    }
    return 'light';
  });

  const [currency, setCurrency] = useState<'BDT' | 'USD'>('BDT');
  const [selectedModel, setSelectedModel] = useState<MLModelType>('linear_regression');
  const [currentInputs, setCurrentInputs] = useState<PropertyInput>(DEFAULT_INPUTS);

  // Initialize with a real prediction from the trained ML engine so Results & Overview have immediate real state
  const [latestPrediction, setLatestPrediction] = useState<PredictionResponse | null>(() =>
    mlEngine.predict(DEFAULT_INPUTS, 'linear_regression')
  );
  const [comparisonPrediction, setComparisonPrediction] = useState<PredictionResponse | null>(null);
  const [isQuickCompareEnabled, setIsQuickCompareEnabled] = useState<boolean>(false);
  const [isPredicting, setIsPredicting] = useState<boolean>(false);
  const [isComparing, setIsComparing] = useState<boolean>(false);

  const [history, setHistory] = useState<PredictionHistoryItem[]>(() => {
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return buildInitialSeededHistory();
  });

  const [analytics, setAnalytics] = useState<AnalyticsSummary>(mlEngine.analyticsSummary);
  const [modelMetrics, setModelMetrics] = useState<Record<MLModelType, ModelMetrics>>(
    mlEngine.metrics
  );
  const [featureImportance, setFeatureImportance] = useState<FeatureImportanceItem[]>(
    mlEngine.featureImportanceList
  );
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Apply theme class to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  // Persist history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch {
      // ignore
    }
  }, [history]);

  // Fetch initial backend data
  useEffect(() => {
    let mounted = true;
    setIsLoadingData(true);
    Promise.all([
      fetchAnalyticsSummary(),
      fetchModelPerformance(),
      fetchFeatureImportance(),
    ])
      .then(([analyticsData, metricsData, importanceData]) => {
        if (!mounted) return;
        setAnalytics(analyticsData);
        setModelMetrics(metricsData);
        setFeatureImportance(importanceData);
      })
      .finally(() => {
        if (mounted) setIsLoadingData(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const addToast = useCallback(
    (title: string, description?: string, type: ToastMessage['type'] = 'info') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, title, description, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4200);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      return next;
    });
  }, []);

  const toggleCurrency = useCallback(() => {
    setCurrency((prev) => (prev === 'BDT' ? 'USD' : 'BDT'));
  }, []);

  const runPrediction = useCallback(
    async (inputs: PropertyInput, model: MLModelType): Promise<PredictionResponse> => {
      setIsPredicting(true);
      setCurrentInputs(inputs);
      setSelectedModel(model);
      // Reset comparison state until Quick Compare is toggled or re-evaluated
      setComparisonPrediction(null);
      setIsQuickCompareEnabled(false);

      try {
        const response = await predictPropertyPrice({ ...inputs, model });
        setLatestPrediction(response);

        const newItem: PredictionHistoryItem = {
          id: `pred-${Date.now()}`,
          timestamp: response.timestamp,
          inputs: { ...inputs },
          primaryModel: model,
          primaryPrice: response.predicted_price,
          currency: response.currency,
          featureContributions: response.feature_contributions,
        };

        setHistory((prev) => [newItem, ...prev]);
        addToast(
          'AI Valuation Generated',
          `Estimated with ${
            model === 'linear_regression' ? 'Linear Regression' : 'Decision Tree Regressor'
          }`,
          'success'
        );
        return response;
      } finally {
        setIsPredicting(false);
      }
    },
    [addToast]
  );

  /**
   * Quick Compare toggle:
   * Re-runs the current inputs against the alternative model (Linear Regression vs. Decision Tree)
   * via POST /api/predict to visualize differences in valuation side-by-side.
   */
  const toggleQuickCompare = useCallback(
    async (forceState?: boolean, forceReRun = false) => {
      const targetState = forceState !== undefined ? forceState : !isQuickCompareEnabled;
      if (!targetState) {
        setIsQuickCompareEnabled(false);
        return;
      }

      setIsQuickCompareEnabled(true);
      const baseModel = latestPrediction?.model || selectedModel;
      const altModel: MLModelType =
        baseModel === 'linear_regression' ? 'decision_tree' : 'linear_regression';

      // If we already have the exact comparison for the current inputs and alternative model and forceReRun is false, keep it
      if (!forceReRun && comparisonPrediction && comparisonPrediction.model === altModel) {
        return;
      }

      setIsComparing(true);
      try {
        const altResponse = await predictPropertyPrice({
          ...currentInputs,
          model: altModel,
        });
        setComparisonPrediction(altResponse);

        // Update the most recent matching history entry with the secondary model evaluation
        setHistory((prev) => {
          if (prev.length === 0) return prev;
          const [first, ...rest] = prev;
          return [
            {
              ...first,
              secondaryModel: altModel,
              secondaryPrice: altResponse.predicted_price,
            },
            ...rest,
          ];
        });

        addToast(
          'Quick Compare Evaluated',
          `Ran current property inputs against ${
            altModel === 'linear_regression' ? 'Linear Regression' : 'Decision Tree Regressor'
          }`,
          'info'
        );
      } finally {
        setIsComparing(false);
      }
    },
    [
      isQuickCompareEnabled,
      latestPrediction,
      selectedModel,
      comparisonPrediction,
      currentInputs,
      addToast,
    ]
  );

  const swapComparedModels = useCallback(() => {
    if (!latestPrediction || !comparisonPrediction) return;
    const prevPrimary = latestPrediction;
    const prevSecondary = comparisonPrediction;
    setLatestPrediction(prevSecondary);
    setComparisonPrediction(prevPrimary);
    setSelectedModel(prevSecondary.model);
    addToast(
      'Primary Model Swapped',
      `Now viewing ${
        prevSecondary.model === 'linear_regression'
          ? 'Linear Regression'
          : 'Decision Tree Regressor'
      } as primary valuation.`,
      'info'
    );
  }, [latestPrediction, comparisonPrediction, addToast]);

  const deleteHistoryItem = useCallback(
    (id: string) => {
      setHistory((prev) => prev.filter((item) => item.id !== id));
      addToast('History Entry Removed', 'Prediction record deleted from local storage.', 'info');
    },
    [addToast]
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch {
      // ignore
    }
    addToast('History Cleared', 'All local prediction records have been removed.', 'warning');
  }, [addToast]);

  const loadHistoryItemIntoResults = useCallback((item: PredictionHistoryItem) => {
    setCurrentInputs(item.inputs);
    setSelectedModel(item.primaryModel);
    const primaryRes = mlEngine.predict(item.inputs, item.primaryModel);
    setLatestPrediction({
      ...primaryRes,
      predicted_price: item.primaryPrice,
      timestamp: item.timestamp,
    });

    if (item.secondaryModel && item.secondaryPrice) {
      const secondaryRes = mlEngine.predict(item.inputs, item.secondaryModel);
      setComparisonPrediction({
        ...secondaryRes,
        predicted_price: item.secondaryPrice,
        timestamp: item.timestamp,
      });
      setIsQuickCompareEnabled(true);
    } else {
      setComparisonPrediction(null);
      setIsQuickCompareEnabled(false);
    }
  }, []);

  const importCSVRowsToHistory = useCallback(
    (
      rows: ParsedCSVPropertyRow[],
      defaultModel: MLModelType = selectedModel,
      includeQuickCompare = true
    ): PredictionHistoryItem[] => {
      if (rows.length === 0) return [];

      const now = Date.now();
      const createdItems: PredictionHistoryItem[] = rows.map((row, idx) => {
        const primaryModel: MLModelType = row.model || defaultModel;
        const primaryRes = mlEngine.predict(row.inputs, primaryModel);
        const primaryPrice = primaryRes.predicted_price;

        const altModel: MLModelType =
          primaryModel === 'linear_regression' ? 'decision_tree' : 'linear_regression';
        const altRes = includeQuickCompare ? mlEngine.predict(row.inputs, altModel) : null;

        const ts = row.timestamp || new Date(now - idx * 1000).toISOString();

        return {
          id: row.id || `csv-import-${now}-${idx + 1}`,
          timestamp: ts,
          inputs: { ...row.inputs },
          primaryModel,
          primaryPrice,
          secondaryModel: includeQuickCompare ? altModel : row.secondaryModel,
          secondaryPrice: includeQuickCompare
            ? altRes?.predicted_price
            : row.secondaryPrice,
          currency: 'BDT',
          featureContributions: primaryRes.feature_contributions,
        };
      });

      setHistory((prev) => [...createdItems, ...prev]);

      // Also update the active prediction state with the first imported property
      if (createdItems.length > 0) {
        const first = createdItems[0];
        setCurrentInputs(first.inputs);
        setSelectedModel(first.primaryModel);
        const primaryRes = mlEngine.predict(first.inputs, first.primaryModel);
        setLatestPrediction(primaryRes);
        if (first.secondaryModel && first.secondaryPrice) {
          const secRes = mlEngine.predict(first.inputs, first.secondaryModel);
          setComparisonPrediction(secRes);
          setIsQuickCompareEnabled(true);
        }
      }

      addToast(
        'CSV Properties Imported & Evaluated',
        `Processed ${createdItems.length} property ${
          createdItems.length === 1 ? 'record' : 'records'
        } with trained ML models.`,
        'success'
      );

      return createdItems;
    },
    [selectedModel, addToast]
  );

  const exportHistoryCSV = useCallback(
    (items?: PredictionHistoryItem[]) => {
      const target = items ?? history;
      if (target.length === 0) {
        addToast('Nothing to Export', 'No prediction records available to export.', 'warning');
        return;
      }
      downloadPredictionHistoryCSV(target);
      addToast(
        'Prediction History Exported',
        `Exported ${target.length} ${
          target.length === 1 ? 'record' : 'records'
        } adhering to the 12-feature property schema.`,
        'success'
      );
    },
    [history, addToast]
  );

  return (
    <EstateContext.Provider
      value={{
        theme,
        toggleTheme,
        currency,
        toggleCurrency,
        selectedModel,
        setSelectedModel,
        currentInputs,
        setCurrentInputs,
        latestPrediction,
        comparisonPrediction,
        isQuickCompareEnabled,
        isPredicting,
        isComparing,
        runPrediction,
        toggleQuickCompare,
        swapComparedModels,
        history,
        deleteHistoryItem,
        clearHistory,
        loadHistoryItemIntoResults,
        importCSVRowsToHistory,
        exportHistoryCSV,
        analytics,
        modelMetrics,
        featureImportance,
        isLoadingData,
        toasts,
        addToast,
        removeToast,
      }}
    >
      {children}
    </EstateContext.Provider>
  );
};

export function useEstate() {
  const ctx = useContext(EstateContext);
  if (!ctx) {
    throw new Error('useEstate must be used within an EstateProvider');
  }
  return ctx;
}
