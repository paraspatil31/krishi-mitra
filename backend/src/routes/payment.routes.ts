import { Router } from "express";
import {
  initiate,
  verify,
  webhook,
  release,
  getByOrderId,
} from "../controllers/payment.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";

const router = Router();

// Public webhook route for Razorpay event notifications
router.post("/webhook", webhook);

// Authenticated buyer routes
router.post("/initiate", authenticate, requireRole("buyer", "admin"), initiate);
router.post("/verify", authenticate, requireRole("buyer", "admin"), verify);

// Escrow release & order payment status lookup
router.post("/release/:orderId", authenticate, release);
router.get("/order/:orderId", authenticate, getByOrderId);

export default router;
