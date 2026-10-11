import { Schema, model, Document } from "mongoose";

export type StorageFacilityType =
  | "cold_storage"
  | "dry_warehouse"
  | "silo"
  | "ripening_chamber";

export interface IStorageFacility extends Document {
  name: string;
  type: StorageFacilityType;
  district: string;
  state: string;
  address: string;
  pincode: string;
  location: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  totalCapacity: number; // in Metric Tons (MT)
  availableCapacity: number; // in Metric Tons (MT)
  capacityUpdatedAt: Date;
  temperatureRange?: string; // e.g. "0°C to 4°C"
  pricePerTonPerMonth: number; // in INR (₹)
  amenities: string[];
  contactPhone: string;
  contactEmail?: string;
  operatingHours: string;
  wdraRegistered: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const storageFacilitySchema = new Schema<IStorageFacility>(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: ["cold_storage", "dry_warehouse", "silo", "ripening_chamber"],
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
    totalCapacity: { type: Number, required: true, min: 0 },
    availableCapacity: { type: Number, required: true, min: 0 },
    capacityUpdatedAt: { type: Date, default: Date.now },
    temperatureRange: { type: String, trim: true },
    pricePerTonPerMonth: { type: Number, required: true, min: 0 },
    amenities: [{ type: String, trim: true }],
    contactPhone: { type: String, required: true, trim: true },
    contactEmail: { type: String, trim: true },
    operatingHours: { type: String, default: "08:00 AM - 08:00 PM", trim: true },
    wdraRegistered: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

storageFacilitySchema.index({ location: "2dsphere" });
storageFacilitySchema.index({ district: 1, type: 1, isActive: 1 });

storageFacilitySchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret: any) => {
    ret.id = ret._id?.toString();
    delete ret.__v;
    return ret;
  },
});

export const StorageFacility = model<IStorageFacility>("StorageFacility", storageFacilitySchema);
