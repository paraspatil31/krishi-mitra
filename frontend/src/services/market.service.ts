import { api } from "./api";
import { Market, MarketFilterParams, NearbyMarketsResponse } from "../types/market";

export const marketService = {
  /**
   * Fetch nearby agricultural markets & yards with optional geospatial coordinates and filters
   */
  async getNearbyMarkets(params: MarketFilterParams = {}): Promise<NearbyMarketsResponse> {
    const query = new URLSearchParams();

    if (params.lat !== undefined && params.lng !== undefined) {
      query.set("lat", params.lat.toString());
      query.set("lng", params.lng.toString());
    }
    if (params.radiusKm) {
      query.set("radius", params.radiusKm.toString());
    }
    if (params.type) {
      query.set("type", params.type);
    }
    if (params.commodity) {
      query.set("commodity", params.commodity);
    }
    if (params.district) {
      query.set("district", params.district);
    }
    if (params.search) {
      query.set("search", params.search);
    }
    if (params.enamOnly) {
      query.set("enamOnly", "true");
    }

    const queryString = query.toString();
    const endpoint = `/markets/nearby${queryString ? `?${queryString}` : ""}`;
    return api.get<NearbyMarketsResponse>(endpoint);
  },

  /**
   * Fetch list of commodities traded across all markets
   */
  async getTradedCommodities(): Promise<string[]> {
    const response = await api.get<{ data: string[]; count: number }>("/markets/commodities");
    return response.data || [];
  },

  /**
   * Fetch single market details by ID
   */
  async getMarketById(id: string): Promise<Market> {
    const response = await api.get<{ data: Market }>(`/markets/${id}`);
    return response.data;
  },
};

export default marketService;
