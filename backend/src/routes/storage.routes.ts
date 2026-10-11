import { Router } from "express";
import { storageController } from "../controllers/storage.controller";
import { authenticate, requireRole, requireBusinessOrFarmer } from "../middleware/auth.middleware";

const router = Router();

// Storage facility directory restricted to Farmers and Business/Bulk Buyers
router.get("/", authenticate, requireBusinessOrFarmer, storageController.getStorageFacilities);
router.get("/:id", authenticate, requireBusinessOrFarmer, storageController.getStorageFacilityById);

// Admin-only: curate storage facility directory per T10.4
router.post(
  "/",
  authenticate,
  requireRole("admin"),
  storageController.createStorageFacility
);

export default router;
