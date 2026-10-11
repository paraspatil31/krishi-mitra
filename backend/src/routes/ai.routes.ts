import { Router } from "express";
import { diagnoseCrop, assistantChat } from "../controllers/ai.controller";
import { optionalAuthenticate } from "../middleware/auth.middleware";
import { aiLimiter } from "../middleware/rateLimit";

const router = Router();

// Crop disease and produce quality control inspection
router.post("/diagnose", aiLimiter, optionalAuthenticate, diagnoseCrop);

// Conversational speech & navigation assistant
router.post("/chat", aiLimiter, optionalAuthenticate, assistantChat);

export default router;
