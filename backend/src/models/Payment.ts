import { Schema, model, Document, Types } from "mongoose";

export type PaymentStatus = "initiated" | "captured" | "held" | "released" | "refunded" | "failed";

export interface IWebhookEventLog {
  eventId?: string;
  event: string;
  receivedAt: Date;
  payload: Record<string, any>;
}

export interface IPayment extends Document {
  orderId: Types.ObjectId;
  buyerId: string;
  farmerId: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  amount: number; // Amount in INR
  amountPaise: number; // Amount in paise for Razorpay
  currency: string;
  status: PaymentStatus;
  gatewayEventIds: string[]; // Handled gateway event IDs for idempotency deduplication
  webhookEventLog: IWebhookEventLog[]; // Audit log of raw webhook payloads
  releasedAt?: Date;
  refundedAt?: Date;
  adminOverrideReason?: string;
  adminOverrideBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const webhookEventLogSchema = new Schema<IWebhookEventLog>(
  {
    eventId: { type: String },
    event: { type: String, required: true },
    receivedAt: { type: Date, default: Date.now },
    payload: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false }
);

const paymentSchema = new Schema<IPayment>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    buyerId: { type: String, required: true, index: true },
    farmerId: { type: String, required: true, index: true },
    razorpayOrderId: { type: String, index: true },
    razorpayPaymentId: { type: String, index: true },
    razorpaySignature: { type: String },
    amount: { type: Number, required: true, min: 0 },
    amountPaise: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      enum: ["initiated", "captured", "held", "released", "refunded", "failed"],
      default: "initiated",
      index: true,
    },
    gatewayEventIds: { type: [String], default: [] },
    webhookEventLog: { type: [webhookEventLogSchema], default: [] },
    releasedAt: { type: Date },
    refundedAt: { type: Date },
    adminOverrideReason: { type: String },
    adminOverrideBy: { type: String },
  },
  { timestamps: true }
);

paymentSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    return ret;
  },
});

paymentSchema.set("toObject", {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    return ret;
  },
});

export default model<IPayment>("Payment", paymentSchema);
