import { api } from "@/services/api";
import type {
  MandiPriceRecord,
  PriceTrendPoint,
  CropMarketSummary,
  MandiBenchmark,
} from "@/types/mandi";

interface MandiFilters {
  cropName?: string;
  district?: string;
  marketName?: string;
  date?: string;
  page?: number;
  limit?: number;
}

interface MandiListResponse {
  data: MandiPriceRecord[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const mandiService = {
  async getPrices(filters: MandiFilters = {}): Promise<MandiListResponse> {
    const params = new URLSearchParams();
    if (filters.cropName) params.set("cropName", filters.cropName);
    if (filters.district) params.set("district", filters.district);
    if (filters.marketName) params.set("marketName", filters.marketName);
    if (filters.date) params.set("date", filters.date);
    if (filters.page) params.set("page", String(filters.page));
    if (filters.limit) params.set("limit", String(filters.limit));

    const query = params.toString();
    return api.get<MandiListResponse>(`/mandi-prices${query ? `?${query}` : ""}`);
  },

  async getTrends(
    cropName: string,
    days = 14
  ): Promise<{ data: PriceTrendPoint[]; daysRequested: number; daysAvailable: number }> {
    const res = await api.get<{
      data: PriceTrendPoint[];
      daysRequested?: number;
      daysAvailable?: number;
    }>(`/mandi-prices/trends?cropName=${encodeURIComponent(cropName)}&days=${days}`);
    const data = res.data || [];
    return {
      data,
      daysRequested: res.daysRequested ?? days,
      daysAvailable: res.daysAvailable ?? data.length,
    };
  },

  async refreshRates(force = false): Promise<{ count: number; refreshedAt: string; source: string; message?: string }> {
    return api.post(`/mandi-prices/refresh${force ? "?force=true" : ""}`, {});
  },

  async getCropsSummary(): Promise<CropMarketSummary[]> {
    const res = await api.get<{ data: CropMarketSummary[] }>("/mandi-prices/crops");
    return res.data || [];
  },

  async getBenchmark(cropName: string, district?: string): Promise<MandiBenchmark | null> {
    try {
      const query = district ? `?district=${encodeURIComponent(district)}` : "";
      const res = await api.get<{ data: MandiBenchmark }>(
        `/mandi-prices/benchmark/${encodeURIComponent(cropName)}${query}`
      );
      return res.data || null;
    } catch {
      return null;
    }
  },
};
