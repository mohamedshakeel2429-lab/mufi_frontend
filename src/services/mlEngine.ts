import {
  HousingRecord,
  PropertyInput,
  MLModelType,
  PredictionResponse,
  ModelMetrics,
  FeatureImportanceItem,
  AnalyticsSummary,
  FeatureContribution,
} from '../types/estate';
import { HOUSING_DATASET } from '../data/housingData';

/**
 * Exact feature column order from `model_columns.pkl` (pandas.get_dummies(drop_first=True)):
 * 0: area
 * 1: bedrooms
 * 2: bathrooms
 * 3: stories
 * 4: parking
 * 5: mainroad_yes
 * 6: guestroom_yes
 * 7: basement_yes
 * 8: hotwaterheating_yes
 * 9: airconditioning_yes
 * 10: prefarea_yes
 * 11: furnishingstatus_semi-furnished
 * 12: furnishingstatus_unfurnished
 */
export const MODEL_COLUMNS = [
  'area',
  'bedrooms',
  'bathrooms',
  'stories',
  'parking',
  'mainroad_yes',
  'guestroom_yes',
  'basement_yes',
  'hotwaterheating_yes',
  'airconditioning_yes',
  'prefarea_yes',
  'furnishingstatus_semi-furnished',
  'furnishingstatus_unfurnished',
] as const;

export const FEATURE_LABELS: Record<string, string> = {
  area: 'Property Area (sq ft)',
  bedrooms: 'Bedrooms',
  bathrooms: 'Bathrooms',
  stories: 'Architectural Stories',
  parking: 'Parking Spaces',
  mainroad_yes: 'Main Road Access',
  guestroom_yes: 'Guest Room Suite',
  basement_yes: 'Basement Level',
  hotwaterheating_yes: 'Hot Water Heating',
  airconditioning_yes: 'Central Air Conditioning',
  prefarea_yes: 'Preferred Prime Zone',
  'furnishingstatus_semi-furnished': 'Semi-Furnished Status',
  furnishingstatus_unfurnished: 'Unfurnished Status',
};

export function encodePropertyInput(input: PropertyInput): number[] {
  return [
    Number(input.area),
    Number(input.bedrooms),
    Number(input.bathrooms),
    Number(input.stories),
    Number(input.parking),
    input.mainroad === 'yes' ? 1 : 0,
    input.guestroom === 'yes' ? 1 : 0,
    input.basement === 'yes' ? 1 : 0,
    input.hotwaterheating === 'yes' ? 1 : 0,
    input.airconditioning === 'yes' ? 1 : 0,
    input.prefarea === 'yes' ? 1 : 0,
    input.furnishingstatus === 'semi-furnished' ? 1 : 0,
    input.furnishingstatus === 'unfurnished' ? 1 : 0,
  ];
}

export function encodeToColumnsMap(input: PropertyInput): Record<string, number> {
  const vec = encodePropertyInput(input);
  const map: Record<string, number> = {};
  MODEL_COLUMNS.forEach((col, i) => {
    map[col] = vec[i];
  });
  return map;
}

/**
 * 1. ORDINARY LEAST SQUARES LINEAR REGRESSION (Exact Matrix Solver X^T X w = X^T y)
 */
class OrdinaryLeastSquaresModel {
  public intercept = 0;
  public coefficients: number[] = [];

