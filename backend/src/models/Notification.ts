import { Schema, model, Document } from "mongoose";

export type NotificationType =
  | "offer_received"
  | "offer_accepted"
  | "offer_rejected"
  | "order_placed"
  | "order_status"
  | "escrow_released"
  | "weather_alert"
  | "system";

export interface INotification extends Document {
  recipient: string; // User ID
  sender?: string;    // User ID (optional)
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  isRead: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: String,
      required: true,
      index: true,
    },
    sender: {
      type: String,
      default: undefined,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    type: {
      type: String,
      enum: [
        "offer_received",
        "offer_accepted",
        "offer_rejected",
        "order_placed",
        "order_status",
        "escrow_released",
        "weather_alert",
        "system",
      ],
      default: "system",
      index: true,
    },
    link: {
      type: String,
      trim: true,
      default: "",
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// High performance index for unread and timeline querying
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

notificationSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete (ret as any)._id;
    delete (ret as any).__v;
    return ret;
  },
});

notificationSchema.set("toObject", {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete (ret as any)._id;
    delete (ret as any).__v;
    return ret;
  },
});

export const Notification = model<INotification>("Notification", notificationSchema);
