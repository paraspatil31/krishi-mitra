import { Router } from "express";
import { getPrediction } from "../controllers/prediction.controller";
import { mandiLimiter } from "../middleware/rateLimit";
import { authenticate, requireBusinessOrFarmer } from "../middleware/auth.middleware";

const router = Router();

// GET /api/predictions?crop=&district=&days=
// Wholesale price forecast restricted to Farmers, FPOs, and Business Buyers per security specs
router.get("/", authenticate, requireBusinessOrFarmer, mandiLimiter, getPrediction);

export default router;