  public fit(X: number[][], y: number[]) {
    const n = X.length;
    const p = X[0].length + 1; // +1 for intercept

    // Construct X_aug with leading 1
    const X_aug = X.map((row) => [1, ...row]);

    // Compute X^T * X (p x p) and X^T * y (p x 1)
    const XtX: number[][] = Array.from({ length: p }, () => Array(p).fill(0));
    const Xty: number[] = Array(p).fill(0);

    for (let i = 0; i < n; i++) {
      const row = X_aug[i];
      const target = y[i];
      for (let j = 0; j < p; j++) {
        Xty[j] += row[j] * target;
        for (let k = j; k < p; k++) {
          XtX[j][k] += row[j] * row[k];
        }
      }
    }
    for (let j = 0; j < p; j++) {
      for (let k = 0; k < j; k++) {
        XtX[j][k] = XtX[k][j];
      }
      // Tiny ridge regularization for numerical stability
      if (j > 0) XtX[j][j] += 1e-6;
    }

    // Solve via Gaussian elimination with partial pivoting
    const aug = XtX.map((row, i) => [...row, Xty[i]]);
    for (let col = 0; col < p; col++) {
      let maxRow = col;
      for (let row = col + 1; row < p; row++) {
        if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) {
          maxRow = row;
        }
      }
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

      const pivot = aug[col][col] || 1e-12;
      for (let j = col; j <= p; j++) {
        aug[col][j] /= pivot;
      }
      for (let row = 0; row < p; row++) {
        if (row !== col) {
          const factor = aug[row][col];
          for (let j = col; j <= p; j++) {
            aug[row][j] -= factor * aug[col][j];
          }
        }
      }
    }

    const weights = aug.map((row) => row[p]);
    this.intercept = weights[0];
    this.coefficients = weights.slice(1);
  }

  public predictOne(x: number[]): number {
    let sum = this.intercept;
    for (let i = 0; i < x.length; i++) {
      sum += x[i] * (this.coefficients[i] || 0);
    }
    return Math.max(1500000, Math.round(sum));
  }
}

/**
 * 2. CART DECISION TREE REGRESSOR (Variance Reduction Split Criterion, matching scikit-learn DecisionTreeRegressor)
 */
interface TreeNode {
  isLeaf: boolean;
  value: number;
  featureIndex?: number;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
  samples: number;
}

class CARTDecisionTreeRegressor {
  public root: TreeNode | null = null;
  public featureImportances: number[] = [];
  private maxDepth: number;
  private minSamplesSplit: number;
  private minSamplesLeaf: number;

  constructor(maxDepth = 7, minSamplesSplit = 8, minSamplesLeaf = 4) {
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
    this.minSamplesLeaf = minSamplesLeaf;
  }

  public fit(X: number[][], y: number[]) {
    const numFeatures = X[0].length;
    const rawImportances = Array(numFeatures).fill(0);
    const indices = y.map((_, i) => i);

    this.root = this.buildTree(X, y, indices, 0, rawImportances);

    const totalImp = rawImportances.reduce((acc, v) => acc + v, 0) || 1;
    this.featureImportances = rawImportances.map((v) => v / totalImp);
  }

  private computeMeanAndSSE(y: number[], indices: number[]): { mean: number; sse: number } {
    if (indices.length === 0) return { mean: 0, sse: 0 };
    let sum = 0;
    for (const idx of indices) sum += y[idx];
    const mean = sum / indices.length;
    let sse = 0;
    for (const idx of indices) {
      const diff = y[idx] - mean;
      sse += diff * diff;
    }
    return { mean, sse };
  }

