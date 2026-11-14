import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight,
  Bath,
  Bed,
  Car,
  Download,
  Home,
  Info,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  Legend,
} from 'recharts';
import { motion } from 'motion/react';
import { useEstate } from '../context/EstateContext';
import { formatCurrency, formatDateShort, formatNumber } from '../utils/formatters';
import { LuxuryHouseScene } from '../components/three/LuxuryHouseScene';

/**
 * Animated numerical counter for the predicted property valuation
 */
const AnimatedPriceCounter: React.FC<{ value: number; currency: 'BDT' | 'USD' }> = ({
  value,
  currency,
}) => {
  const [displayValue, setDisplayValue] = useState<number>(Math.round(value * 0.72));

  useEffect(() => {
    const start = Math.round(value * 0.75);
    const end = value;
    const duration = 650;
    const startTime = performance.now();
    let rafId = 0;

    const step = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.round(start + (end - start) * eased);
      setDisplayValue(current);
      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [value]);

  return <span>{formatCurrency(displayValue, currency, false)}</span>;
};

export const ResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    latestPrediction,
    comparisonPrediction,
    isQuickCompareEnabled,
    isComparing,
    toggleQuickCompare,
    swapComparedModels,
    currentInputs,
    currency,
    modelMetrics,
    addToast,
  } = useEstate();

  if (!latestPrediction) {
    return (
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold text-[#11151C] dark:text-white font-display">
          No Active Property Valuation
        </h1>
        <p className="text-sm text-[#5E6D82] dark:text-[#94A3B8]">
          Configure a property in the prediction studio to generate an AI valuation.
        </p>
        <button
          type="button"
          onClick={() => navigate('/predict')}
          className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#FF632B]"
        >
          Go to Prediction Studio
        </button>
      </div>
    );
  }

  const primaryModelName =
    latestPrediction.model === 'linear_regression' ? 'Linear Regression' : 'Decision Tree';

  const altModelKey =
    latestPrediction.model === 'linear_regression' ? 'decision_tree' : 'linear_regression';
  const altModelName =
    altModelKey === 'linear_regression' ? 'Linear Regression' : 'Decision Tree';

  const primaryMetric = modelMetrics[latestPrediction.model];
  const altMetric = modelMetrics[altModelKey];
  const hasBothEvaluated = Boolean(isQuickCompareEnabled && comparisonPrediction);

  const linearPrice =
    latestPrediction.model === 'linear_regression'
      ? latestPrediction.predicted_price
      : comparisonPrediction?.predicted_price || 0;

  const treePrice =
    latestPrediction.model === 'decision_tree'
      ? latestPrediction.predicted_price
      : comparisonPrediction?.predicted_price || 0;

  const maxModelPrice = Math.max(linearPrice, treePrice, 1);

  const priceDelta = hasBothEvaluated
    ? comparisonPrediction!.predicted_price - latestPrediction.predicted_price
    : 0;
  const priceDeltaPct = hasBothEvaluated
    ? Math.abs((priceDelta / latestPrediction.predicted_price) * 100).toFixed(1)
    : '0.0';

  // Build side-by-side feature contribution dataset when Quick Compare is active
  const combinedFeatureData = useMemo(() => {
    const primaryContribs = latestPrediction.feature_contributions.slice(0, 7);
    if (!hasBothEvaluated || !comparisonPrediction) {
      return primaryContribs.map((item) => ({
        feature: item.feature,
        label: item.label,
        impact: item.impact,
        primaryImpact: item.impact,
        altImpact: 0,
      }));
    }

    const altMap = new Map(
      comparisonPrediction.feature_contributions.map((c) => [c.feature, c.impact])
    );

    return primaryContribs.map((item) => ({
      feature: item.feature,
      label: item.label,
      impact: item.impact,
      primaryImpact: item.impact,
      altImpact: altMap.get(item.feature) ?? 0,
    }));
  }, [latestPrediction, hasBothEvaluated, comparisonPrediction]);

  const handleDownloadReport = () => {
    const reportLines = [
      '====================================================================',
      'ESTATIQ AI — INTELLIGENT PROPERTY VALUATION REPORT',
      'Predict Smarter. Invest Better.',
      '====================================================================',
      `Generated Timestamp : ${latestPrediction.timestamp}`,
      `Primary ML Model    : ${primaryModelName} (${latestPrediction.model})`,
      `Estimated Value     : ${formatCurrency(latestPrediction.predicted_price, currency)}`,
      `Confidence Interval : ${formatCurrency(
        latestPrediction.confidence_interval.low,
        currency
      )} to ${formatCurrency(latestPrediction.confidence_interval.high, currency)}`,
      `Model Test R² Score : ${(primaryMetric.r2Score * 100).toFixed(2)}% (RMSE: ${formatCurrency(
        primaryMetric.rmse,
        currency
      )})`,
      '',
      ...(hasBothEvaluated && comparisonPrediction
        ? [
            '--- QUICK COMPARE: SIDE-BY-SIDE ALTERNATIVE MODEL EVALUATION ---',
            `Alternative Model   : ${altModelName} (${comparisonPrediction.model})`,
            `Alternative Value   : ${formatCurrency(comparisonPrediction.predicted_price, currency)}`,
            `Valuation Delta     : ${priceDelta >= 0 ? '+' : ''}${formatCurrency(
              priceDelta,
              currency
            )} (≈ ${priceDeltaPct}% difference)`,
            '',
          ]
        : []),
      '--- CONFIGURED PROPERTY CHARACTERISTICS ---',
      `Property Area       : ${formatNumber(currentInputs.area)} sq ft`,
      `Bedrooms            : ${currentInputs.bedrooms}`,
      `Bathrooms           : ${currentInputs.bathrooms}`,
      `Architectural Floors: ${currentInputs.stories}`,
      `Parking Spaces      : ${currentInputs.parking}`,
      `Furnishing Status   : ${currentInputs.furnishingstatus}`,
      `Main Road Access    : ${currentInputs.mainroad}`,
      `Guest Room          : ${currentInputs.guestroom}`,
      `Basement            : ${currentInputs.basement}`,
      `Hot Water Heating   : ${currentInputs.hotwaterheating}`,
      `Air Conditioning    : ${currentInputs.airconditioning}`,
      `Preferred Area      : ${currentInputs.prefarea}`,
      '',
      '--- ENCODED MODEL_COLUMNS.PKL VECTOR ---',
      JSON.stringify(latestPrediction.model_columns_encoding, null, 2),
      '',
      'DISCLAIMER: This machine learning valuation is a statistical estimate derived from',
      'historical residential property records (Housing.csv) and does not constitute a',
      'guaranteed market transaction price or formal legal appraisal.',
      '====================================================================',
    ];

    const blob = new Blob([reportLines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ESTATIQ_AI_Valuation_${currentInputs.area}sqft_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addToast(
      'Valuation Report Downloaded',
      'Saved detailed property valuation and model_columns.pkl report.',
      'success'
    );
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header Row matching Reference Mockup Middle-Right */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#11151C] dark:text-[#F1F5F9] font-display">
            Prediction Result
          </h1>
          <p className="text-xs text-[#5E6D82] dark:text-[#94A3B8] mt-0.5">
            Evaluated on {formatDateShort(latestPrediction.timestamp)} · Primary:{' '}
            <strong className="text-[#11151C] dark:text-white">{primaryModelName}</strong>
            {hasBothEvaluated && (
              <>
                {' '}
                vs. Alternative:{' '}
                <strong className="text-[#FF632B]">{altModelName}</strong>
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* QUICK COMPARE INTERACTIVE TOGGLE */}
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white dark:bg-[#181E27] border border-slate-200 dark:border-[#78879B]/30 shadow-sm">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-[#FF632B]" />
              <div className="text-left">
                <div className="text-xs font-bold text-[#11151C] dark:text-[#F1F5F9] whitespace-nowrap">
                  Quick Compare
                </div>
                <div className="text-[10px] text-[#5E6D82] dark:text-[#94A3B8] whitespace-nowrap">
                  {isQuickCompareEnabled
                    ? `Comparing with ${altModelName}`
                    : `Toggle to run ${altModelName}`}
                </div>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={isQuickCompareEnabled}
              aria-label={`Quick Compare with ${altModelName}`}
              disabled={isComparing}
              onClick={() => toggleQuickCompare()}
              data-testid="quick-compare-toggle"
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isQuickCompareEnabled ? 'bg-[#FF632B]' : 'bg-slate-300 dark:bg-[#78879B]/40'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isQuickCompareEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>

            {hasBothEvaluated && (
              <button
                type="button"
                disabled={isComparing}
                onClick={() => toggleQuickCompare(true, true)}
                title={`Re-run ${altModelName} against current inputs`}
                className="p-1.5 rounded-lg text-[#5E6D82] dark:text-[#94A3B8] hover:text-[#FF632B] hover:bg-slate-100 dark:hover:bg-[#11151C] transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isComparing ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleDownloadReport}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#11151C] dark:text-white bg-white dark:bg-[#181E27] border border-slate-200 dark:border-[#78879B]/30 hover:border-[#FF632B] transition-colors whitespace-nowrap shrink-0 shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#5E6D82]" />
            <span>Download Report</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/predict')}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#FF7A45] to-[#FF5520] hover:from-[#FF632B] hover:to-[#E84310] transition-all whitespace-nowrap shrink-0 shadow-md shadow-[#FF632B]/25 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Prediction</span>
          </button>
        </div>
      </div>

      {/* Main Split Row matching Reference Mockup: Left Hero Result Card (8 cols) + Right Model Comparison Card (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Card: 3D House Model + Estimated Property Value (Single or Side-by-Side) + 5 Bottom Feature Icons */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-8 p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#181E27] border border-slate-200/90 dark:border-[#78879B]/25 shadow-[0_12px_40px_rgb(15,23,42,0.06)] flex flex-col justify-between space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Interactive 3D Luxury House Model on Left */}
            <div className="md:col-span-5">
              <LuxuryHouseScene compact />
            </div>

            {/* Valuation Price & Side-by-Side Comparison on Right */}
            <div className="md:col-span-7 space-y-4">
              {!hasBothEvaluated ? (
                <div className="space-y-3">
                  <div className="text-sm font-bold text-[#11151C] dark:text-slate-200">
                    Your Estimated Property Value
                  </div>

                  <div className="text-4xl sm:text-5xl font-extrabold font-mono tabular-nums text-[#FF632B]">
                    <AnimatedPriceCounter
                      value={latestPrediction.predicted_price}
                      currency={currency}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#11151C] text-xs font-medium text-[#5E6D82] dark:text-[#CBD5E1]">
                      Model:{' '}
                      <strong className="text-[#11151C] dark:text-white">
                        {primaryModelName}
                      </strong>
                    </div>

                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FF632B]/10 text-xs font-semibold text-[#FF632B]">
                      <ShieldCheck className="w-4 h-4" />
                      <span>R² Confidence: {Math.round(primaryMetric.r2Score * 100)}%</span>
                    </div>
                  </div>

                  <div className="text-xs font-mono text-[#78879B] pt-1">
                    Statistical Range:{' '}
                    {formatCurrency(latestPrediction.confidence_interval.low, currency, true)} –{' '}
                    {formatCurrency(latestPrediction.confidence_interval.high, currency, true)}
                  </div>
                </div>
              ) : (
                /* SIDE-BY-SIDE VALUATION CARDS WHEN QUICK COMPARE IS ACTIVE */
                <div className="space-y-3" data-testid="side-by-side-valuation-panel">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#FF632B]">
                      Side-by-Side Model Valuation
                    </span>
                    <button
                      type="button"
                      onClick={swapComparedModels}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-[#5E6D82] dark:text-[#CBD5E1] bg-slate-100 dark:bg-[#11151C] hover:text-[#FF632B] transition-colors cursor-pointer"
                    >
                      <ArrowLeftRight className="w-3 h-3" />
                      <span>Swap Primary</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Primary Model Valuation Box */}
                    <div className="p-4 rounded-2xl bg-[#FF632B]/8 border-2 border-[#FF632B] space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-[#FF632B] uppercase">Primary Model</span>
                        <span className="font-mono font-semibold text-[#5E6D82] dark:text-[#CBD5E1]">
                          R² {Math.round(primaryMetric.r2Score * 100)}%
                        </span>
                      </div>
                      <div className="text-xs font-bold text-[#11151C] dark:text-white">
                        {primaryModelName}
                      </div>
                      <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-[#FF632B]">
                        <AnimatedPriceCounter
                          value={latestPrediction.predicted_price}
                          currency={currency}
                        />
                      </div>
                      <div className="text-[11px] font-mono text-[#5E6D82] dark:text-[#94A3B8]">
                        Range:{' '}
                        {formatCurrency(latestPrediction.confidence_interval.low, currency, true)}{' '}
                        –{' '}
                        {formatCurrency(latestPrediction.confidence_interval.high, currency, true)}
                      </div>
                    </div>

                    {/* Alternative Model Valuation Box */}
                    <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#11151C] border border-slate-200 dark:border-[#78879B]/35 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-[#5E6D82] dark:text-[#94A3B8] uppercase">
                          Alternative Model
                        </span>
                        <span className="font-mono font-semibold text-[#5E6D82] dark:text-[#CBD5E1]">
                          R² {Math.round(altMetric.r2Score * 100)}%
                        </span>
                      </div>
                      <div className="text-xs font-bold text-[#11151C] dark:text-white">
                        {altModelName}
                      </div>
                      <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-[#11151C] dark:text-white">
                        <AnimatedPriceCounter
                          value={comparisonPrediction!.predicted_price}
                          currency={currency}
                        />
                      </div>
                      <div className="text-[11px] font-mono text-[#5E6D82] dark:text-[#94A3B8]">
                        Range:{' '}
                        {formatCurrency(
                          comparisonPrediction!.confidence_interval.low,
                          currency,
                          true
                        )}{' '}
                        –{' '}
                        {formatCurrency(
                          comparisonPrediction!.confidence_interval.high,
                          currency,
                          true
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Instant Valuation Variance Summary Bar */}
                  <div className="px-3.5 py-2.5 rounded-xl bg-slate-100/80 dark:bg-[#11151C] border border-slate-200/80 dark:border-[#78879B]/25 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-[#5E6D82] dark:text-[#94A3B8]">
                      Side-by-Side Valuation Variance:
                    </span>
                    <span className="font-mono font-bold text-[#11151C] dark:text-white">
                      {priceDelta >= 0 ? '+' : ''}
                      {formatCurrency(priceDelta, currency, false)}{' '}
                      <span className="text-[#FF632B]">(≈ {priceDeltaPct}% difference)</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom 5 Property Feature Summary Icons matching Reference Mockup */}
          <div className="pt-5 border-t border-slate-200/80 dark:border-[#78879B]/20 grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#11151C]">
              <div className="w-8 h-8 rounded-lg bg-[#FF632B]/10 flex items-center justify-center shrink-0">
                <Home className="w-4 h-4 text-[#FF632B]" />
              </div>
              <div>
                <div className="text-[11px] text-[#5E6D82] dark:text-[#94A3B8]">Area</div>
                <div className="text-xs font-bold font-mono text-[#11151C] dark:text-white">
                  {formatNumber(currentInputs.area)} sq.ft.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#11151C]">
              <div className="w-8 h-8 rounded-lg bg-[#FF632B]/10 flex items-center justify-center shrink-0">
                <Bed className="w-4 h-4 text-[#FF632B]" />
              </div>
              <div>
                <div className="text-[11px] text-[#5E6D82] dark:text-[#94A3B8]">Bedrooms</div>
                <div className="text-xs font-bold font-mono text-[#11151C] dark:text-white">
                  {currentInputs.bedrooms}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#11151C]">
              <div className="w-8 h-8 rounded-lg bg-[#FF632B]/10 flex items-center justify-center shrink-0">
                <Bath className="w-4 h-4 text-[#FF632B]" />
              </div>
              <div>
                <div className="text-[11px] text-[#5E6D82] dark:text-[#94A3B8]">Bathrooms</div>
                <div className="text-xs font-bold font-mono text-[#11151C] dark:text-white">
                  {currentInputs.bathrooms}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#11151C]">
              <div className="w-8 h-8 rounded-lg bg-[#FF632B]/10 flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4 text-[#FF632B]" />
              </div>
              <div>
                <div className="text-[11px] text-[#5E6D82] dark:text-[#94A3B8]">Stories</div>
                <div className="text-xs font-bold font-mono text-[#11151C] dark:text-white">
                  {currentInputs.stories}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#11151C]">
              <div className="w-8 h-8 rounded-lg bg-[#FF632B]/10 flex items-center justify-center shrink-0">
                <Car className="w-4 h-4 text-[#FF632B]" />
              </div>
              <div>
                <div className="text-[11px] text-[#5E6D82] dark:text-[#94A3B8]">Parking</div>
                <div className="text-xs font-bold font-mono text-[#11151C] dark:text-white">
                  {currentInputs.parking}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Card: Model Comparison Card matching Reference Mockup (Controlled by Quick Compare Toggle) */}
        <div className="lg:col-span-4 p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#181E27] border border-slate-200/90 dark:border-[#78879B]/25 shadow-[0_12px_40px_rgb(15,23,42,0.06)] flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-[#11151C] dark:text-[#F1F5F9] font-display">
                Model Comparison
              </h2>
              <span className="text-[11px] font-mono text-[#FF632B]">
                {hasBothEvaluated ? 'Quick Compare Active' : 'Single Model'}
              </span>
            </div>

            {isComparing ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-[#FF632B]" />
                <p className="text-xs text-[#5E6D82] dark:text-[#94A3B8]">
                  Evaluating {altModelName} on current property inputs...
                </p>
              </div>
            ) : hasBothEvaluated && comparisonPrediction ? (
              <div className="space-y-5 pt-2">
                {/* Decision Tree Comparison Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#11151C] dark:text-slate-200">
                      Decision Tree
                      {latestPrediction.model === 'decision_tree' ? ' (Primary)' : ' (Alt)'}
                    </span>
                    <span className="font-mono font-bold text-[#11151C] dark:text-white">
                      {formatCurrency(treePrice, currency, true)}
                    </span>
                  </div>
                  <div className="w-full h-3.5 rounded-full bg-slate-100 dark:bg-[#11151C] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#FF9466] to-[#FF5520] transition-all duration-500"
                      style={{ width: `${Math.round((treePrice / maxModelPrice) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Linear Regression Comparison Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#11151C] dark:text-slate-200">
                      Linear Regression
                      {latestPrediction.model === 'linear_regression' ? ' (Primary)' : ' (Alt)'}
                    </span>
                    <span className="font-mono font-bold text-[#11151C] dark:text-white">
                      {formatCurrency(linearPrice, currency, true)}
                    </span>
                  </div>
                  <div className="w-full h-3.5 rounded-full bg-slate-100 dark:bg-[#11151C] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#64748B] to-[#1E293B] transition-all duration-500"
                      style={{ width: `${Math.round((linearPrice / maxModelPrice) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Percentage Difference Shield Box matching Reference Mockup */}
                <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#11151C] border border-slate-200/80 dark:border-[#78879B]/25 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FF632B]/12 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4 text-[#FF632B]" />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-[#11151C] dark:text-white font-mono">
                      ≈ {priceDeltaPct}% difference (
                      {priceDelta >= 0 ? '+' : ''}
                      {formatCurrency(priceDelta, currency, true)})
                    </div>
                    <div className="text-[11px] text-[#5E6D82] dark:text-[#94A3B8] mt-0.5">
                      Both models evaluate the exact same 13-feature vector side-by-side.
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-[#F8FAFC] dark:bg-[#11151C] border border-slate-200/80 dark:border-[#78879B]/25 space-y-3">
                <p className="text-xs text-[#5E6D82] dark:text-[#94A3B8] leading-relaxed">
                  Enable <strong>Quick Compare</strong> to re-run your current property inputs
                  against <strong>{altModelName}</strong> and compare both models side-by-side.
                </p>
                <button
                  type="button"
                  onClick={() => toggleQuickCompare(true)}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#FF7A45] to-[#FF5520] hover:from-[#FF632B] hover:to-[#E84310] transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Run Quick Compare ({altModelName})</span>
                </button>
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-[11px] text-[#5E6D82] dark:text-[#CBD5E1]">
            <Info className="w-3.5 h-3.5 text-[#FF632B] shrink-0 mt-0.5" />
            <span>
              ML estimates are statistical valuations from Housing.csv, never a guaranteed market
              price.
            </span>
          </div>
        </div>
      </div>

      {/* Feature Contribution Breakdown Card (Upgrades to Side-by-Side Grouped Comparison when Quick Compare is ON) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#181E27] border border-slate-200/90 dark:border-[#78879B]/25 shadow-[0_12px_40px_rgb(15,23,42,0.06)] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-xs font-semibold text-[#FF632B]">
              {hasBothEvaluated
                ? `Side-by-Side Feature Attribution (${primaryModelName} vs. ${altModelName})`
                : 'Feature Attribution Breakdown'}
            </div>
            <h2 className="text-lg font-extrabold text-[#11151C] dark:text-[#F1F5F9] font-display">
              {hasBothEvaluated
                ? 'How Each Property Characteristic Shifts Both ML Models Side-by-Side'
                : 'How Each Property Characteristic Shifted This Estimate'}
            </h2>
          </div>
          <TrendingUp className="w-4 h-4 text-[#FF632B] shrink-0" />
        </div>

        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={combinedFeatureData}
              layout="vertical"
              margin={{ top: 5, right: 24, left: 36, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(120, 135, 155, 0.16)" />
              <XAxis
                type="number"
                tick={{ fill: '#64748B', fontSize: 11 }}
                tickFormatter={(v) => formatCurrency(v, currency, true)}
              />
              <YAxis
                dataKey="label"
                type="category"
                width={150}
                tick={{ fill: '#64748B', fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#181E27',
                  borderColor: '#78879B',
                  borderRadius: '10px',
                  color: '#F1F5F9',
                  fontSize: '12px',
                }}
                formatter={(val, name) => {
                  const num = Number(val ?? 0);
                  return [
                    `${num >= 0 ? '+' : ''}${formatCurrency(num, currency)}`,
                    String(name),
                  ];
                }}
              />
              {hasBothEvaluated ? (
                <>
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar
                    dataKey="primaryImpact"
                    name={primaryModelName}
                    fill="#FF632B"
                    radius={[0, 5, 5, 0]}
                  />
                  <Bar
                    dataKey="altImpact"
                    name={altModelName}
                    fill="#475569"
                    radius={[0, 5, 5, 0]}
                  />
                </>
              ) : (
                <Bar dataKey="impact" name={primaryModelName} radius={[0, 6, 6, 0]}>
                  {combinedFeatureData.map((entry, idx) => (
                    <Cell
                      key={`cell-${idx}`}
                      fill={entry.impact >= 0 ? '#FF632B' : '#64748B'}
                    />
                  ))}
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
