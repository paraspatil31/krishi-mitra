import { api } from "./api";
import { Listing } from "@/types/product";

export interface FPOStats {
  fpoName: string;
  district: string;
  totalMembersCount: number;
  activeLotsCount: number;
  totalStockVolumeKg: number;
  totalLotsValue: number;
  pendingOffersCount: number;
  activeOrdersCount: number;
  completedOrdersCount: number;
  totalRevenue: number;
  commodities: {
    cropName: string;
    lotsCount: number;
    volumeKg: number;
  }[];
}

export interface FPOMember {
  id: string;
  name: string;
  phone: string;
  district: string;
  landSizeAcres: number;
  primaryCrops: string[];
  organicCertified: boolean;
  activeLotsCount: number;
  totalStockVolume: number;
  createdAt: string;
}

export interface AddMemberInput {
  name: string;
  phone: string;
  district?: string;
  villageAddress?: string;
  landSizeAcres?: number;
  primaryCrops?: string[];
  organicCertified?: boolean;
}

export interface CreateMemberLotInput {
  name: string;
  category: string;
  description: string;
  price: number;
  unit: string;
  quantity: number;
  location: string;
  harvestDate: string;
  memberFarmerId?: string;
  qualityGrade?: string;
  images?: string[];
  status?: "draft" | "active";
}

export interface FPOOffer {
  id: string;
  listingId: string;
  listingTitle: string;
  buyerId: string;
  buyerName: string;
  buyerPhone: string;
  farmerId: string;
  farmerName: string;
  offerPrice: number;
  originalPrice: number;
  offerQuantity: number;
  unit: string;
  status: "pending" | "accepted" | "rejected" | "expired";
  rejectionReason?: string;
  note?: string;
  expiresAt: string;
  orderId?: string;
  createdAt: string;
}

export interface FPOOrder {
  id: string;
  buyerId: string;
  buyerName: string;
  farmerId: string;
  farmerName: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    unit: string;
    price: number;
  }[];
  total: number;
  status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
  deliveryAddress: string;
  offerId?: string;
  createdAt: string;
}

export const fpoService = {
  getStats: async (): Promise<FPOStats> => {
    const res = await api.get<{ data: FPOStats }>("/fpo/stats");
    return res.data;
  },

  getMembers: async (): Promise<FPOMember[]> => {
    const res = await api.get<{ data: FPOMember[] }>("/fpo/members");
    return res.data;
  },

  addMember: async (data: AddMemberInput): Promise<FPOMember> => {
    const res = await api.post<{ data: FPOMember }>("/fpo/members", data);
    return res.data;
  },

  removeMember: async (id: string): Promise<{ id: string; message: string }> => {
    const res = await api.delete<{ data: { id: string; message: string } }>(`/fpo/members/${id}`);
    return res.data;
  },

  getLots: async (): Promise<Listing[]> => {
    const res = await api.get<{ data: Listing[] }>("/fpo/lots");
    return res.data;
  },

  createLot: async (data: CreateMemberLotInput): Promise<Listing> => {
    const res = await api.post<{ data: Listing }>("/fpo/lots", data);
    return res.data;
  },

  getOffers: async (): Promise<FPOOffer[]> => {
    const res = await api.get<{ data: FPOOffer[] }>("/fpo/offers");
    return res.data;
  },

  respondOffer: async (
    id: string,
    action: "accept" | "reject",
    reason?: string
  ): Promise<{ data: FPOOffer; message: string }> => {
    return api.patch(`/offers/${id}/respond`, { action, reason });
  },

  getOrders: async (): Promise<FPOOrder[]> => {
    const res = await api.get<{ data: FPOOrder[] }>("/fpo/orders");
    return res.data;
  },

  updateOrderStatus: async (id: string, status: string): Promise<FPOOrder> => {
    const res = await api.patch<{ data: FPOOrder }>(`/orders/${id}/status`, { status });
    return res.data;
  },
};