  private buildTree(
    X: number[][],
    y: number[],
    indices: number[],
    depth: number,
    rawImportances: number[]
  ): TreeNode {
    const { mean, sse } = this.computeMeanAndSSE(y, indices);

    if (
      depth >= this.maxDepth ||
      indices.length < this.minSamplesSplit ||
      sse <= 1e-3
    ) {
      return { isLeaf: true, value: mean, samples: indices.length };
    }

    const numFeatures = X[0].length;
    let bestFeature = -1;
    let bestThreshold = 0;
    let bestGain = 0;
    let bestLeftIndices: number[] = [];
    let bestRightIndices: number[] = [];

    for (let f = 0; f < numFeatures; f++) {
      // Collect candidate thresholds
      const uniqueVals = Array.from(new Set(indices.map((i) => X[i][f]))).sort((a, b) => a - b);
      if (uniqueVals.length <= 1) continue;

      // Test midpoints (cap to 25 quantiles if continuous like area)
      const step = Math.max(1, Math.floor(uniqueVals.length / 24));
      for (let u = 0; u < uniqueVals.length - 1; u += step) {
        const threshold = (uniqueVals[u] + uniqueVals[u + 1]) / 2;
        const leftIdx: number[] = [];
        const rightIdx: number[] = [];

        for (const idx of indices) {
          if (X[idx][f] <= threshold) leftIdx.push(idx);
          else rightIdx.push(idx);
        }

        if (leftIdx.length < this.minSamplesLeaf || rightIdx.length < this.minSamplesLeaf) {
          continue;
        }

        const leftStats = this.computeMeanAndSSE(y, leftIdx);
        const rightStats = this.computeMeanAndSSE(y, rightIdx);
        const gain = sse - (leftStats.sse + rightStats.sse);

        if (gain > bestGain) {
          bestGain = gain;
          bestFeature = f;
          bestThreshold = threshold;
          bestLeftIndices = leftIdx;
          bestRightIndices = rightIdx;
        }
      }
    }

    if (bestFeature === -1 || bestGain <= 0) {
      return { isLeaf: true, value: mean, samples: indices.length };
    }

    rawImportances[bestFeature] += bestGain;

    return {
      isLeaf: false,
      value: mean,
      featureIndex: bestFeature,
      threshold: bestThreshold,
      samples: indices.length,
      left: this.buildTree(X, y, bestLeftIndices, depth + 1, rawImportances),
      right: this.buildTree(X, y, bestRightIndices, depth + 1, rawImportances),
    };
  }

  public predictOne(x: number[]): number {
    let node = this.root;
    while (node && !node.isLeaf && node.featureIndex !== undefined && node.threshold !== undefined) {
      if (x[node.featureIndex] <= node.threshold) {
        node = node.left || null;
      } else {
        node = node.right || null;
      }
    }
    return Math.max(1500000, Math.round(node ? node.value : 4500000));
  }
}

/**
 * Train and evaluate both models on Housing.csv using a deterministic 80/20 Train/Test split
 */
class TrainedMLEngine {
  public linearModel = new OrdinaryLeastSquaresModel();
  public treeModel = new CARTDecisionTreeRegressor(6, 10, 4);
  public metrics: Record<MLModelType, ModelMetrics>;
  public featureImportanceList: FeatureImportanceItem[] = [];
  public analyticsSummary: AnalyticsSummary;
  private featureMeans: number[] = [];

