import { Schema, model, Document } from "mongoose";

export interface IOtpVerification extends Document {
  phone: string;
  otp: string;
  purpose: "signup" | "login" | "verify_phone";
  expiresAt: Date;
  verified: boolean;
  attempts: number;
  createdAt: Date;
}

const otpVerificationSchema = new Schema<IOtpVerification>({
  phone: {
    type: String,
    required: true,
    index: true,
    trim: true,
  },
  otp: {
    type: String,
    required: true,
  },
  purpose: {
    type: String,
    enum: ["signup", "login", "verify_phone"],
    default: "verify_phone",
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }, // Automatically remove document when expired via MongoDB TTL
  },
  verified: {
    type: Boolean,
    default: false,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default model<IOtpVerification>("OtpVerification", otpVerificationSchema);
