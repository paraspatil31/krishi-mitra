import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { notificationController } from "../controllers/notification.controller";

const router = Router();

// All notification routes require authentication
router.use(authenticate);

router.get("/", (req, res) => notificationController.getMyNotifications(req, res));
router.patch("/read-all", (req, res) => notificationController.markAllAsRead(req, res));
router.patch("/:id/read", (req, res) => notificationController.markAsRead(req, res));
router.delete("/:id", (req, res) => notificationController.deleteNotification(req, res));

export default router;