  constructor() {
    // Deterministic 80/20 stratified split (every 5th sorted sample goes to test set = 109 test, 436 train)
    const trainRecords: HousingRecord[] = [];
    const testRecords: HousingRecord[] = [];

    HOUSING_DATASET.forEach((record, index) => {
      if (index % 5 === 2) {
        testRecords.push(record);
      } else {
        trainRecords.push(record);
      }
    });

    const X_train = trainRecords.map((r) => encodePropertyInput(r));
    const y_train = trainRecords.map((r) => r.price);
    const X_test = testRecords.map((r) => encodePropertyInput(r));
    const y_test = testRecords.map((r) => r.price);

    // Compute feature means for contribution baseline
    const numCols = MODEL_COLUMNS.length;
    this.featureMeans = Array(numCols).fill(0);
    for (const row of X_train) {
      for (let c = 0; c < numCols; c++) {
        this.featureMeans[c] += row[c] / X_train.length;
      }
    }

    // Fit models on training data
    this.linearModel.fit(X_train, y_train);
    this.treeModel.fit(X_train, y_train);

    // Evaluate on test data
    const linearTestPreds = X_test.map((x) => this.linearModel.predictOne(x));
    const treeTestPreds = X_test.map((x) => this.treeModel.predictOne(x));

    const linearEval = this.evaluatePredictions(y_test, linearTestPreds);
    const treeEval = this.evaluatePredictions(y_test, treeTestPreds);

    // Refit on full 545 dataset for production inference while preserving test evaluation metrics
    const X_all = HOUSING_DATASET.map((r) => encodePropertyInput(r));
    const y_all = HOUSING_DATASET.map((r) => r.price);
    this.linearModel.fit(X_all, y_all);
    this.treeModel.fit(X_all, y_all);

    this.metrics = {
      linear_regression: {
        model: 'linear_regression',
        name: 'Linear Regression (OLS)',
        r2Score: Number(linearEval.r2.toFixed(4)),
        mse: Math.round(linearEval.mse),
        rmse: Math.round(linearEval.rmse),
        mae: Math.round(linearEval.mae),
        trainSamples: trainRecords.length,
        testSamples: testRecords.length,
        description:
          'Ordinary Least Squares multivariate regression trained on one-hot encoded property features (model_columns.pkl). Captures global linear price elasticity per square foot and amenity premium.',
      },
      decision_tree: {
        model: 'decision_tree',
        name: 'Decision Tree Regressor (CART)',
        r2Score: Number(treeEval.r2.toFixed(4)),
        mse: Math.round(treeEval.mse),
        rmse: Math.round(treeEval.rmse),
        mae: Math.round(treeEval.mae),
        trainSamples: trainRecords.length,
        testSamples: testRecords.length,
        description:
          'Non-parametric CART regression tree using variance-reduction binary splits. Captures non-linear feature thresholds and localized neighborhood-amenity interactions.',
      },
    };

    // Build Feature Importance list
    const stdDevs = Array(numCols).fill(0);
    for (const row of X_all) {
      for (let c = 0; c < numCols; c++) {
        stdDevs[c] += Math.pow(row[c] - this.featureMeans[c], 2);
      }
    }
    for (let c = 0; c < numCols; c++) {
      stdDevs[c] = Math.sqrt(stdDevs[c] / X_all.length);
    }

    const standardizedLinearAbs = this.linearModel.coefficients.map((coef, i) =>
      Math.abs(coef * stdDevs[i])
    );
    const totalLinearAbs = standardizedLinearAbs.reduce((a, b) => a + b, 0) || 1;

    this.featureImportanceList = MODEL_COLUMNS.map((col, idx) => ({
      feature: col,
      label: FEATURE_LABELS[col] || col,
      decisionTreeImportance: Number((this.treeModel.featureImportances[idx] || 0).toFixed(4)),
      linearCoefficientNormalized: Number((standardizedLinearAbs[idx] / totalLinearAbs).toFixed(4)),
      linearCoefficientRaw: Math.round(this.linearModel.coefficients[idx] || 0),
    })).sort((a, b) => b.decisionTreeImportance - a.decisionTreeImportance);

    this.analyticsSummary = this.computeAnalyticsSummary();
  }

  private evaluatePredictions(actual: number[], predicted: number[]) {
    const n = actual.length;
    const meanActual = actual.reduce((a, b) => a + b, 0) / n;
    let ssRes = 0;
    let ssTot = 0;
    let absErr = 0;

    for (let i = 0; i < n; i++) {
      const err = actual[i] - predicted[i];
      ssRes += err * err;
      const tot = actual[i] - meanActual;
      ssTot += tot * tot;
      absErr += Math.abs(err);
    }

    const mse = ssRes / n;
    const rmse = Math.sqrt(mse);
    const mae = absErr / n;
    const r2 = 1 - ssRes / (ssTot || 1);
    return { r2, mse, rmse, mae };
  }

  public predict(
    input: PropertyInput,
    model: MLModelType,
    executionMode: 'fastapi_backend' | 'trained_ml_engine' = 'trained_ml_engine'
  ): PredictionResponse {
    const encoded = encodePropertyInput(input);
    const predicted_price =
      model === 'linear_regression'
        ? this.linearModel.predictOne(encoded)
        : this.treeModel.predictOne(encoded);

    const modelRmse = this.metrics[model].rmse;
    const confidence_interval = {
      low: Math.max(1500000, Math.round(predicted_price - 0.85 * modelRmse)),
      high: Math.round(predicted_price + 0.85 * modelRmse),
    };

    const contributions: FeatureContribution[] = MODEL_COLUMNS.map((col, idx) => {
      const val = encoded[idx];
      const coef = this.linearModel.coefficients[idx] || 0;
      const diffFromMean = val - (this.featureMeans[idx] || 0);
      const impact = Math.round(diffFromMean * coef);
      const impItem = this.featureImportanceList.find((f) => f.feature === col);
      const importanceWeight =
        model === 'decision_tree'
          ? impItem?.decisionTreeImportance || 0
          : impItem?.linearCoefficientNormalized || 0;

      return {
        feature: col,
        label: FEATURE_LABELS[col] || col,
        value: val,
        impact,
        importanceWeight,
      };
    }).sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

    return {
      success: true,
      predicted_price,
      model,
      currency: 'BDT',
      timestamp: new Date().toISOString(),
      confidence_interval,
      feature_contributions: contributions,
      model_columns_encoding: encodeToColumnsMap(input),
      execution_mode: executionMode,
    };
  }

