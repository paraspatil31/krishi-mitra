import { Request, Response, NextFunction } from "express";
import { Review } from "../models/Review";
import Order from "../models/Order";
import User from "../models/User";
import { AppError } from "../utils/AppError";

export const reviewController = {
  /**
   * POST /api/reviews
   * Submit a verified review for a delivered order.
   * Both buyers (rating farmers) and farmers (reviewing buyers) can submit for their own completed orders.
   */
  async createReview(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError("Authentication required", 401);
      }

      const { orderId, rating, comment } = req.body;

      if (!orderId) {
        throw new AppError("orderId is required", 400);
      }

      const numericRating = Number(rating);
      if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
        throw new AppError("Rating must be an integer between 1 and 5", 400);
      }

      const trimmedComment = typeof comment === "string" ? comment.trim() : "";
      if (trimmedComment.length < 3) {
        throw new AppError("Review comment must be at least 3 characters", 400);
      }
      if (trimmedComment.length > 1000) {
        throw new AppError("Review comment cannot exceed 1000 characters", 400);
      }

      // Re-fetch order server-side
      const order = await Order.findById(orderId);
      if (!order) {
        throw new AppError("Order not found", 404);
      }

      // Acceptance criterion: review submission is rejected server-side unless the linked order's status is delivered
      if (order.status !== "delivered") {
        throw new AppError(
          `Reviews can only be submitted for delivered orders. Current order status is '${order.status}'.`,
          400
        );
      }

      // Determine reviewer role and target user
      let targetUserId: string;
      let targetUserRole: "buyer" | "farmer";
      const reviewerRole = user.role === "farmer" ? "farmer" : "buyer";

      if (reviewerRole === "buyer") {
        if (order.buyerId.toString() !== user.id) {
          throw new AppError("You can only review orders that you placed", 403);
        }
        targetUserId = order.farmerId.toString();
        targetUserRole = "farmer";
      } else if (reviewerRole === "farmer") {
        if (order.farmerId.toString() !== user.id) {
          throw new AppError("You can only review orders for your own produce", 403);
        }
        targetUserId = order.buyerId.toString();
        targetUserRole = "buyer";
      } else {
        throw new AppError("Only buyers and farmers can submit order reviews", 403);
      }

      // Check if this reviewer has already submitted a review for this order
      const existing = await Review.findOne({ orderId, reviewerId: user.id });
      if (existing) {
        throw new AppError("You have already submitted a review for this order", 409);
      }

      // Fetch reviewer profile to get real display name
      const reviewerUser = await User.findById(user.id);
      const reviewerName = reviewerUser?.name || (reviewerRole === "buyer" ? "Verified Buyer" : "Farmer Producer");

      const cropName = order.items && order.items.length > 0 ? order.items[0].productName : undefined;

      const review = await Review.create({
        reviewerId: user.id,
        reviewerName,
        reviewerRole,
        targetUserId,
        targetUserRole,
        orderId,
        rating: numericRating,
        comment: trimmedComment,
        cropName,
      });

      res.status(201).json({
        message: "Review submitted successfully",
        data: review,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/reviews/user/:userId
   * Retrieve reviews and summary metrics for a given user (farmer or buyer).
   */
  async getUserReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      if (!userId) {
        throw new AppError("User ID is required", 400);
      }

      const reviews = await Review.find({ targetUserId: userId })
        .sort({ createdAt: -1 })
        .limit(100);

      const totalReviews = reviews.length;
      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let sum = 0;

      for (const r of reviews) {
        sum += r.rating;
        const key = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
        distribution[key] = (distribution[key] || 0) + 1;
      }

      const averageRating = totalReviews > 0 ? Number((sum / totalReviews).toFixed(1)) : 0;

      res.json({
        data: reviews,
        summary: {
          totalReviews,
          averageRating,
          distribution,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/reviews/order/:orderId
   * Retrieve the review submitted by the logged-in user for a specific order.
   */
  async getOrderReview(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError("Authentication required", 401);
      }

      const { orderId } = req.params;
      const review = await Review.findOne({ orderId, reviewerId: user.id });

      res.json({
        data: review || null,
      });
    } catch (err) {
      next(err);
    }
  },
};
