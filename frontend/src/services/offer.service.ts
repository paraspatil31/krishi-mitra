import { api } from "./api";
import type { Offer } from "@/types/offer";

export interface CreateOfferPayload {
  listingId: string;
  offerPrice: number;
  offerQuantity: number;
  note?: string;
}

export interface RespondOfferPayload {
  action: "accept" | "reject";
  reason?: string;
  deliveryAddress?: string;
}

export const offerService = {
  async createOffer(payload: CreateOfferPayload): Promise<Offer> {
    const res = await api.post<{ data: Offer }>("/offers", payload);
    return res.data;
  },

  async getMyOffers(): Promise<Offer[]> {
    const res = await api.get<{ data: Offer[] }>("/offers/mine");
    return res.data || [];
  },

  async respondToOffer(offerId: string, payload: RespondOfferPayload): Promise<{ offer: Offer; order?: any }> {
    const res = await api.patch<{ data: { offer: Offer; order?: any } }>(`/offers/${offerId}/respond`, payload);
    return res.data;
  },
};
