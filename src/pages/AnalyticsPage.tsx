import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ScatterChart,
  Scatter,
  Legend,
  Cell,
} from 'recharts';
import { Filter, RotateCcw } from 'lucide-react';
import { useEstate } from '../context/EstateContext';
import { HOUSING_DATASET } from '../data/housingData';
import { FurnishingStatus } from '../types/estate';
import { formatCurrency, formatNumber } from '../utils/formatters';

export const AnalyticsPage: React.FC = () => {
  const { analytics, featureImportance, modelMetrics, currency } = useEstate();

  // Interactive Dataset Filters
  const [furnishingFilter, setFurnishingFilter] = useState<'all' | FurnishingStatus>('all');
  const [acFilter, setAcFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [prefAreaFilter, setPrefAreaFilter] = useState<'all' | 'yes' | 'no'>('all');

  const filteredRecords = useMemo(() => {
    return HOUSING_DATASET.filter((r) => {
      if (furnishingFilter !== 'all' && r.furnishingstatus !== furnishingFilter) return false;
      if (acFilter !== 'all' && r.airconditioning !== acFilter) return false;
      if (prefAreaFilter !== 'all' && r.prefarea !== prefAreaFilter) return false;
      return true;
    });
  }, [furnishingFilter, acFilter, prefAreaFilter]);

  // Dynamic distributions derived from filteredRecords
  const dynamicStats = useMemo(() => {
    const count = filteredRecords.length || 1;
    const meanPrice = Math.round(
      filteredRecords.reduce((acc, r) => acc + r.price, 0) / count
    );
    const meanArea = Math.round(
      filteredRecords.reduce((acc, r) => acc + r.area, 0) / count
    );

    const priceBuckets = [
      { range: '1.75M - 3.5M', min: 1750000, max: 3500000 },
      { range: '3.5M - 5.0M', min: 3500000, max: 5000000 },
      { range: '5.0M - 6.5M', min: 5000000, max: 6500000 },
      { range: '6.5M - 8.0M', min: 6500000, max: 8000000 },
      { range: '8.0M - 10.0M', min: 8000000, max: 10000000 },
      { range: '10.0M - 13.5M', min: 10000000, max: 14000000 },
    ].map((b) => ({
      range: b.range,
      count: filteredRecords.filter((r) => r.price >= b.min && r.price < b.max).length,
    }));

    const bedroomDist = [1, 2, 3, 4, 5]
      .map((b) => {
        const sub = filteredRecords.filter((r) => r.bedrooms === b);
        return {
          bedrooms: `${b} ${b === 1 ? 'Bed' : 'Beds'}`,
          count: sub.length,
          avgPrice: sub.length
            ? Math.round(sub.reduce((s, r) => s + r.price, 0) / sub.length)
            : 0,
        };
      })
      .filter((d) => d.count > 0);

    const bathroomDist = [1, 2, 3, 4]
      .map((b) => {
        const sub = filteredRecords.filter((r) => r.bathrooms === b);
        return {
          bathrooms: `${b} ${b === 1 ? 'Bath' : 'Baths'}`,
          count: sub.length,
          avgPrice: sub.length
            ? Math.round(sub.reduce((s, r) => s + r.price, 0) / sub.length)
            : 0,
        };
      })
      .filter((d) => d.count > 0);

    const furnishingDist = (['furnished', 'semi-furnished', 'unfurnished'] as const).map(
      (st) => {
        const sub = filteredRecords.filter((r) => r.furnishingstatus === st);
        return {
          status:
            st === 'furnished'
              ? 'Furnished'
              : st === 'semi-furnished'
              ? 'Semi-Furnished'
              : 'Unfurnished',
          count: sub.length,
          avgPrice: sub.length
            ? Math.round(sub.reduce((s, r) => s + r.price, 0) / sub.length)
            : 0,
        };
      }
    );

    const parkingDist = [0, 1, 2, 3].map((p) => {
      const sub = filteredRecords.filter((r) => r.parking === p);
      return {
        parking: `${p} ${p === 1 ? 'Space' : 'Spaces'}`,
        count: sub.length,
        avgPrice: sub.length
          ? Math.round(sub.reduce((s, r) => s + r.price, 0) / sub.length)
          : 0,
      };
    });

    return {
      total: filteredRecords.length,
      meanPrice,
      meanArea,
      priceBuckets,
      bedroomDist,
      bathroomDist,
      furnishingDist,
      parkingDist,
    };
  }, [filteredRecords]);

  const modelPerfChartData = [
    {
      metric: 'Linear Regression',
      r2Pct: Number((modelMetrics.linear_regression.r2Score * 100).toFixed(2)),
      rmseM: Number((modelMetrics.linear_regression.rmse / 1000000).toFixed(2)),
      maeM: Number((modelMetrics.linear_regression.mae / 1000000).toFixed(2)),
    },
    {
      metric: 'Decision Tree Regressor',
      r2Pct: Number((modelMetrics.decision_tree.r2Score * 100).toFixed(2)),
      rmseM: Number((modelMetrics.decision_tree.rmse / 1000000).toFixed(2)),
      maeM: Number((modelMetrics.decision_tree.mae / 1000000).toFixed(2)),
    },
  ];

  const resetFilters = () => {
    setFurnishingFilter('all');
    setAcFilter('all');
    setPrefAreaFilter('all');
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Interactive Dataset Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <div className="text-xs font-medium text-[#FF6B4A]">
            Housing.csv Exploratory Data Intelligence
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#11151C] dark:text-[#F1F5F9] mt-1 font-display">
            Comprehensive Property Dataset Analytics
          </h1>
          <p className="text-sm text-[#5E6D82] dark:text-[#94A3B8] mt-1">
            Analyzing {formatNumber(dynamicStats.total)} of {analytics.totalRecords} residential
            records · Mean Value: {formatCurrency(dynamicStats.meanPrice, currency, true)} · Mean
            Area: {formatNumber(dynamicStats.meanArea)} sq ft
          </p>
        </div>

        {/* Interactive Filter Bar */}
        <div className="flex flex-wrap items-center gap-2.5 p-3 rounded-xl bg-white dark:bg-[#181E27] border border-slate-200 dark:border-[#78879B]/25">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#11151C] dark:text-[#CBD5E1] mr-1">
            <Filter className="w-3.5 h-3.5 text-[#FF6B4A]" />
            <span>Filters:</span>
          </div>

          <select
            aria-label="Filter by furnishing status"
            value={furnishingFilter}
            onChange={(e) => setFurnishingFilter(e.target.value as 'all' | FurnishingStatus)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-[#11151C] border border-slate-200 dark:border-[#78879B]/30 text-[#11151C] dark:text-[#CBD5E1]"
          >
            <option value="all">All Furnishing Tiers</option>
            <option value="furnished">Furnished Only</option>
            <option value="semi-furnished">Semi-Furnished Only</option>
            <option value="unfurnished">Unfurnished Only</option>
          </select>

          <select
            aria-label="Filter by air conditioning"
            value={acFilter}
            onChange={(e) => setAcFilter(e.target.value as 'all' | 'yes' | 'no')}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-[#11151C] border border-slate-200 dark:border-[#78879B]/30 text-[#11151C] dark:text-[#CBD5E1]"
          >
            <option value="all">All HVAC (AC)</option>
            <option value="yes">With Air Conditioning</option>
            <option value="no">Without Air Conditioning</option>
          </select>

          <select
            aria-label="Filter by preferred area"
            value={prefAreaFilter}
            onChange={(e) => setPrefAreaFilter(e.target.value as 'all' | 'yes' | 'no')}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-[#11151C] border border-slate-200 dark:border-[#78879B]/30 text-[#11151C] dark:text-[#CBD5E1]"
          >
            <option value="all">All Locations</option>
            <option value="yes">Preferred Prime Area</option>
            <option value="no">Standard Area</option>
          </select>

          {(furnishingFilter !== 'all' || acFilter !== 'all' || prefAreaFilter !== 'all') && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#FF6B4A] hover:bg-slate-100 dark:hover:bg-[#11151C]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* ROW 1: 1. House Price Distribution & 2. Area vs Price Scatter Plot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. House Price Distribution */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#181E27] border border-slate-200 dark:border-[#78879B]/25 space-y-4">
          <div>
            <div className="text-xs font-medium text-[#FF6B4A]">
              01. Price Histogram
            </div>
            <h2 className="text-lg font-bold text-[#11151C] dark:text-[#F1F5F9] font-display">
              House Price Distribution
            </h2>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dynamicStats.priceBuckets}>
                <defs>
                  <linearGradient id="analyticsPriceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF6B4A" stopOpacity={0.65} />
                    <stop offset="95%" stopColor="#78879B" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120, 135, 155, 0.18)" />
                <XAxis dataKey="range" tick={{ fill: '#78879B', fontSize: 11 }} />
                <YAxis tick={{ fill: '#78879B', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#181E27',
                    borderColor: '#78879B',
                    borderRadius: '10px',
                    color: '#F1F5F9',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Properties"
                  stroke="#FF6B4A"
                  strokeWidth={2.5}
                  fill="url(#analyticsPriceGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Area vs Price Scatter Plot */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#181E27] border border-slate-200 dark:border-[#78879B]/25 space-y-4">
          <div>
            <div className="text-xs font-medium text-[#78879B]">
              02. Bivariate Elasticity
            </div>
            <h2 className="text-lg font-bold text-[#11151C] dark:text-[#F1F5F9] font-display">
              Area vs. Price Scatter Plot
            </h2>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120, 135, 155, 0.18)" />
                <XAxis
                  type="number"
                  dataKey="area"
                  name="Area"
                  unit=" sq ft"
                  tick={{ fill: '#78879B', fontSize: 11 }}
                />
                <YAxis
                  type="number"
                  dataKey="price"
                  name="Price"
                  tick={{ fill: '#78879B', fontSize: 11 }}
                  tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#181E27',
                    borderColor: '#78879B',
                    borderRadius: '10px',
                    color: '#F1F5F9',
                    fontSize: '12px',
                  }}
                  formatter={(value, name) =>
                    name === 'Price'
                      ? formatCurrency(Number(value ?? 0), currency)
                      : `${Number(value ?? 0)} sq ft`
                  }
                />
                <Scatter
                  name="Residential Properties"
                  data={filteredRecords.slice(0, 220)}
                  fill="#FF6B4A"
                  fillOpacity={0.68}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ROW 2: 3. Bedroom Distribution, 4. Bathroom Distribution, 5. Furnishing Status Distribution, 6. Parking Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 3. Bedroom Distribution */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#181E27] border border-slate-200 dark:border-[#78879B]/25 space-y-4">
          <div>
            <div className="text-xs font-medium text-[#FF6B4A]">
              03. Room Typology
            </div>
            <h2 className="text-lg font-bold text-[#11151C] dark:text-[#F1F5F9] font-display">
              Bedroom Distribution & Mean Price
            </h2>
          </div>

          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dynamicStats.bedroomDist}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120, 135, 155, 0.18)" />
                <XAxis dataKey="bedrooms" tick={{ fill: '#78879B', fontSize: 11 }} />
                <YAxis tick={{ fill: '#78879B', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#181E27',
                    borderColor: '#78879B',
                    borderRadius: '10px',
                    color: '#F1F5F9',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" name="Property Count" fill="#FF6B4A" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Bathroom Distribution */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#181E27] border border-slate-200 dark:border-[#78879B]/25 space-y-4">
          <div>
            <div className="text-xs font-medium text-[#78879B]">
              04. Sanitary Infrastructure
            </div>
            <h2 className="text-lg font-bold text-[#11151C] dark:text-[#F1F5F9] font-display">
              Bathroom Distribution
            </h2>
          </div>

          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dynamicStats.bathroomDist}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120, 135, 155, 0.18)" />
                <XAxis dataKey="bathrooms" tick={{ fill: '#78879B', fontSize: 11 }} />
                <YAxis tick={{ fill: '#78879B', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#181E27',
                    borderColor: '#78879B',
                    borderRadius: '10px',
                    color: '#F1F5F9',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" name="Property Count" fill="#78879B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 5. Furnishing Status Distribution */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#181E27] border border-slate-200 dark:border-[#78879B]/25 space-y-4">
          <div>
            <div className="text-xs font-medium text-[#FF6B4A]">
              05. Interior Fit-Out
            </div>
            <h2 className="text-lg font-bold text-[#11151C] dark:text-[#F1F5F9] font-display">
              Furnishing Status Distribution
            </h2>
          </div>

          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dynamicStats.furnishingDist}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120, 135, 155, 0.18)" />
                <XAxis dataKey="status" tick={{ fill: '#78879B', fontSize: 11 }} />
                <YAxis tick={{ fill: '#78879B', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#181E27',
                    borderColor: '#78879B',
                    borderRadius: '10px',
                    color: '#F1F5F9',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" name="Property Count" radius={[6, 6, 0, 0]}>
                  {dynamicStats.furnishingDist.map((_, idx) => (
                    <Cell
                      key={idx}
                      fill={idx === 0 ? '#FF6B4A' : idx === 1 ? '#78879B' : '#5E6D82'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 6. Parking Distribution */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#181E27] border border-slate-200 dark:border-[#78879B]/25 space-y-4">
          <div>
            <div className="text-xs font-medium text-[#78879B]">
              06. Garage Capacity
            </div>
            <h2 className="text-lg font-bold text-[#11151C] dark:text-[#F1F5F9] font-display">
              Parking Spaces Distribution
            </h2>
          </div>

          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dynamicStats.parkingDist}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120, 135, 155, 0.18)" />
                <XAxis dataKey="parking" tick={{ fill: '#78879B', fontSize: 11 }} />
                <YAxis tick={{ fill: '#78879B', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#181E27',
                    borderColor: '#78879B',
                    borderRadius: '10px',
                    color: '#F1F5F9',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" name="Property Count" fill="#FF6B4A" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ROW 3: 7. Numerical Feature Correlation Heatmap */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#181E27] border border-slate-200 dark:border-[#78879B]/25 space-y-5">
        <div>
          <div className="text-xs font-medium text-[#FF6B4A]">
            07. Pearson Correlation Matrix
          </div>
          <h2 className="text-lg font-bold text-[#11151C] dark:text-[#F1F5F9] font-display">
            Numerical Feature Correlation Heatmap (Housing.csv)
          </h2>
          <p className="text-xs text-[#5E6D82] dark:text-[#94A3B8] mt-0.5">
            Pairwise Pearson correlation coefficients (r) across continuous and ordinal housing
            variables.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs font-mono tabular-nums">
            <thead>
              <tr>
                <th className="p-3 text-left font-sans font-semibold text-[#5E6D82] dark:text-[#94A3B8]">
                  Feature
                </th>
                {analytics.correlationMatrix.features.map((feat) => (
                  <th
                    key={feat}
                    className="p-3 text-center font-sans font-semibold text-[#11151C] dark:text-slate-200"
                  >
                    {feat}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {analytics.correlationMatrix.matrix.map((row, rIdx) => {
                const rowName = analytics.correlationMatrix.features[rIdx];
                return (
                  <tr
                    key={rowName}
                    className="border-t border-slate-200/70 dark:border-[#78879B]/20"
                  >
                    <td className="p-3 font-sans font-semibold text-[#11151C] dark:text-slate-200">
                      {rowName}
                    </td>
                    {row.map((val, cIdx) => {
                      const intensity = Math.abs(val);
                      const bgStyle =
                        val === 1
                          ? 'rgba(255, 107, 74, 0.42)'
                          : val > 0.45
                          ? 'rgba(255, 107, 74, 0.24)'
                          : val > 0.25
                          ? 'rgba(120, 135, 155, 0.22)'
                          : 'rgba(120, 135, 155, 0.08)';
                      return (
                        <td
                          key={cIdx}
                          style={{ backgroundColor: bgStyle }}
                          className="p-3 text-center font-semibold text-[#11151C] dark:text-white rounded"
                          title={`${rowName} vs ${analytics.correlationMatrix.features[cIdx]}: r = ${val.toFixed(2)} (strength ${(intensity * 100).toFixed(0)}%)`}
                        >
                          {val.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ROW 4: 8. Decision Tree Feature Importance & 9. ML Model Performance Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 8. Decision Tree Feature Importance */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-white dark:bg-[#181E27] border border-slate-200 dark:border-[#78879B]/25 space-y-4">
          <div>
            <div className="text-xs font-medium text-[#FF6B4A]">
              08. Variance Reduction Split Weights
            </div>
            <h2 className="text-lg font-bold text-[#11151C] dark:text-[#F1F5F9] font-display">
              Decision Tree Feature Importance (All 13 model_columns.pkl Features)
            </h2>
          </div>

          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={featureImportance}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120, 135, 155, 0.18)" />
                <XAxis
                  type="number"
                  tick={{ fill: '#78879B', fontSize: 11 }}
                  tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                />
                <YAxis
                  dataKey="label"
                  type="category"
                  width={155}
                  tick={{ fill: '#78879B', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#181E27',
                    borderColor: '#78879B',
                    borderRadius: '10px',
                    color: '#F1F5F9',
                    fontSize: '12px',
                  }}
                  formatter={(v) => `${(Number(v ?? 0) * 100).toFixed(2)}%`}
                />
                <Bar
                  dataKey="decisionTreeImportance"
                  name="Decision Tree Importance"
                  fill="#FF6B4A"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 9. ML Model Performance Comparison */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-white dark:bg-[#181E27] border border-slate-200 dark:border-[#78879B]/25 flex flex-col justify-between space-y-4">
          <div>
            <div className="text-xs font-medium text-[#78879B]">
              09. Held-Out Test Set Evaluation
            </div>
            <h2 className="text-lg font-bold text-[#11151C] dark:text-[#F1F5F9] font-display">
              ML Model Performance Comparison
            </h2>
          </div>

          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={modelPerfChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120, 135, 155, 0.18)" />
                <XAxis dataKey="metric" tick={{ fill: '#78879B', fontSize: 11 }} />
                <YAxis tick={{ fill: '#78879B', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#181E27',
                    borderColor: '#78879B',
                    borderRadius: '10px',
                    color: '#F1F5F9',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar
                  dataKey="r2Pct"
                  name="R² Score (%)"
                  fill="#FF6B4A"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="rmseM"
                  name="RMSE (Million BDT)"
                  fill="#78879B"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#11151C] border border-slate-200 dark:border-[#78879B]/25 text-xs text-[#5E6D82] dark:text-[#94A3B8] space-y-1.5">
            <div className="font-semibold text-[#11151C] dark:text-white">
              Consistent 80/20 Evaluation Methodology
            </div>
            <p>
              Both models are evaluated on the exact same 109-property held-out test partition
              (436 training properties) encoded with the 13 columns of{' '}
              <code className="font-mono text-[#FF6B4A]">
                model_columns.pkl
              </code>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
