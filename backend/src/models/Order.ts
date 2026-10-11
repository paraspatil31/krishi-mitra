import { Schema, model, Document } from "mongoose";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface IOrder extends Document {
  buyerId: string;
  buyerName: string;
  farmerId: string;
  farmerName: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    unit: string;
    price: number;
  }[];
  total: number;
  status: OrderStatus;
  deliveryAddress: string;
  offerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IOrder>(
  {
    buyerId: { type: String, required: true, index: true },
    buyerName: { type: String, required: true },
    farmerId: { type: String, required: true, index: true },
    farmerName: { type: String, required: true },
    items: [
      {
        productId: String,
        productName: String,
        quantity: Number,
        unit: String,
        price: Number,
      },
    ],
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    deliveryAddress: { type: String, required: true },
    offerId: { type: String, index: true },
  },
  { timestamps: true }
);

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

export default model<IOrder>("Order", schema);
