import { api } from "@/services/api";
import type { PriceForecastResult } from "@/types/mandi";

export interface PredictionFilters {
  crop: string;
  district?: string;
  days?: number;
}

export const predictionService = {
  /**
   * Fetches an AI price-trend forecast for a crop in a given district
   * Calling the backend /api/predictions bridge route.
   */
  async getPrediction(
    crop: string,
    district?: string,
    days: number = 7
  ): Promise<PriceForecastResult> {
    const params = new URLSearchParams();
    params.set("crop", crop);
    if (district) {
      params.set("district", district);
    }
    if (days) {
      params.set("days", String(days));
    }

    const res = await api.get<{ data: PriceForecastResult }>(
      `/predictions?${params.toString()}`
    );
    return res.data;
  },
};
