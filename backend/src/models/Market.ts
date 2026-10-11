import { Schema, model, Document } from "mongoose";

export type MarketType =
  | "apmc_mandi"
  | "sub_yard"
  | "weekly_haat"
  | "fpo_collection_center";

export interface IMarket extends Document {
  name: string;
  code: string;
  marketType: MarketType;
  district: string;
  state: string;
  address: string;
  pincode: string;
  location: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  operatingHours: string;
  operatingDays: string[];
  majorCommodities: string[];
  facilities: string[];
  contactPhone: string;
  contactEmail?: string;
  enamEnabled: boolean;
  verifiedBuyersCount?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const marketSchema = new Schema<IMarket>(
  {
    name: { type: String, required: true, trim: true, index: true },
    code: { type: String, required: true, trim: true, unique: true },
    marketType: {
      type: String,
      required: true,
      enum: ["apmc_mandi", "sub_yard", "weekly_haat", "fpo_collection_center"],
      default: "apmc_mandi",
      index: true,
    },
    district: { type: String, required: true, trim: true, index: true },
    state: { type: String, required: true, default: "Maharashtra", trim: true },
    address: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
      },
    },
    operatingHours: { type: String, required: true, default: "06:00 AM - 04:00 PM" },
    operatingDays: {
      type: [String],
      default: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    },
    majorCommodities: {
      type: [String],
      default: [],
      index: true,
    },
    facilities: {
      type: [String],
      default: ["Electronic Weighbridge", "Farmer Rest Shed", "Dispute Resolution Board"],
    },
    contactPhone: { type: String, required: true },
    contactEmail: { type: String, trim: true },
    enamEnabled: { type: Boolean, default: false, index: true },
    verifiedBuyersCount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true, index: true },
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

// 2dsphere index for geospatial proximity search
marketSchema.index({ location: "2dsphere" });

// Compound indexes for fast district and commodity browsing
marketSchema.index({ district: 1, marketType: 1, isActive: 1 });
marketSchema.index({ majorCommodities: 1, district: 1 });

export const Market = model<IMarket>("Market", marketSchema);
export default Market;
