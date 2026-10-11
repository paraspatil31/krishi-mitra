import mongoose, { Document, Schema } from "mongoose";

export type WeatherAlertType = "heavy_rain" | "frost" | "heatwave" | "strong_wind";
export type AlertSeverity = "info" | "warning" | "critical";

export interface IWeatherAlert extends Document {
  district: string;
  alertType: WeatherAlertType;
  severity: AlertSeverity;
  headline: string;
  message: string;
  advisory: string; // Specific agricultural guidance for farmers
  metricValue?: number; // e.g. precipitation in mm, temperature in °C
  sentAt: Date;
  validUntil: Date;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WeatherAlertSchema = new Schema<IWeatherAlert>(
  {
    district: { type: String, required: true, trim: true, index: true },
    alertType: {
      type: String,
      required: true,
      enum: ["heavy_rain", "frost", "heatwave", "strong_wind"],
      index: true,
    },
    severity: {
      type: String,
      required: true,
      enum: ["info", "warning", "critical"],
      default: "warning",
    },
    headline: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    advisory: { type: String, required: true, trim: true },
    metricValue: { type: Number },
    sentAt: { type: Date, default: Date.now },
    validUntil: { type: Date, required: true, index: true },
    active: { type: Boolean, default: true, index: true },
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

// Compound indexes for querying active alerts by district
WeatherAlertSchema.index({ district: 1, active: 1, validUntil: -1 });
WeatherAlertSchema.index({ alertType: 1, district: 1, sentAt: -1 });

export default mongoose.model<IWeatherAlert>("WeatherAlert", WeatherAlertSchema);
