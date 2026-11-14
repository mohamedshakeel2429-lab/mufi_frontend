import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Code2,
  Cpu,
  Database,
  Server,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import {
  getConfiguredFastApiUrl,
  setConfiguredFastApiUrl,
  fetchHealthStatus,
} from '../services/api';
import { MODEL_COLUMNS } from '../services/mlEngine';
import { useEstate } from '../context/EstateContext';

export const AboutPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useEstate();

  const [fastApiUrl, setFastApiUrl] = useState<string>(() => getConfiguredFastApiUrl());
  const [healthInfo, setHealthInfo] = useState<{
    status: string;
    mode: string;
    datasetRecords: number;
  } | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);

  const handleSaveFastApi = (e: React.FormEvent) => {
    e.preventDefault();
    setConfiguredFastApiUrl(fastApiUrl);
    addToast(
      'Backend Endpoint Updated',
      fastApiUrl.trim()
        ? `Configured external FastAPI URL: ${fastApiUrl.trim()}`
        : 'Using built-in /api/* Express + Trained ML Engine.',
      'success'
    );
  };

  const handleCheckHealth = async () => {
    setCheckingHealth(true);
    try {
      const status = await fetchHealthStatus();
      setHealthInfo({
        status: status.status,
        mode: status.mode,
        datasetRecords: status.datasetRecords,
      });
      addToast('API Health Verified', `${status.mode} (${status.datasetRecords} records)`, 'info');
    } finally {
      setCheckingHealth(false);
    }
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Product Identity Hero */}
      <div className="p-8 rounded-2xl bg-white dark:bg-[#181E27] border border-slate-200 dark:border-[#78879B]/25 space-y-4">
        <div className="text-xs font-medium text-[#FF6B4A]">
          ESTATIQ AI · Predict Smarter. Invest Better.
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#11151C] dark:text-[#F1F5F9] font-display">
          Intelligent Real-Estate Valuation & ML Architecture
        </h1>
        <p className="text-sm sm:text-base text-[#5E6D82] dark:text-[#94A3B8] max-w-3xl leading-relaxed">
          ESTATIQ AI transforms residential property valuation by combining real-time 3D
          architectural visualization with trained supervised machine learning models (
          <code className="font-mono text-[#FF6B4A]">linear_model.pkl</code> and{' '}
          <code className="font-mono text-[#FF6B4A]">decision_tree_model.pkl</code>) calibrated on
          the 545-property <code className="font-mono">Housing.csv</code> dataset.
        </p>

        <div className="pt-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/predict')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#FF6B4A] hover:bg-[#E85838] transition-colors"
          >
            <span>Launch Valuation Studio</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleCheckHealth}
            disabled={checkingHealth}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#11151C] dark:text-slate-200 bg-slate-100 dark:bg-[#11151C] border border-slate-200 dark:border-[#78879B]/30 hover:border-[#FF6B4A] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingHealth ? 'animate-spin' : ''}`} />
            <span>Ping GET /api/health</span>
          </button>
        </div>

        {healthInfo && (
          <div className="p-3.5 rounded-xl bg-[#FF6B4A]/10 border border-[#FF6B4A]/25 text-xs font-mono text-[#11151C] dark:text-[#F1F5F9] flex flex-wrap items-center gap-4">
            <span className="text-[#FF6B4A] font-bold">STATUS: {healthInfo.status.toUpperCase()}</span>
            <span>·</span>
            <span>ENGINE: {healthInfo.mode}</span>
            <span>·</span>
            <span>DATASET: {healthInfo.datasetRecords} Records</span>
          </div>
        )}
      </div>

      {/* 3 Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-[#181E27] border border-slate-200 dark:border-[#78879B]/25 space-y-3">
          <Database className="w-5 h-5 text-[#FF6B4A]" />
          <h2 className="text-lg font-bold text-[#11151C] dark:text-white font-display">
            1. Exact model_columns.pkl Schema
          </h2>
          <p className="text-xs text-[#5E6D82] dark:text-[#94A3B8] leading-relaxed">
            Preserves the exact 13-feature one-hot encoded column order expected by the trained
            Python artifacts, including binary amenity indicators and drop-first furnishing dummy
            variables.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-[#181E27] border border-slate-200 dark:border-[#78879B]/25 space-y-3">
          <Cpu className="w-5 h-5 text-[#78879B]" />
          <h2 className="text-lg font-bold text-[#11151C] dark:text-white font-display">
            2. Dual Regression Engine
          </h2>
          <p className="text-xs text-[#5E6D82] dark:text-[#94A3B8] leading-relaxed">
            Supports both Ordinary Least Squares Linear Regression and CART Decision Tree Regression
            with instant Quick Compare side-by-side re-evaluation on the results page.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-[#181E27] border border-slate-200 dark:border-[#78879B]/25 space-y-3">
          <ShieldCheck className="w-5 h-5 text-[#FF6B4A]" />
          <h2 className="text-lg font-bold text-[#11151C] dark:text-white font-display">
            3. Full-Stack API & FastAPI Bridge
          </h2>
          <p className="text-xs text-[#5E6D82] dark:text-[#94A3B8] leading-relaxed">
            Provides production REST endpoints (<code className="font-mono">POST /api/predict</code>
            , <code className="font-mono">GET /api/analytics</code>,{' '}
            <code className="font-mono">GET /api/model-performance</code>) ready to bridge directly
            to an external Python FastAPI service.
          </p>
        </div>
      </div>

      {/* API Contract & Optional Python FastAPI Connection */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 p-6 rounded-2xl bg-white dark:bg-[#181E27] border border-slate-200 dark:border-[#78879B]/25 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#FF6B4A]">
            <Code2 className="w-4 h-4" />
            <span>REST API Specification (POST /api/predict)</span>
          </div>

          <pre className="p-4 rounded-xl bg-[#11151C] border border-[#78879B]/25 text-slate-100 text-xs font-mono overflow-x-auto leading-relaxed">
{`// Request Payload
POST /api/predict
{
  "area": 7420,
  "bedrooms": 4,
  "bathrooms": 2,
  "stories": 3,
  "mainroad": "yes",
  "guestroom": "no",
  "basement": "no",
  "hotwaterheating": "no",
  "airconditioning": "yes",
  "parking": 2,
  "prefarea": "yes",
  "furnishingstatus": "furnished",
  "model": "linear_regression"
}`}
          </pre>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-[#11151C] dark:text-[#CBD5E1]">
              Preserved model_columns.pkl Feature Order:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {MODEL_COLUMNS.map((col, idx) => (
                <span
                  key={col}
                  className="text-[11px] font-mono text-[#5E6D82] dark:text-[#94A3B8]"
                >
                  {idx + 1}. {col}
                  {idx < MODEL_COLUMNS.length - 1 ? ' · ' : ''}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* FastAPI Bridge Configuration */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-white dark:bg-[#181E27] border border-slate-200 dark:border-[#78879B]/25 flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#78879B]">
              <Server className="w-4 h-4" />
              <span>External Python FastAPI Bridge (Optional)</span>
            </div>
            <h3 className="text-lg font-bold text-[#11151C] dark:text-white font-display">
              Connect Custom Python Model Server
            </h3>
            <p className="text-xs text-[#5E6D82] dark:text-[#94A3B8] leading-relaxed">
              By default, ESTATIQ AI serves predictions via its built-in Express{' '}
              <code className="font-mono">/api/predict</code> route backed by the trained Housing.csv
              OLS & CART engine. If you are running a separate Python FastAPI server loading{' '}
              <code className="font-mono">linear_model.pkl</code> and{' '}
              <code className="font-mono">decision_tree_model.pkl</code>, enter its base URL below:
            </p>

            <form onSubmit={handleSaveFastApi} className="space-y-3 pt-2">
              <input
                type="url"
                value={fastApiUrl}
                onChange={(e) => setFastApiUrl(e.target.value)}
                placeholder="http://localhost:8000 (Leave blank for built-in /api/*)"
                className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono bg-slate-50 dark:bg-[#11151C] border border-slate-200 dark:border-[#78879B]/30 text-[#11151C] dark:text-white focus:outline-none focus:border-[#FF6B4A]"
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#FF6B4A] hover:bg-[#E85838] transition-colors"
                >
                  Save Endpoint Configuration
                </button>
                {fastApiUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setFastApiUrl('');
                      setConfiguredFastApiUrl('');
                      addToast('Reset to Built-In API', 'Using internal /api/* server.', 'info');
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-medium text-[#78879B] hover:text-[#11151C] dark:hover:text-white"
                  >
                    Reset Default
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#11151C] border border-slate-200 dark:border-[#78879B]/25 flex items-center gap-2.5 text-xs text-[#5E6D82] dark:text-[#94A3B8]">
            <CheckCircle2 className="w-4 h-4 text-[#FF6B4A] shrink-0" />
            <span>
              Zero fabricated metrics: All R², MSE, and RMSE values are calculated directly from the
              545-row Housing.csv dataset.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
