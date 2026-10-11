import { Router } from "express";
import { marketController } from "../controllers/market.controller";
import { publicApiLimiter } from "../middleware/rateLimit";
import { authenticate, requireBusinessOrFarmer } from "../middleware/auth.middleware";

const router = Router();

// Apply public rate limiting
router.use(publicApiLimiter);

// Market finder restricted to Farmers and Business/Bulk Buyers
router.get("/nearby", authenticate, requireBusinessOrFarmer, marketController.getNearbyMarkets);
router.get("/commodities", authenticate, requireBusinessOrFarmer, marketController.getTradedCommodities);
router.get("/:id", authenticate, requireBusinessOrFarmer, marketController.getMarketById);

export default router;
