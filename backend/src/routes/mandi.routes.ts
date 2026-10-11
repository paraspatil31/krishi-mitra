import { Router } from "express";
import {
  listPrices,
  refreshRates,
  getTrends,
  getCropsSummary,
  getBenchmark,
} from "../controllers/mandi.controller";
import { mandiLimiter } from "../middleware/rateLimit";
import { authenticate, requireBusinessOrFarmer } from "../middleware/auth.middleware";

const router = Router();

// Wholesale APMC market rates restricted to Farmers and Business/Bulk Buyers
router.get("/", authenticate, requireBusinessOrFarmer, mandiLimiter, listPrices);
router.post("/refresh", refreshRates);
router.get("/refresh", refreshRates);
router.get("/trends", authenticate, requireBusinessOrFarmer, mandiLimiter, getTrends);
router.get("/crops", authenticate, requireBusinessOrFarmer, mandiLimiter, getCropsSummary);
router.get("/benchmark/:cropName", authenticate, requireBusinessOrFarmer, mandiLimiter, getBenchmark);

export default router;
