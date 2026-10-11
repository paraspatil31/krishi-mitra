import type { Listing } from "@/types/product";
import { api } from "@/services/api";

export type ListingFormData = {
  name: string;
  category: Listing["category"];
  description: string;
  price: number;
  unit: string;
  quantity: number;
  location: string;
  harvestDate: string;
  status: "draft" | "active";
  images?: string[];
};

export const listingService = {
  async getMyListings(_farmerId?: string): Promise<Listing[]> {
    const r = await api.get<{ data: Listing[] }>("/listings/mine");
    return r.data;
  },

  async getListingById(id: string, _token?: string): Promise<Listing> {
    const r = await api.get<{ data: Listing }>(`/listings/${id}`);
    return r.data;
  },

  async createListing(
    data: ListingFormData,
    _farmer?: { id: string; name: string }
  ): Promise<Listing> {
    const r = await api.post<{ data: Listing }>("/listings", data);
    return r.data;
  },

  async updateListing(
    id: string,
    data: Partial<ListingFormData>,
    _token?: string
  ): Promise<Listing> {
    const r = await api.put<{ data: Listing }>(`/listings/${id}`, data);
    return r.data;
  },

  async deleteListing(id: string, _token?: string): Promise<void> {
    await api.delete(`/listings/${id}`);
  },
};
