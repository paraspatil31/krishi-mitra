import { Router } from "express";
import { createOffer, getMyOffers, respondToOffer } from "../controllers/offer.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";

const router = Router();

// All offer actions require authentication
router.use(authenticate);

// Role-scoped offer inbox for logged-in user
router.get("/mine", getMyOffers);

// Buyer submits price/volume offer
router.post("/", requireRole("buyer"), createOffer);

// Farmer or FPO accepts or rejects incoming offer
router.patch("/:id/respond", requireRole("farmer", "fpo"), respondToOffer);

export default router;
