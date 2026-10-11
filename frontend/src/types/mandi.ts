export interface MandiPriceRecord {
  id: string;
  cropName: string;
  variety?: string;
  marketName: string;
  district: string;
  state: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  unit: string;
  priceDate: string; // YYYY-MM-DD
  source: string;
}

export interface PriceTrendPoint {
  date: string;
  avgModalPrice: number;
  minPrice: number;
  maxPrice: number;
  marketsCount: number;
}

export interface CropMarketSummary {
  cropName: string;
  modalPrice: number;
  minPrice: number;
  maxPrice: number;
  unit: string;
  topMarket: string;
  priceDate: string;
}

export interface MandiBenchmark {
  cropName: string;
  marketName: string;
  district: string;
  modalPricePerQuintal?: number | null;
  suggestedPricePerKg: number;
  unit: string;
  priceDate: string;
  source: string;
}

export interface PriceTrendResponse {
  data: PriceTrendPoint[];
  cropName: string;
  days: number;
  daysRequested: number;
  daysAvailable: number;
}

export interface MandiRefreshResponse {
  success: boolean;
  count: number;
  refreshedAt: string;
  source: string;
  cached?: boolean;
  message?: string;
}

export type TrendDirection = "bullish" | "bearish" | "stable";

export interface PricePredictionPoint {
  date: string;
  predictedPrice: number;
  confidenceMin: number;
  confidenceMax: number;
  dayName: string;
}

export interface PriceForecastResult {
  crop: string;
  district?: string;
  forecastDays: number;
  trendDirection: TrendDirection;
  trendPercentage: number;
  confidenceScore: number;
  latestPrice: number | null;
  historicalObservations: number;
  model: string;
  source: string;
  isAiServiceConnected: boolean;
  forecast: PricePredictionPoint[];
  disclaimer: string;
}

