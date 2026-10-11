import mongoose, { Document, Schema } from "mongoose";

export interface IMandiPrice extends Document {
  cropName: string;
  variety?: string;
  marketName: string;
  district: string;
  state: string;
  minPrice: number; // ₹ per quintal (or specified unit)
  maxPrice: number; // ₹ per quintal
  modalPrice: number; // ₹ per quintal (benchmark price)
  unit: string; // e.g. "quintal", "kg", "crate"
  priceDate: string; // YYYY-MM-DD
  source: string; // e.g. "Agmarknet APMC Portal", "MSAMB"
  ingestedAt: Date;
}

const MandiPriceSchema = new Schema<IMandiPrice>(
  {
    cropName: { type: String, required: true, trim: true, index: true },
    variety: { type: String, trim: true, default: "Standard" },
    marketName: { type: String, required: true, trim: true, index: true },
    district: { type: String, required: true, trim: true, index: true },
    state: { type: String, required: true, trim: true, default: "Maharashtra" },
    minPrice: { type: Number, required: true, min: 0 },
    maxPrice: { type: Number, required: true, min: 0 },
    modalPrice: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, default: "quintal" },
    priceDate: { type: String, required: true, index: true },
    source: { type: String, default: "Agmarknet APMC Portal" },
    ingestedAt: { type: Date, default: Date.now },
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

// Compound index for unique price record deduplication
MandiPriceSchema.index(
  {
    cropName: 1,
    variety: 1,
    marketName: 1,
    priceDate: 1,
  },
  {
    unique: true,
  }
);

// Query indexes for historical trends and district benchmarks
MandiPriceSchema.index({ cropName: 1, district: 1, priceDate: -1 });
MandiPriceSchema.index({ priceDate: -1, cropName: 1 });

export default mongoose.model<IMandiPrice>("MandiPrice", MandiPriceSchema);
