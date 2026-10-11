import { Router } from "express";
import {
  users,
  listings,
  orders,
  updateListing,
  updateOrder,
  verifyUser,
  stats,
} from "../controllers/admin.controller";
import { adminOverride } from "../controllers/payment.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";

const r = Router();

r.use(authenticate, requireRole("admin"));

r.get("/stats", stats);
r.get("/users", users);
r.get("/listings", listings);
r.get("/orders", orders);
r.patch("/listings/:id", updateListing);
r.patch("/orders/:id", updateOrder);
r.patch("/users/:id/verify", verifyUser);
r.post("/payments/:id/override", adminOverride);

export default r;
