import { Request, Response, NextFunction } from "express";
import { Notification } from "../models/Notification";

export class NotificationController {
  /**
   * GET /api/notifications
   * Returns authenticated user's notifications + unread count.
   */
  async getMyNotifications(req: Request, res: Response, next?: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.id || (req as any).user?._id?.toString();
      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const limit = Math.min(Number(req.query.limit) || 30, 100);
      const unreadOnly = req.query.unreadOnly === "true";

      const query: any = { recipient: userId };
      if (unreadOnly) {
        query.isRead = false;
      }

      const [notifications, unreadCount] = await Promise.all([
        Notification.find(query).sort({ createdAt: -1 }).limit(limit).lean(),
        Notification.countDocuments({ recipient: userId, isRead: false }),
      ]);

      const formattedNotifications = notifications.map((n: any) => ({
        ...n,
        id: n._id.toString(),
      }));

      res.status(200).json({
        success: true,
        data: {
          notifications: formattedNotifications,
          unreadCount,
        },
      });
    } catch (err: any) {
      console.error("getMyNotifications error:", err);
      res.status(500).json({ success: false, message: "Failed to fetch notifications." });
    }
  }

  /**
   * PATCH /api/notifications/:id/read
   * Mark single notification as read.
   */
  async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || (req as any).user?._id?.toString();
      const { id } = req.params;

      const updated = await Notification.findOneAndUpdate(
        { _id: id, recipient: userId },
        { isRead: true },
        { new: true }
      );

      if (!updated) {
        res.status(404).json({ success: false, message: "Notification not found." });
        return;
      }

      const unreadCount = await Notification.countDocuments({ recipient: userId, isRead: false });

      res.status(200).json({
        success: true,
        data: {
          notification: updated,
          unreadCount,
        },
      });
    } catch (err: any) {
      console.error("markAsRead error:", err);
      res.status(500).json({ success: false, message: "Failed to update notification." });
    }
  }

  /**
   * PATCH /api/notifications/read-all
   * Mark all notifications as read for the authenticated user.
   */
  async markAllAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || (req as any).user?._id?.toString();
      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      await Notification.updateMany({ recipient: userId, isRead: false }, { isRead: true });

      res.status(200).json({
        success: true,
        message: "All notifications marked as read.",
        data: { unreadCount: 0 },
      });
    } catch (err: any) {
      console.error("markAllAsRead error:", err);
      res.status(500).json({ success: false, message: "Failed to mark all as read." });
    }
  }

  /**
   * DELETE /api/notifications/:id
   * Delete a notification.
   */
  async deleteNotification(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || (req as any).user?._id?.toString();
      const { id } = req.params;

      const deleted = await Notification.findOneAndDelete({ _id: id, recipient: userId });

      if (!deleted) {
        res.status(404).json({ success: false, message: "Notification not found." });
        return;
      }

      const unreadCount = await Notification.countDocuments({ recipient: userId, isRead: false });

      res.status(200).json({
        success: true,
        message: "Notification removed.",
        data: { unreadCount },
      });
    } catch (err: any) {
      console.error("deleteNotification error:", err);
      res.status(500).json({ success: false, message: "Failed to delete notification." });
    }
  }
}

export const notificationController = new NotificationController();
