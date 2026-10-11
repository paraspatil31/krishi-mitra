import { Router } from "express";
import {
  createRequirement,
  getMyRequirements,
  getAllOpenRequirements,
  getRequirementById,
  updateRequirementStatus,
  deleteRequirement,
  submitQuotation,
} from "../controllers/bulkRequirement.controller";
import { authenticate, requireBuyerType, requireBusinessOrFarmer, requireRole } from "../middleware/auth.middleware";

const router = Router();

// Create bulk RFQ - Business buyers only
router.post("/", authenticate, requireBuyerType("business"), createRequirement);

// Get current buyer's requirements
router.get("/my", authenticate, requireBuyerType("business"), getMyRequirements);

// Get all open requirements (available to farmers and business buyers)
router.get("/open", authenticate, requireBusinessOrFarmer, getAllOpenRequirements);

// Farmer submits a quotation/response to an open bulk requirement
router.post("/:id/quote", authenticate, requireRole("farmer"), submitQuotation);

// Get requirement details
router.get("/:id", authenticate, requireBusinessOrFarmer, getRequirementById);

// Update status (e.g. open -> fulfilled or cancelled)
router.patch("/:id/status", authenticate, requireBuyerType("business"), updateRequirementStatus);

// Delete requirement
router.delete("/:id", authenticate, requireBuyerType("business"), deleteRequirement);

export default router;
