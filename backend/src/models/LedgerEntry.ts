import { Schema, model, Document, Types } from "mongoose";

export interface ILedgerEntry extends Document {
  listingId: Types.ObjectId;
  farmerId: Types.ObjectId;
  farmerName: string;
  cropName: string;
  category: string;
  quantity: number;
  unit: string;
  harvestDate: Date;
  qualityTag: string;
  txHash: string;
  blockNumber: number;
  network: string;
  district?: string;
  verifiedAt: Date;
  createdAt: Date;
}

const ledgerEntrySchema = new Schema<ILedgerEntry>({
  listingId: {
    type: Schema.Types.ObjectId,
    ref: "Listing",
    required: true,
    index: true,
  },
  farmerId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  farmerName: {
    type: String,
    required: true,
  },
  cropName: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    default: "Produce",
  },
  quantity: {
    type: Number,
    required: true,
  },
  unit: {
    type: String,
    default: "kg",
  },
  harvestDate: {
    type: Date,
    required: true,
  },
  qualityTag: {
    type: String,
    default: "A-Grade Farm Gate Verified",
  },
  txHash: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  blockNumber: {
    type: Number,
    required: true,
  },
  network: {
    type: String,
    default: "Polygon-Amoy-AgriLedger",
  },
  district: {
    type: String,
  },
  verifiedAt: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

ledgerEntrySchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret: any) => {
    ret.id = ret._id ? ret._id.toString() : "";
    return ret;
  },
});

export default model<ILedgerEntry>("LedgerEntry", ledgerEntrySchema);
