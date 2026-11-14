import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart2,
  Database,
  GitBranch,
  Layers,
  TrendingUp,
  Trophy,
  Sliders,
  Upload,
  Download,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { motion } from 'motion/react';
import { useEstate } from '../context/EstateContext';
import { LuxuryHouseScene } from '../components/three/LuxuryHouseScene';
import { formatCurrency, formatDateShort, formatNumber } from '../utils/formatters';
import { CSVImportModal } from '../components/csv/CSVImportModal';

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    analytics,
    modelMetrics,
    featureImportance,
    latestPrediction,
    history,
    currency,
    loadHistoryItemIntoResults,
    exportHistoryCSV,
  } = useEstate();

  const [isCSVModalOpen, setIsCSVModalOpen] = useState<boolean>(false);

  const latestPrice = latestPrediction?.predicted_price || 8520000;
  const bestR2 = Math.max(
    modelMetrics.linear_regression.r2Score,
    modelMetrics.decision_tree.r2Score
  );

  return (
    <div className="space-y-14 pb-12">
      {/* SECTION 1: 3D HERO EXPERIENCE (Matching Reference Mockup Top-Left) */}
      <section className="pt-6 sm:pt-10 max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left Column: Hero Copy, Buttons & 3 Key Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="lg:col-span-5 space-y-7"
          >
            <div className="space-y-5">
              {/* Outlined Coral Kicker Tag */}
              <div className="inline-flex items-center px-3.5 py-1 rounded-full bg-[#FF632B]/8 border border-[#FF632B]/40 text-xs font-semibold text-[#FF632B]">
                AI-Powered Real Estate Valuation
              </div>

              <h1
                className="text-4xl sm:text-5xl lg:text-[52px] font-extrabold tracking-tight text-[#11151C] dark:text-[#F1F5F9] leading-[1.1] font-display"
                style={{ textWrap: 'balance' }}
              >
                Discover the True Value of{' '}
                <span className="text-[#FF632B]">Every</span> Property.
              </h1>

              <p className="text-sm sm:text-base text-[#5E6D82] dark:text-[#94A3B8] leading-relaxed max-w-lg">
                Unlock intelligent property valuations with machine learning. Analyze property
                characteristics and receive instant AI-powered price estimates.
              </p>

              {/* Primary Coral Button & Secondary Explore Analytics Button */}
              <div className="flex flex-wrap items-center gap-3.5 pt-1">
                <button
                  type="button"
                  onClick={() => navigate('/predict')}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#FF7A45] to-[#FF5520] hover:from-[#FF632B] hover:to-[#E84310] transition-all shadow-lg shadow-[#FF632B]/25 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Predict Price</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/analytics')}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-[#11151C] dark:text-[#F1F5F9] bg-white dark:bg-[#181E27] border border-slate-300 dark:border-[#78879B]/40 hover:border-[#FF632B] transition-colors whitespace-nowrap shrink-0 shadow-sm cursor-pointer"
                >
                  <BarChart2 className="w-4 h-4 text-[#11151C] dark:text-white" />
                  <span>Explore Analytics</span>
                </button>
              </div>
            </div>

            {/* Bottom 3 Stat Counters matching Reference Mockup (545 Property Records, 2 ML Models, 12 Property Features) */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-200/90 dark:border-[#78879B]/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FF632B]/10 flex items-center justify-center shrink-0">
                  <Database className="w-5 h-5 text-[#FF632B]" />
                </div>
                <div>
                  <div className="text-xl font-extrabold font-mono tabular-nums text-[#11151C] dark:text-white">
                    {analytics.totalRecords}
                  </div>
                  <div className="text-xs text-[#5E6D82] dark:text-[#94A3B8]">
                    Property Records
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FF632B]/10 flex items-center justify-center shrink-0">
                  <GitBranch className="w-5 h-5 text-[#FF632B]" />
                </div>
                <div>
                  <div className="text-xl font-extrabold font-mono tabular-nums text-[#11151C] dark:text-white">
                    2
                  </div>
                  <div className="text-xs text-[#5E6D82] dark:text-[#94A3B8]">
                    ML Models
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FF632B]/10 flex items-center justify-center shrink-0">
                  <Sliders className="w-5 h-5 text-[#FF632B]" />
                </div>
                <div>
                  <div className="text-xl font-extrabold font-mono tabular-nums text-[#11151C] dark:text-white">
                    12
                  </div>
                  <div className="text-xs text-[#5E6D82] dark:text-[#94A3B8]">
                    Property Features
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Photorealistic 3D Luxury House Model with Floating Glass Cards */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="lg:col-span-7"
          >
            <LuxuryHouseScene />
          </motion.div>
        </div>
      </section>

      {/* SECTION 2: DASHBOARD (Matching Reference Mockup Bottom-Left) */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#11151C] dark:text-[#F1F5F9] font-display">
              Dashboard
            </h2>
            <p className="text-xs sm:text-sm text-[#5E6D82] dark:text-[#94A3B8] mt-0.5">
              Overview of your house price prediction system
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setIsCSVModalOpen(true)}
              data-testid="dashboard-import-csv-btn"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#181E27] border border-slate-200 dark:border-[#78879B]/30 text-xs font-semibold text-[#11151C] dark:text-white hover:border-[#FF632B] transition-colors shadow-sm cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-[#FF632B]" />
              <span>Import CSV</span>
            </button>

            <button
              type="button"
              onClick={() => exportHistoryCSV()}
              data-testid="dashboard-export-csv-btn"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#181E27] border border-slate-200 dark:border-[#78879B]/30 text-xs font-semibold text-[#11151C] dark:text-white hover:border-[#FF632B] transition-colors shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#FF632B]" />
              <span>Export History CSV</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/predict')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF7A45] to-[#FF5520] text-xs font-semibold text-white hover:from-[#FF632B] hover:to-[#E84310] transition-colors shadow-sm cursor-pointer"
            >
              + Quick Valuation
            </button>
          </div>
        </div>

        {/* 4 Dashboard KPI Cards (545 Total Records, 2 ML Models, Latest Prediction, Best R² Score) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div
            onClick={() => navigate('/analytics')}
            className="p-5 rounded-2xl bg-white dark:bg-[#181E27] border border-slate-200/90 dark:border-[#78879B]/25 shadow-[0_8px_30px_rgb(15,23,42,0.04)] flex items-center gap-4 cursor-pointer hover:border-[#FF632B]/50 transition-all"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#FF632B]/10 flex items-center justify-center shrink-0">
              <Database className="w-6 h-6 text-[#FF632B]" />
            </div>
            <div>
              <div className="text-2xl font-extrabold font-mono tabular-nums text-[#11151C] dark:text-white">
                {formatNumber(analytics.totalRecords)}
              </div>
              <div className="text-xs text-[#5E6D82] dark:text-[#94A3B8]">Total Records</div>
            </div>
          </div>

          <div
            onClick={() => navigate('/insights')}
            className="p-5 rounded-2xl bg-white dark:bg-[#181E27] border border-slate-200/90 dark:border-[#78879B]/25 shadow-[0_8px_30px_rgb(15,23,42,0.04)] flex items-center gap-4 cursor-pointer hover:border-[#FF632B]/50 transition-all"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#FF632B]/10 flex items-center justify-center shrink-0">
              <Layers className="w-6 h-6 text-[#FF632B]" />
            </div>
            <div>
              <div className="text-2xl font-extrabold font-mono tabular-nums text-[#11151C] dark:text-white">
                2
              </div>
              <div className="text-xs text-[#5E6D82] dark:text-[#94A3B8]">ML Models</div>
            </div>
          </div>

          <div
            onClick={() => navigate('/results')}
            className="p-5 rounded-2xl bg-white dark:bg-[#181E27] border border-slate-200/90 dark:border-[#78879B]/25 shadow-[0_8px_30px_rgb(15,23,42,0.04)] flex items-center gap-4 cursor-pointer hover:border-[#FF632B]/50 transition-all"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#FF632B]/10 flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6 text-[#FF632B]" />
            </div>
            <div>
              <div className="text-2xl font-extrabold font-mono tabular-nums text-[#11151C] dark:text-white">
                {formatCurrency(latestPrice, currency, true)}
              </div>
              <div className="text-xs text-[#5E6D82] dark:text-[#94A3B8]">
                Latest Prediction
              </div>
            </div>
          </div>

          <div
            onClick={() => navigate('/insights')}
            className="p-5 rounded-2xl bg-white dark:bg-[#181E27] border border-slate-200/90 dark:border-[#78879B]/25 shadow-[0_8px_30px_rgb(15,23,42,0.04)] flex items-center gap-4 cursor-pointer hover:border-[#FF632B]/50 transition-all"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#FF632B]/10 flex items-center justify-center shrink-0">
              <Trophy className="w-6 h-6 text-[#FF632B]" />
            </div>
            <div>
              <div className="text-2xl font-extrabold font-mono tabular-nums text-[#11151C] dark:text-white">
                {bestR2.toFixed(2)}
              </div>
              <div className="text-xs text-[#5E6D82] dark:text-[#94A3B8]">Best R² Score</div>
            </div>
          </div>
        </div>

        {/* Middle Row: Price Distribution Histogram & Model Performance Bars */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Price Distribution */}
          <div className="lg:col-span-7 p-6 rounded-2xl bg-white dark:bg-[#181E27] border border-slate-200/90 dark:border-[#78879B]/25 shadow-[0_8px_30px_rgb(15,23,42,0.04)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-[#11151C] dark:text-[#F1F5F9] font-display">
                Price Distribution
              </h3>
              <span className="text-xs text-[#5E6D82] dark:text-[#94A3B8]">
                Housing.csv ({analytics.totalRecords} Properties)
              </span>
            </div>

            <div className="h-[230px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics.priceDistribution}
                  margin={{ top: 10, right: 12, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="coralBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FF632B" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#FF9E7D" stopOpacity={0.55} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(120, 135, 155, 0.16)" />
                  <XAxis
                    dataKey="range"
                    tick={{ fill: '#64748B', fontSize: 11 }}
                    axisLine={{ stroke: 'rgba(120, 135, 155, 0.25)' }}
                  />
                  <YAxis
                    tick={{ fill: '#64748B', fontSize: 11 }}
                    axisLine={{ stroke: 'rgba(120, 135, 155, 0.25)' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#181E27',
                      borderColor: '#78879B',
                      borderRadius: '10px',
                      color: '#F1F5F9',
                      fontSize: '12px',
                    }}
                    formatter={(value) => [`${Number(value ?? 0)} Properties`, 'Count']}
                  />
                  <Bar
                    dataKey="count"
                    fill="url(#coralBarGrad)"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Model Performance Horizontal Bars (Coral Orange vs Midnight Charcoal) */}
          <div className="lg:col-span-5 p-6 rounded-2xl bg-white dark:bg-[#181E27] border border-slate-200/90 dark:border-[#78879B]/25 shadow-[0_8px_30px_rgb(15,23,42,0.04)] flex flex-col justify-between space-y-6">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-[#11151C] dark:text-[#F1F5F9] font-display">
                  Model Performance
                </h3>
                <button
                  type="button"
                  onClick={() => navigate('/insights')}
                  className="text-xs font-semibold text-[#FF632B] hover:underline"
                >
                  Details →
                </button>
              </div>

              {/* Linear Regression Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#11151C] dark:text-slate-200">
                    Linear Regression
                  </span>
                  <span className="font-mono font-bold text-[#11151C] dark:text-white">
                    R²: {modelMetrics.linear_regression.r2Score.toFixed(2)}
                  </span>
                </div>
                <div className="w-full h-4 rounded-full bg-slate-100 dark:bg-[#11151C] overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#FF9466] to-[#FF5520] transition-all duration-500"
                    style={{
                      width: `${Math.round(modelMetrics.linear_regression.r2Score * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Decision Tree Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#11151C] dark:text-slate-200">
                    Decision Tree
                  </span>
                  <span className="font-mono font-bold text-[#11151C] dark:text-white">
                    R²: {modelMetrics.decision_tree.r2Score.toFixed(2)}
                  </span>
                </div>
                <div className="w-full h-4 rounded-full bg-slate-100 dark:bg-[#11151C] overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#64748B] to-[#1E293B] transition-all duration-500"
                    style={{
                      width: `${Math.round(modelMetrics.decision_tree.r2Score * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200/80 dark:border-[#78879B]/20 flex items-center justify-between text-xs text-[#5E6D82] dark:text-[#94A3B8]">
              <span>80/20 Held-Out Evaluation</span>
              <span className="font-mono">
                RMSE: {formatCurrency(modelMetrics.linear_regression.rmse, currency, true)}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Row: Recent Predictions Table & Feature Importance Bars */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Recent Predictions Table */}
          <div className="lg:col-span-7 p-6 rounded-2xl bg-white dark:bg-[#181E27] border border-slate-200/90 dark:border-[#78879B]/25 shadow-[0_8px_30px_rgb(15,23,42,0.04)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-[#11151C] dark:text-[#F1F5F9] font-display">
                Recent Predictions
              </h3>
              <button
                type="button"
                onClick={() => navigate('/history')}
                className="text-xs font-semibold text-[#FF632B] hover:underline inline-flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-[#78879B]/20 text-[#5E6D82] dark:text-[#94A3B8]">
                    <th className="py-2.5 pr-3 font-semibold">#</th>
                    <th className="py-2.5 px-3 font-semibold">Area (sq.ft.)</th>
                    <th className="py-2.5 px-3 font-semibold">Bedrooms</th>
                    <th className="py-2.5 px-3 font-semibold">Model</th>
                    <th className="py-2.5 px-3 font-semibold">Predicted Price</th>
                    <th className="py-2.5 pl-3 font-semibold text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-[#78879B]/20">
                  {history.slice(0, 4).map((item, idx) => (
                    <tr
                      key={item.id}
                      onClick={() => {
                        loadHistoryItemIntoResults(item);
                        navigate('/results');
                      }}
                      className="hover:bg-slate-50 dark:hover:bg-[#11151C]/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 pr-3 font-mono text-[#78879B]">{idx + 1}</td>
                      <td className="py-3 px-3 font-mono font-semibold text-[#11151C] dark:text-white">
                        {formatNumber(item.inputs.area)}
                      </td>
                      <td className="py-3 px-3 font-mono text-[#11151C] dark:text-slate-200">
                        {item.inputs.bedrooms}
                      </td>
                      <td className="py-3 px-3 font-medium text-[#11151C] dark:text-slate-200">
                        {item.primaryModel === 'linear_regression'
                          ? 'Linear Regression'
                          : 'Decision Tree'}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-[#FF632B]">
                        {formatCurrency(item.primaryPrice, currency, true)}
                      </td>
                      <td className="py-3 pl-3 text-right text-[#5E6D82] dark:text-[#94A3B8] whitespace-nowrap">
                        {formatDateShort(item.timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Feature Importance (Decision Tree) */}
          <div className="lg:col-span-5 p-6 rounded-2xl bg-white dark:bg-[#181E27] border border-slate-200/90 dark:border-[#78879B]/25 shadow-[0_8px_30px_rgb(15,23,42,0.04)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-[#11151C] dark:text-[#F1F5F9] font-display">
                Feature Importance{' '}
                <span className="font-normal text-xs text-[#5E6D82] dark:text-[#94A3B8]">
                  (Decision Tree)
                </span>
              </h3>
            </div>

            <div className="space-y-3 pt-1">
              {featureImportance.slice(0, 5).map((feat) => {
                const pct = Math.max(8, Math.round(feat.decisionTreeImportance * 100));
                return (
                  <div key={feat.feature} className="grid grid-cols-12 items-center gap-3 text-xs">
                    <div className="col-span-4 font-medium text-[#11151C] dark:text-slate-200 truncate">
                      {feat.label.replace('Property ', '').replace(' (sq ft)', '')}
                    </div>
                    <div className="col-span-6 h-3 rounded-full bg-slate-100 dark:bg-[#11151C] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#FF9E7D] to-[#FF5520]"
                        style={{ width: `${Math.min(100, pct * 1.8)}%` }}
                      />
                    </div>
                    <div className="col-span-2 text-right font-mono font-bold text-[#11151C] dark:text-white">
                      {feat.decisionTreeImportance.toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <CSVImportModal
        isOpen={isCSVModalOpen}
        onClose={() => setIsCSVModalOpen(false)}
        onSelectSingleProperty={() => navigate('/predict')}
        onBatchImported={(count) => {
          if (count === 1) {
            navigate('/results');
          } else {
            navigate('/history');
          }
        }}
      />
    </div>
  );
};
