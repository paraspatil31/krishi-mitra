import { Router } from "express";
import { list, getOne, mine, create, update, remove } from "../controllers/listing.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";
import { listingsSearchLimiter } from "../middleware/rateLimit";

const router = Router();

// Protected farmer/FPO routes (must precede /:id to prevent parameter conflict)
router.get("/mine", authenticate, requireRole("farmer", "fpo"), mine);

// Public browse & search endpoints (throttled against aggressive scrapers)
router.get("/", listingsSearchLimiter, list);
router.get("/:id", listingsSearchLimiter, getOne);

// Protected farmer/FPO mutation routes
router.post("/", authenticate, requireRole("farmer", "fpo"), create);
router.put("/:id", authenticate, requireRole("farmer", "fpo"), update);
router.delete("/:id", authenticate, requireRole("farmer", "fpo"), remove);

export default router;
