import { Schema, model, Document } from "mongoose";

export type ListingStatus = "draft" | "active" | "sold_out" | "archived" | "deleted";

export interface IListing extends Document {
  name: string;
  category: string;
  description: string;
  price: number;
  unit: string;
  quantity: number;
  location: string;
  images: string[];
  farmerId: string;
  farmerName: string;
  harvestDate: string;
  status: ListingStatus;
  isActive: boolean;
  qualityGrade?: string;
  txHash?: string;
  blockchainBlockNumber?: number;
  provenanceVerifiedAt?: Date;
  fpoId?: string;
  memberFarmerId?: string;
  memberFarmerName?: string;
  geo?: { type: "Point"; coordinates: [number, number] };
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IListing>(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    category: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    location: { type: String, required: true },
    images: { type: [String], default: [] },
    farmerId: { type: String, required: true, index: true },
    farmerName: { type: String, required: true },
    harvestDate: { type: String, required: true },
    qualityGrade: { type: String, default: "A" },
    txHash: { type: String, index: true },
    blockchainBlockNumber: { type: Number },
    provenanceVerifiedAt: { type: Date },
    fpoId: { type: String, index: true },
    memberFarmerId: { type: String, index: true },
    memberFarmerName: { type: String, trim: true },
    status: {
      type: String,
      enum: ["draft", "active", "sold_out", "archived", "deleted"],
      default: "draft",
    },
    isActive: { type: Boolean, default: false },
    geo: {
      type: { type: String, enum: ["Point"] },
      coordinates: { type: [Number] },
    },
  },
  { timestamps: true }
);

schema.index({ geo: "2dsphere" });
schema.index({ name: "text", description: "text", category: "text" });

schema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    return ret;
  },
});

schema.set("toObject", {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    return ret;
  },
});

export default model<IListing>("Listing", schema);
