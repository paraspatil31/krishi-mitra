import { api } from "./api";
import { INotification, NotificationResponse } from "../types/notification";

export const notificationService = {
  /**
   * Fetch current user's notifications and unread count
   */
  async getMyNotifications(params?: { unreadOnly?: boolean; limit?: number }): Promise<{
    notifications: INotification[];
    unreadCount: number;
  }> {
    const query = new URLSearchParams();
    if (params?.unreadOnly) query.append("unreadOnly", "true");
    if (params?.limit) query.append("limit", params.limit.toString());

    const qs = query.toString() ? `?${query.toString()}` : "";
    const res = await api.get<NotificationResponse>(`/notifications${qs}`);
    return res.data;
  },

  /**
   * Mark a single notification as read
   */
  async markAsRead(id: string): Promise<{ notification: INotification; unreadCount: number }> {
    const res = await api.patch<{
      success: boolean;
      data: { notification: INotification; unreadCount: number };
    }>(`/notifications/${id}/read`, {});
    return res.data;
  },

  /**
   * Mark all user's notifications as read
   */
  async markAllAsRead(): Promise<{ unreadCount: number }> {
    const res = await api.patch<{
      success: boolean;
      message: string;
      data: { unreadCount: number };
    }>("/notifications/read-all", {});
    return res.data;
  },

  /**
   * Delete a notification
   */
  async deleteNotification(id: string): Promise<{ unreadCount: number }> {
    const res = await api.delete<{
      success: boolean;
      message: string;
      data: { unreadCount: number };
    }>(`/notifications/${id}`);
    return res.data;
  },
};
