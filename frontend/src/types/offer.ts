export type OfferStatus = "pending" | "accepted" | "rejected" | "expired";

export interface Offer {
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
  status: OfferStatus;
  rejectionReason?: string;
  note?: string;
  expiresAt: string;
  orderId?: string;
  createdAt: string;
  updatedAt: string;
}