  private computeAnalyticsSummary(): AnalyticsSummary {
    const prices = HOUSING_DATASET.map((r) => r.price).sort((a, b) => a - b);
    const totalRecords = HOUSING_DATASET.length;
    const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / totalRecords);
    const medianPrice = prices[Math.floor(totalRecords / 2)];
    const minPrice = prices[0];
    const maxPrice = prices[totalRecords - 1];
    const avgArea = Math.round(
      HOUSING_DATASET.reduce((a, r) => a + r.area, 0) / totalRecords
    );

    // 1. Price Distribution buckets
    const bucketDefs = [
      { range: '1.75M - 3.5M', minVal: 1750000, maxVal: 3500000 },
      { range: '3.5M - 5.0M', minVal: 3500000, maxVal: 5000000 },
      { range: '5.0M - 6.5M', minVal: 5000000, maxVal: 6500000 },
      { range: '6.5M - 8.0M', minVal: 6500000, maxVal: 8000000 },
      { range: '8.0M - 10.0M', minVal: 8000000, maxVal: 10000000 },
      { range: '10.0M - 13.5M', minVal: 10000000, maxVal: 14000000 },
    ];
    const priceDistribution = bucketDefs.map((b) => ({
      ...b,
      count: HOUSING_DATASET.filter((r) => r.price >= b.minVal && r.price < b.maxVal).length,
    }));

    // 2. Area vs Price
    const areaVsPrice = HOUSING_DATASET.map((r) => ({
      id: r.id,
      area: r.area,
      price: r.price,
      bedrooms: r.bedrooms,
      bathrooms: r.bathrooms,
      stories: r.stories,
      furnishingstatus: r.furnishingstatus,
      prefarea: r.prefarea,
      airconditioning: r.airconditioning,
    }));

    // 3. Bedroom distribution
    const bedroomDistribution = [1, 2, 3, 4, 5].map((b) => {
      const subset = HOUSING_DATASET.filter((r) => r.bedrooms === b);
      return {
        bedrooms: `${b} ${b === 1 ? 'Bed' : 'Beds'}`,
        count: subset.length,
        avgPrice: subset.length
          ? Math.round(subset.reduce((s, r) => s + r.price, 0) / subset.length)
          : 0,
      };
    }).filter((d) => d.count > 0);

    // 4. Bathroom distribution
    const bathroomDistribution = [1, 2, 3, 4].map((b) => {
      const subset = HOUSING_DATASET.filter((r) => r.bathrooms === b);
      return {
        bathrooms: `${b} ${b === 1 ? 'Bath' : 'Baths'}`,
        count: subset.length,
        avgPrice: subset.length
          ? Math.round(subset.reduce((s, r) => s + r.price, 0) / subset.length)
          : 0,
      };
    }).filter((d) => d.count > 0);

    // 5. Stories distribution
    const storiesDistribution = [1, 2, 3, 4].map((s) => {
      const subset = HOUSING_DATASET.filter((r) => r.stories === s);
      return {
        stories: `${s} ${s === 1 ? 'Story' : 'Stories'}`,
        count: subset.length,
        avgPrice: subset.length
          ? Math.round(subset.reduce((acc, r) => acc + r.price, 0) / subset.length)
          : 0,
      };
    });

