import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  AlertCircle,
  GitBranch,
  TrendingUp,
  ArrowRight,
  Sliders,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useEstate } from '../context/EstateContext';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { mlEngine, MODEL_COLUMNS } from '../services/mlEngine';

export const ModelInsightsPage: React.FC = () => {
  const navigate = useNavigate();
  const { modelMetrics, featureImportance, currency, setSelectedModel } = useEstate();

  const lin = modelMetrics.linear_regression;
  const tree = modelMetrics.decision_tree;

  const visualComparisonData = [
    {
      name: 'R² Score (%)',
      LinearRegression: Number((lin.r2Score * 100).toFixed(2)),
      DecisionTree: Number((tree.r2Score * 100).toFixed(2)),
    },
    {
      name: 'RMSE (in 100K BDT)',
      LinearRegression: Number((lin.rmse / 100000).toFixed(2)),
      DecisionTree: Number((tree.rmse / 100000).toFixed(2)),
    },
    {
      name: 'MAE (in 100K BDT)',
      LinearRegression: Number((lin.mae / 100000).toFixed(2)),
      DecisionTree: Number((tree.mae / 100000).toFixed(2)),
    },
  ];

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-[#FF6B4A]">
            Machine Learning Architecture & Evaluation
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#11151C] dark:text-[#F1F5F9] mt-1 font-display">
            Algorithmic Insights & Model Comparison
          </h1>
          <p className="text-sm text-[#5E6D82] dark:text-[#94A3B8] mt-1 max-w-2xl">
            Detailed mathematical breakdown of our trained regression artifacts (
            <code className="font-mono text-[#FF6B4A]">linear_model.pkl</code> and{' '}
            <code className="font-mono text-[#FF6B4A]">decision_tree_model.pkl</code>) evaluated on
            the 545-record Housing.csv dataset.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/predict')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#FF6B4A] hover:bg-[#E85838] transition-colors self-start md:self-auto whitespace-nowrap shrink-0"
        >
          <span>Test Models on a Property</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* SECTION 1: ACTUAL EVALUATION METRICS TABLE & VISUAL COMPARISON */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Evaluation Metrics Table */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-white dark:bg-[#181E27] border border-slate-200 dark:border-[#78879B]/25 flex flex-col justify-between space-y-6">
          <div>
            <div className="text-xs font-medium text-[#FF6B4A]">
              01. Empirical Evaluation Metrics
            </div>
            <h2 className="text-xl font-bold text-[#11151C] dark:text-[#F1F5F9] mt-0.5 font-display">
              R² Score, Mean Squared Error (MSE) & Root Mean Squared Error (RMSE)
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#78879B]/20 text-[#5E6D82] dark:text-[#94A3B8]">
                  <th className="py-3 pr-4 font-semibold">Evaluation Metric</th>
                  <th className="py-3 px-4 font-semibold text-right">
                    Linear Regression (linear_model.pkl)
                  </th>
                  <th className="py-3 pl-4 font-semibold text-right">
                    Decision Tree (decision_tree_model.pkl)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-[#78879B]/20 font-mono tabular-nums">
                <tr>
                  <td className="py-3.5 pr-4 font-sans font-semibold text-[#11151C] dark:text-white">
                    R² Score (Coefficient of Determination)
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-[#FF6B4A]">
                    {lin.r2Score.toFixed(4)} ({(lin.r2Score * 100).toFixed(2)}%)
                  </td>
                  <td className="py-3.5 pl-4 text-right font-bold text-[#78879B] dark:text-[#CBD5E1]">
                    {tree.r2Score.toFixed(4)} ({(tree.r2Score * 100).toFixed(2)}%)
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 pr-4 font-sans font-semibold text-[#11151C] dark:text-white">
                    Mean Squared Error (MSE)
                  </td>
                  <td className="py-3.5 px-4 text-right text-[#5E6D82] dark:text-[#CBD5E1]">
                    {formatNumber(lin.mse)}
                  </td>
                  <td className="py-3.5 pl-4 text-right text-[#5E6D82] dark:text-[#CBD5E1]">
                    {formatNumber(tree.mse)}
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 pr-4 font-sans font-semibold text-[#11151C] dark:text-white">
                    Root Mean Squared Error (RMSE)
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold text-[#11151C] dark:text-white">
                    {formatCurrency(lin.rmse, currency)}
                  </td>
                  <td className="py-3.5 pl-4 text-right font-semibold text-[#11151C] dark:text-white">
                    {formatCurrency(tree.rmse, currency)}
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 pr-4 font-sans font-semibold text-[#11151C] dark:text-white">
                    Mean Absolute Error (MAE)
                  </td>
                  <td className="py-3.5 px-4 text-right text-[#5E6D82] dark:text-[#CBD5E1]">
                    {formatCurrency(lin.mae, currency)}
                  </td>
                  <td className="py-3.5 pl-4 text-right text-[#5E6D82] dark:text-[#CBD5E1]">
                    {formatCurrency(tree.mae, currency)}
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 pr-4 font-sans font-semibold text-[#11151C] dark:text-white">
                    Train / Test Partition
                  </td>
                  <td className="py-3.5 px-4 text-right text-[#78879B]">
                    {lin.trainSamples} Train / {lin.testSamples} Test
                  </td>
                  <td className="py-3.5 pl-4 text-right text-[#78879B]">
                    {tree.trainSamples} Train / {tree.testSamples} Test
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#11151C] border border-slate-200 dark:border-[#78879B]/25 text-xs text-[#5E6D82] dark:text-[#94A3B8]">
            <strong>Analytical Conclusion:</strong> On the 13-feature one-hot encoded Housing.csv
            dataset, <strong>Linear Regression</strong> achieves a higher out-of-sample R² score (
            {(lin.r2Score * 100).toFixed(1)}% vs {(tree.r2Score * 100).toFixed(1)}%) and lower RMSE
            because residential price in this dataset scales additively with square footage,
            bathroom count, stories, and binary luxury amenities.
          </div>
        </div>

        {/* Visual Model Comparison Chart */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-white dark:bg-[#181E27] border border-slate-200 dark:border-[#78879B]/25 flex flex-col justify-between space-y-4">
          <div>
            <div className="text-xs font-medium text-[#78879B]">
              02. Visual Model Benchmark
            </div>
            <h2 className="text-xl font-bold text-[#11151C] dark:text-[#F1F5F9] mt-0.5 font-display">
              Accuracy vs. Error Magnitude
            </h2>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={visualComparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120, 135, 155, 0.18)" />
                <XAxis dataKey="name" tick={{ fill: '#78879B', fontSize: 11 }} />
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
                  dataKey="LinearRegression"
                  name="Linear Regression"
                  fill="#FF6B4A"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="DecisionTree"
                  name="Decision Tree"
                  fill="#78879B"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SECTION 2: DEEP-DIVE ALGORITHM EXPLANATIONS (Linear Regression vs Decision Tree Regression) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Card A: LINEAR REGRESSION */}
        <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#181E27] border border-slate-200 dark:border-[#78879B]/25 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-mono text-[#FF6B4A]">
                ARTIFACT: linear_model.pkl
              </div>
              <h2 className="text-2xl font-bold text-[#11151C] dark:text-[#F1F5F9] mt-1 font-display">
                Linear Regression (Ordinary Least Squares)
              </h2>
            </div>
            <TrendingUp className="w-6 h-6 text-[#FF6B4A] shrink-0" />
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-[#5E6D82] dark:text-[#94A3B8] leading-relaxed">
            <div>
              <h3 className="font-bold text-[#11151C] dark:text-white mb-1">
                How the Algorithm Works
              </h3>
              <p>
                Multivariate Linear Regression solves the normal equation{' '}
                <code className="font-mono text-[#FF6B4A]">w = (XᵀX)⁻¹Xᵀy</code> to minimize the sum
                of squared residuals between observed property prices in{' '}
                <code className="font-mono">Housing.csv</code> and the linear hyperplane spanned by
                the 13 encoded columns of <code className="font-mono">model_columns.pkl</code>.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-[#11151C] dark:text-white mb-1">
                How It Estimates Property Prices
              </h3>
              <p>
                Starts with a base intercept (
                <span className="font-mono font-semibold text-[#11151C] dark:text-white">
                  {formatCurrency(mlEngine.linearModel.intercept, currency)}
                </span>
                ) and adds a marginal monetary contribution for every square foot of area, each
                additional bedroom, bathroom, story, parking bay, and active amenity toggle.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#11151C] border border-[#78879B]/25 space-y-2">
                <div className="font-bold text-[#11151C] dark:text-white flex items-center gap-1.5 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-[#FF6B4A]" />
                  <span>Key Advantages</span>
                </div>
                <ul className="space-y-1.5 text-xs">
                  <li>· Transparent per-feature monetary coefficients</li>
                  <li>· Smooth continuous extrapolation across square footage</li>
                  <li>· Superior generalization (higher R²) on additive features</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#11151C] border border-[#78879B]/25 space-y-2">
                <div className="font-bold text-[#11151C] dark:text-white flex items-center gap-1.5 text-xs">
                  <AlertCircle className="w-4 h-4 text-[#78879B]" />
                  <span>Known Limitations</span>
                </div>
                <ul className="space-y-1.5 text-xs">
                  <li>· Assumes strictly additive linear relationships</li>
                  <li>· Sensitive to extreme luxury price outliers</li>
                  <li>· Cannot automatically isolate localized step thresholds</li>
                </ul>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedModel('linear_regression');
              navigate('/predict');
            }}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-[#FF6B4A] hover:bg-[#E85838] transition-colors"
          >
            Predict with Linear Regression
          </button>
        </div>

        {/* Card B: DECISION TREE REGRESSION */}
        <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#181E27] border border-slate-200 dark:border-[#78879B]/25 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-mono text-[#78879B]">
                ARTIFACT: decision_tree_model.pkl
              </div>
              <h2 className="text-2xl font-bold text-[#11151C] dark:text-[#F1F5F9] mt-1 font-display">
                Decision Tree Regression (CART)
              </h2>
            </div>
            <GitBranch className="w-6 h-6 text-[#78879B] shrink-0" />
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-[#5E6D82] dark:text-[#94A3B8] leading-relaxed">
            <div>
              <h3 className="font-bold text-[#11151C] dark:text-white mb-1">
                How Decision Trees Work
              </h3>
              <p>
                Classification and Regression Trees (CART) recursively partition the training space
                into binary regions by choosing the feature and split threshold that yield the
                largest reduction in target price variance (Sum of Squared Errors).
              </p>
            </div>

            <div>
              <h3 className="font-bold text-[#11151C] dark:text-white mb-1">
                How the Algorithm Predicts Property Values
              </h3>
              <p>
                Routes a property through a hierarchy of conditional rules (e.g.,{' '}
                <code className="font-mono text-[#FF6B4A]">area ≤ 5,980 sq ft</code> →{' '}
                <code className="font-mono text-[#FF6B4A]">bathrooms ≤ 1.5</code> →{' '}
                <code className="font-mono text-[#FF6B4A]">airconditioning_yes ≤ 0.5</code>) and
                outputs the mean historical price of the matching terminal leaf cluster.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#11151C] border border-[#78879B]/25 space-y-2">
                <div className="font-bold text-[#11151C] dark:text-white flex items-center gap-1.5 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-[#FF6B4A]" />
                  <span>Key Advantages</span>
                </div>
                <ul className="space-y-1.5 text-xs">
                  <li>· Captures non-linear feature interactions automatically</li>
                  <li>· Requires zero feature scaling or normalization</li>
                  <li>· Grounds estimates strictly within historical leaf bounds</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#11151C] border border-[#78879B]/25 space-y-2">
                <div className="font-bold text-[#11151C] dark:text-white flex items-center gap-1.5 text-xs">
                  <AlertCircle className="w-4 h-4 text-[#78879B]" />
                  <span>Known Limitations</span>
                </div>
                <ul className="space-y-1.5 text-xs">
                  <li>· Step-function predictions (piecewise constant leaves)</li>
                  <li>· Cannot extrapolate beyond min/max training prices</li>
                  <li>· Higher variance on small sample partitions</li>
                </ul>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedModel('decision_tree');
              navigate('/predict');
            }}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-[#78879B] hover:bg-[#5E6D82] transition-colors"
          >
            Predict with Decision Tree Regressor
          </button>
        </div>
      </div>

      {/* SECTION 3: EXACT MODEL_COLUMNS.PKL COEFFICIENTS & IMPORTANCES TABLE */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#181E27] border border-slate-200 dark:border-[#78879B]/25 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-[#FF6B4A]">
              03. Trained Parameter Inspection (model_columns.pkl)
            </div>
            <h2 className="text-lg font-bold text-[#11151C] dark:text-[#F1F5F9] font-display">
              Learned OLS Coefficients & Decision Tree Variance Importances
            </h2>
          </div>
          <Sliders className="w-4 h-4 text-[#FF6B4A]" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-[#78879B]/20 text-[#5E6D82] dark:text-[#94A3B8]">
                <th className="py-2.5 pr-4">Encoded Column (model_columns.pkl)</th>
                <th className="py-2.5 px-4">Human Label</th>
                <th className="py-2.5 px-4 text-right">Linear Regression Marginal Weight</th>
                <th className="py-2.5 px-4 text-right">Standardized Linear Share</th>
                <th className="py-2.5 pl-4 text-right">Decision Tree Split Importance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-[#78879B]/20 font-mono tabular-nums">
              {MODEL_COLUMNS.map((col) => {
                const item = featureImportance.find((f) => f.feature === col);
                if (!item) return null;
                return (
                  <tr key={col}>
                    <td className="py-2.5 pr-4 text-[#FF6B4A]">{col}</td>
                    <td className="py-2.5 px-4 font-sans text-[#11151C] dark:text-slate-200">
                      {item.label}
                    </td>
                    <td className="py-2.5 px-4 text-right text-[#11151C] dark:text-white">
                      {item.linearCoefficientRaw >= 0 ? '+' : ''}
                      {formatCurrency(item.linearCoefficientRaw, currency)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-[#5E6D82] dark:text-[#CBD5E1]">
                      {(item.linearCoefficientNormalized * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 pl-4 text-right font-semibold text-[#FF6B4A]">
                      {(item.decisionTreeImportance * 100).toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
