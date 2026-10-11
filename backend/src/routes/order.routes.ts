import { Router } from "express";
import { mine, getOne, create, updateStatus } from "../controllers/order.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";
import { orderLimiter } from "../middleware/rateLimit";

const router = Router();

router.use(authenticate);

router.get("/mine", mine);
router.get("/:id", getOne);

// Protected order placement with orderLimiter throttle against spamming/race attacks
router.post("/", requireRole("buyer"), orderLimiter, create);

router.patch("/:id/status", updateStatus);

export default router;