    // 6. Furnishing distribution
    const furnishingDistribution = (['furnished', 'semi-furnished', 'unfurnished'] as const).map(
      (status) => {
        const subset = HOUSING_DATASET.filter((r) => r.furnishingstatus === status);
        return {
          status:
            status === 'furnished'
              ? 'Furnished'
              : status === 'semi-furnished'
              ? 'Semi-Furnished'
              : 'Unfurnished',
          count: subset.length,
          avgPrice: subset.length
            ? Math.round(subset.reduce((s, r) => s + r.price, 0) / subset.length)
            : 0,
        };
      }
    );

    // 7. Parking distribution
    const parkingDistribution = [0, 1, 2, 3].map((p) => {
      const subset = HOUSING_DATASET.filter((r) => r.parking === p);
      return {
        parking: `${p} ${p === 1 ? 'Bay' : 'Bays'}`,
        count: subset.length,
        avgPrice: subset.length
          ? Math.round(subset.reduce((s, r) => s + r.price, 0) / subset.length)
          : 0,
      };
    });

    // 8. Amenity impact
    const amenityKeys: { key: keyof HousingRecord; label: string }[] = [
      { key: 'airconditioning', label: 'Air Conditioning' },
      { key: 'prefarea', label: 'Preferred Area' },
      { key: 'mainroad', label: 'Main Road Access' },
      { key: 'basement', label: 'Basement' },
      { key: 'guestroom', label: 'Guest Room' },
      { key: 'hotwaterheating', label: 'Hot Water Heating' },
    ];
    const amenityImpact = amenityKeys.map(({ key, label }) => {
      const yesSet = HOUSING_DATASET.filter((r) => r[key] === 'yes');
      const noSet = HOUSING_DATASET.filter((r) => r[key] === 'no');
      const yesAvg = yesSet.length
        ? Math.round(yesSet.reduce((s, r) => s + r.price, 0) / yesSet.length)
        : 0;
      const noAvg = noSet.length
        ? Math.round(noSet.reduce((s, r) => s + r.price, 0) / noSet.length)
        : 1;
      const premiumPct = Number((((yesAvg - noAvg) / noAvg) * 100).toFixed(1));
      return { amenity: label, yesAvg, noAvg, premiumPct };
    });

    // 9. Numerical Feature Correlation Heatmap (Price, Area, Bedrooms, Bathrooms, Stories, Parking)
    const corrFeatures = ['Price', 'Area', 'Bedrooms', 'Bathrooms', 'Stories', 'Parking'];
    const extractors: ((r: HousingRecord) => number)[] = [
      (r) => r.price,
      (r) => r.area,
      (r) => r.bedrooms,
      (r) => r.bathrooms,
      (r) => r.stories,
      (r) => r.parking,
    ];
    const matrix: number[][] = corrFeatures.map((_, i) =>
      corrFeatures.map((__, j) => {
        if (i === j) return 1.0;
        const xs = HOUSING_DATASET.map(extractors[i]);
        const ys = HOUSING_DATASET.map(extractors[j]);
        const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
        const my = ys.reduce((a, b) => a + b, 0) / ys.length;
        let num = 0;
        let dx = 0;
        let dy = 0;
        for (let k = 0; k < xs.length; k++) {
          const vx = xs[k] - mx;
          const vy = ys[k] - my;
          num += vx * vy;
          dx += vx * vx;
          dy += vy * vy;
        }
        const corr = num / (Math.sqrt(dx * dy) || 1);
        return Number(corr.toFixed(2));
      })
    );

    return {
      totalRecords,
      avgPrice,
      medianPrice,
      minPrice,
      maxPrice,
      avgArea,
      priceDistribution,
      areaVsPrice,
      bedroomDistribution,
      bathroomDistribution,
      storiesDistribution,
      furnishingDistribution,
      parkingDistribution,
      amenityImpact,
      correlationMatrix: {
        features: corrFeatures,
        matrix,
      },
    };
  }
}

export const mlEngine = new TrainedMLEngine();
