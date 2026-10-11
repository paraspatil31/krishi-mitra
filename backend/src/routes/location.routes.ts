import { Router } from "express";
import { search, reverse, verify } from "../controllers/location.controller";

const router = Router();

router.get("/search", search);
router.get("/reverse", reverse);
router.post("/verify", verify);

export default router;
