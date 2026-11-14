export type YesNo = 'yes' | 'no';
export type FurnishingStatus = 'furnished' | 'semi-furnished' | 'unfurnished';
export type MLModelType = 'linear_regression' | 'decision_tree';

export interface PropertyInput {
  area: number;
  bedrooms: number;
  bathrooms: number;
  stories: number;
  mainroad: YesNo;
  guestroom: YesNo;
  basement: YesNo;
  hotwaterheating: YesNo;
  airconditioning: YesNo;
  parking: number;
  prefarea: YesNo;
  furnishingstatus: FurnishingStatus;
}

export interface HousingRecord extends PropertyInput {
  id: number;
  price: number;
}

export interface PredictionRequest extends PropertyInput {
  model: MLModelType;
}

export interface FeatureContribution {
  feature: string;
  label: string;
  value: string | number;
  impact: number; // Monetary impact in BDT
  importanceWeight: number; // Normalized 0..1
}

export interface PredictionResponse {
  success: boolean;
  predicted_price: number;
  model: MLModelType;
  currency: string;
  timestamp: string;
  confidence_interval: {
    low: number;
    high: number;
  };
  feature_contributions: FeatureContribution[];
  model_columns_encoding: Record<string, number>;
  execution_mode: 'fastapi_backend' | 'trained_ml_engine';
}

export interface PredictionHistoryItem {
  id: string;
  timestamp: string;
  inputs: PropertyInput;
  primaryModel: MLModelType;
  primaryPrice: number;
  secondaryModel?: MLModelType;
  secondaryPrice?: number;
  currency: string;
  featureContributions: FeatureContribution[];
}

export interface ModelMetrics {
  model: MLModelType;
  name: string;
  r2Score: number;
  mse: number;
  rmse: number;
  mae: number;
  trainSamples: number;
  testSamples: number;
  description: string;
}

export interface FeatureImportanceItem {
  feature: string;
  label: string;
  decisionTreeImportance: number;
  linearCoefficientNormalized: number;
  linearCoefficientRaw: number;
}

export interface AnalyticsSummary {
  totalRecords: number;
  avgPrice: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  avgArea: number;
  priceDistribution: { range: string; count: number; minVal: number; maxVal: number }[];
  areaVsPrice: {
    id: number;
    area: number;
    price: number;
    bedrooms: number;
    bathrooms: number;
    stories: number;
    furnishingstatus: FurnishingStatus;
    prefarea: YesNo;
    airconditioning: YesNo;
  }[];
  bedroomDistribution: { bedrooms: string; count: number; avgPrice: number }[];
  bathroomDistribution: { bathrooms: string; count: number; avgPrice: number }[];
  storiesDistribution: { stories: string; count: number; avgPrice: number }[];
  furnishingDistribution: { status: string; count: number; avgPrice: number }[];
  parkingDistribution: { parking: string; count: number; avgPrice: number }[];
  amenityImpact: { amenity: string; yesAvg: number; noAvg: number; premiumPct: number }[];
  correlationMatrix: {
    features: string[];
    matrix: number[][];
  };
}
