import { Schema, model, Document } from "mongoose";

export interface IReview extends Document {
  reviewerId: string;
  reviewerName: string;
  reviewerRole: "buyer" | "farmer";
  targetUserId: string;
  targetUserRole: "buyer" | "farmer";
  orderId: string;
  rating: number; // 1 to 5
  comment: string;
  cropName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    reviewerId: { type: String, required: true, index: true },
    reviewerName: { type: String, required: true, trim: true },
    reviewerRole: { type: String, required: true, enum: ["buyer", "farmer"] },
    targetUserId: { type: String, required: true, index: true },
    targetUserRole: { type: String, required: true, enum: ["buyer", "farmer"] },
    orderId: { type: String, required: true, index: true },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: "Rating must be an integer between 1 and 5",
      },
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 1000,
    },
    cropName: { type: String, trim: true },
  },
  { timestamps: true }
);

// Exactly one review per reviewer per order
reviewSchema.index({ orderId: 1, reviewerId: 1 }, { unique: true });
// Fast lookup of reviews for a given user (farmer or buyer)
reviewSchema.index({ targetUserId: 1, createdAt: -1 });

reviewSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret: any) => {
    ret.id = ret._id?.toString();
    delete ret.__v;
    return ret;
  },
});

export const Review = model<IReview>("Review", reviewSchema);
