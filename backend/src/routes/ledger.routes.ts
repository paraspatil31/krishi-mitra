import { Router } from "express";
import { getProvenance } from "../controllers/ledger.controller";

const router = Router();

// Public provenance verification route
router.get("/:listingId", getProvenance);

export default router;
