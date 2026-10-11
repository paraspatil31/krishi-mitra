import { Schema, model, Document } from "mongoose";

export type OfferStatus = "pending" | "accepted" | "rejected" | "expired";

export interface IOffer extends Document {
  listingId: string;
  listingTitle: string;
  buyerId: string;
  buyerName: string;
  buyerPhone: string;
  farmerId: string;
  farmerName: string;
  offerPrice: number; // ₹ per unit
  originalPrice: number;
  offerQuantity: number;
  unit: string;
  status: OfferStatus;
  rejectionReason?: string;
  note?: string;
  expiresAt: Date;
  orderId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const offerSchema = new Schema<IOffer>(
  {
    listingId: { type: String, required: true, index: true },
    listingTitle: { type: String, required: true, trim: true },
    buyerId: { type: String, required: true, index: true },
    buyerName: { type: String, required: true, trim: true },
    buyerPhone: { type: String, required: true },
    farmerId: { type: String, required: true, index: true },
    farmerName: { type: String, required: true, trim: true },
    offerPrice: { type: Number, required: true, min: 0.1 },
    originalPrice: { type: Number, required: true, min: 0.1 },
    offerQuantity: { type: Number, required: true, min: 1 },
    unit: { type: String, required: true, default: "kg" },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "expired"],
      default: "pending",
      index: true,
    },
    rejectionReason: { type: String, trim: true, maxlength: 300 },
    note: { type: String, trim: true, maxlength: 500 },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 hours default
      index: true,
    },
    orderId: { type: String, index: true },
  },
  { timestamps: true }
);

// Compound indexes for optimal queries
offerSchema.index({ buyerId: 1, createdAt: -1 });
offerSchema.index({ farmerId: 1, status: 1, createdAt: -1 });
offerSchema.index({ listingId: 1, status: 1 });

offerSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete (ret as any)._id;
    delete (ret as any).__v;
    return ret;
  },
});

export default model<IOffer>("Offer", offerSchema);
