import { Router } from "express";
import {
  getFPOStats,
  getMembers,
  addMember,
  removeMember,
  getAggregatedLots,
  createMemberLot,
  getAggregatedOffers,
  getAggregatedOrders,
} from "../controllers/fpo.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";

const router = Router();

// All FPO routes require authentication and strictly the "fpo" role
router.use(authenticate);
router.use(requireRole("fpo"));

router.get("/stats", getFPOStats);
router.get("/members", getMembers);
router.post("/members", addMember);
router.delete("/members/:id", removeMember);

router.get("/lots", getAggregatedLots);
router.post("/lots", createMemberLot);

router.get("/offers", getAggregatedOffers);
router.get("/orders", getAggregatedOrders);

export default router;
