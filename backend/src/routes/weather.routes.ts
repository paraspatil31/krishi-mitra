import { Router } from "express";
import { forecast, getAlerts, triggerAlertScan } from "../controllers/weather.controller";
import { authenticate } from "../middleware/auth.middleware";

import { weatherLimiter } from "../middleware/rateLimit";

const router = Router();

// Weather forecast (supports lat, lng, or district query)
router.get("/", weatherLimiter, forecast);

// Active weather advisories and severe alerts for farmer's district
router.get("/alerts", weatherLimiter, getAlerts);

// Manual/admin trigger to scan and evaluate district forecasts against alert thresholds
router.post("/scan", authenticate, triggerAlertScan);

export default router;
