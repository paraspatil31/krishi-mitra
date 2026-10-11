export type NotificationType =
  | "offer_received"
  | "offer_accepted"
  | "offer_rejected"
  | "order_placed"
  | "order_status"
  | "escrow_released"
  | "weather_alert"
  | "system";

export interface INotification {
  id: string;
  _id?: string;
  recipient: string;
  sender?: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  isRead: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationResponse {
  success: boolean;
  data: {
    notifications: INotification[];
    unreadCount: number;
  };
}
