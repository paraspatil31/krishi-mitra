import { Router } from "express";
import { reviewController } from "../controllers/review.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";

const router = Router();

// Public: view reviews and rating aggregates for a farmer or buyer
router.get("/user/:userId", reviewController.getUserReviews);

// Protected: view review status for a specific order
router.get("/order/:orderId", authenticate, reviewController.getOrderReview);

// Protected: submit review for a delivered order (both buyers and farmers)
router.post(
  "/",
  authenticate,
  requireRole("buyer", "farmer"),
  reviewController.createReview
);

export default router;
