import { Schema, model, Document, Types } from "mongoose";

export type BulkRequirementStatus = "open" | "fulfilled" | "cancelled";
export type BulkUnit = "tons" | "quintals" | "crates" | "kg";

export interface IQuotation {
  _id?: Types.ObjectId;
  farmerId: Types.ObjectId;
  farmerName: string;
  farmerPhone: string;
  offeredPricePerUnit: number;
  availableQuantity: number;
  availableDate: string;
  notes?: string;
  createdAt: Date;
}

export interface IBulkRequirement extends Document {
  buyerId: Types.ObjectId;
  product: string;
  quantity: number;
  unit: BulkUnit;
  targetPricePerUnit?: number;
  requiredByDate: string; // YYYY-MM-DD
  deliveryLocation: {
    address: string;
    district: string;
    state: string;
    pincode?: string;
  };
  status: BulkRequirementStatus;
  notes?: string;
  quotationsCount: number;
  quotations: IQuotation[];
  createdAt: Date;
  updatedAt: Date;
}

const bulkRequirementSchema = new Schema<IBulkRequirement>(
  {
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    product: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0.1,
    },
    unit: {
      type: String,
      required: true,
      enum: ["tons", "quintals", "crates", "kg"],
      default: "tons",
    },
    targetPricePerUnit: {
      type: Number,
      min: 0,
    },
    requiredByDate: {
      type: String,
      required: true,
    },
    deliveryLocation: {
      address: { type: String, required: true, trim: true },
      district: { type: String, required: true, trim: true },
      state: { type: String, required: true, default: "Maharashtra", trim: true },
      pincode: { type: String, trim: true },
    },
    status: {
      type: String,
      required: true,
      enum: ["open", "fulfilled", "cancelled"],
      default: "open",
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    quotationsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    quotations: [
      {
        farmerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        farmerName: { type: String, required: true },
        farmerPhone: { type: String, required: true },
        offeredPricePerUnit: { type: Number, required: true },
        availableQuantity: { type: Number, required: true },
        availableDate: { type: String, required: true },
        notes: { type: String, trim: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        const { _id, __v, ...rest } = ret;
        return { id: _id?.toString(), ...rest };
      },
    },
  }
);

// Fast lookups for buyer's open RFQs and product filtering
bulkRequirementSchema.index({ buyerId: 1, status: 1, createdAt: -1 });
bulkRequirementSchema.index({ product: 1, status: 1 });

export const BulkRequirement = model<IBulkRequirement>("BulkRequirement", bulkRequirementSchema);
export default BulkRequirement;
