export type MarketType =
  | "apmc_mandi"
  | "sub_yard"
  | "weekly_haat"
  | "fpo_collection_center";

export interface Market {
  id: string;
  name: string;
  code: string;
  marketType: MarketType;
  district: string;
  state: string;
  address: string;
  pincode: string;
  location: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
  operatingHours: string;
  operatingDays: string[];
  majorCommodities: string[];
  facilities: string[];
  contactPhone: string;
  contactEmail?: string;
  enamEnabled: boolean;
  verifiedBuyersCount?: number;
  distanceKm?: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface MarketFilterParams {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  type?: MarketType | "";
  commodity?: string;
  district?: string;
  search?: string;
  enamOnly?: boolean;
}

export interface NearbyMarketsResponse {
  data: Market[];
  count: number;
  query: {
    lat?: number | null;
    lng?: number | null;
    radiusKm: number;
    district?: string | null;
    type?: string | null;
    commodity?: string | null;
  };
}
