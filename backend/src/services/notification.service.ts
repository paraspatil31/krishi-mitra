import { Notification, NotificationType, INotification } from "../models/Notification";
import User from "../models/User";

export interface CreateNotificationDTO {
  recipient: string;
  sender?: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  metadata?: Record<string, any>;
}

export class NotificationService {
  /**
   * Directly save a notification in MongoDB.
   */
  async create(data: CreateNotificationDTO): Promise<INotification> {
    return Notification.create({
      recipient: data.recipient,
      sender: data.sender,
      title: data.title,
      message: data.message,
      type: data.type,
      link: data.link || "",
      metadata: data.metadata || {},
    });
  }

  /**
   * Decoupled asynchronous notification dispatcher.
   * Safe to call anywhere without blocking request cycles or failing parent transactions.
   */
  dispatch(data: CreateNotificationDTO): void {
    setImmediate(async () => {
      try {
        const notif = await this.create(data);

        // Optional push dispatch (FCM / Web Push / Log)
        const fcmKey = process.env.FCM_SERVER_KEY;
        if (fcmKey && fcmKey !== "your_firebase_cloud_messaging_server_key_here") {
          // Future FCM HTTP v1 / legacy gateway dispatch placeholder
          console.log(`[FCM Push] Sent to user ${data.recipient}: ${data.title}`);
        } else {
          console.log(
            `[In-App Notification] Saved for user ${data.recipient} (${data.type}): "${data.title} - ${data.message}"`
          );
        }
      } catch (err) {
        // Notification delivery errors are isolated and never crash the server
        console.error("[NotificationService] Dispatch error:", err);
      }
    });
  }

  /**
   * Triggered when a buyer submits a price offer to a farmer
   */
  notifyOfferReceived(params: {
    farmerId: string;
    buyerId: string;
    buyerName: string;
    cropName: string;
    offerPrice: number;
    unit: string;
    offerId: string;
  }): void {
    this.dispatch({
      recipient: params.farmerId,
      sender: params.buyerId,
      title: "New Price Offer Received 🤝",
      message: `${params.buyerName} proposed ₹${params.offerPrice}/${params.unit} for ${params.cropName}.`,
      type: "offer_received",
      link: "/farmer/offers",
      metadata: { offerId: params.offerId, cropName: params.cropName },
    });
  }

  /**
   * Triggered when a farmer accepts or declines a buyer's offer
   */
  notifyOfferResponded(params: {
    buyerId: string;
    farmerId: string;
    farmerName: string;
    cropName: string;
    status: "accepted" | "rejected";
    offerId: string;
    orderId?: string;
  }): void {
    const isAccepted = params.status === "accepted";
    this.dispatch({
      recipient: params.buyerId,
      sender: params.farmerId,
      title: isAccepted ? "Offer Accepted! 🎉" : "Offer Declined",
      message: isAccepted
        ? `${params.farmerName} accepted your offer for ${params.cropName}. Stock is now reserved.`
        : `${params.farmerName} declined your offer for ${params.cropName}.`,
      type: isAccepted ? "offer_accepted" : "offer_rejected",
      link: isAccepted && params.orderId ? `/buyer/orders/${params.orderId}` : "/buyer/offers",
      metadata: { offerId: params.offerId, orderId: params.orderId, status: params.status },
    });
  }

  /**
   * Triggered when an order is created (direct or converted from offer)
   */
  notifyOrderPlaced(params: {
    farmerId: string;
    buyerId: string;
    buyerName: string;
    orderTotal: number;
    orderId: string;
  }): void {
    this.dispatch({
      recipient: params.farmerId,
      sender: params.buyerId,
      title: "New Harvest Order Placed 📦",
      message: `Order #${params.orderId.slice(-6).toUpperCase()} placed by ${params.buyerName} for ₹${params.orderTotal.toFixed(2)}.`,
      type: "order_placed",
      link: "/farmer/orders",
      metadata: { orderId: params.orderId, orderTotal: params.orderTotal },
    });
  }

  /**
   * Triggered when farmer or system updates an order status
   */
  notifyOrderStatusChanged(params: {
    buyerId: string;
    farmerName: string;
    status: string;
    orderId: string;
  }): void {
    const statusLabels: Record<string, string> = {
      confirmed: "Confirmed ✓",
      processing: "Harvest & Packing 🧺",
      shipped: "Dispatched & In Transit 🚚",
      delivered: "Delivered to Doorstep 🏡",
      cancelled: "Cancelled",
    };

    const readableStatus = statusLabels[params.status] || params.status;

    this.dispatch({
      recipient: params.buyerId,
      title: `Order Status: ${readableStatus}`,
      message: `Your harvest order #${params.orderId.slice(-6).toUpperCase()} from ${params.farmerName} is now ${params.status}.`,
      type: "order_status",
      link: `/buyer/orders/${params.orderId}`,
      metadata: { orderId: params.orderId, status: params.status },
    });
  }

  /**
   * Triggered when buyer confirms delivery and escrow funds are released
   */
  notifyEscrowReleased(params: {
    farmerId: string;
    amount: number;
    orderId: string;
  }): void {
    this.dispatch({
      recipient: params.farmerId,
      title: "Escrow Payment Released 💰",
      message: `₹${params.amount.toFixed(2)} has been safely released to your account for Order #${params.orderId.slice(-6).toUpperCase()}.`,
      type: "escrow_released",
      link: "/farmer/orders",
      metadata: { orderId: params.orderId, amount: params.amount },
    });
  }

  /**
   * Triggered when a critical agricultural weather warning is issued
   */
  async notifyWeatherEmergency(params: {
    district: string;
    alertType: string;
    severity: string;
    headline: string;
  }): Promise<void> {
    try {
      // Find farmers registered in this district
      const farmers = await User.find({
        role: "farmer",
        district: new RegExp(`^${params.district}$`, "i"),
      }).select("_id");

      for (const farmer of farmers) {
        this.dispatch({
          recipient: farmer._id.toString(),
          title: `⚠️ Weather Advisory: ${params.district}`,
          message: params.headline,
          type: "weather_alert",
          link: "/farmer/weather",
          metadata: { district: params.district, alertType: params.alertType, severity: params.severity },
        });
      }
    } catch (err) {
      console.error("[NotificationService] notifyWeatherEmergency error:", err);
    }
  }

  /**
   * Triggered when a farmer submits a quotation for a business bulk requirement
   */
  notifyBulkQuotation(params: {
    buyerId: string;
    farmerName: string;
    product: string;
    offeredPrice: number;
    unit: string;
    requirementId: string;
  }): void {
    this.dispatch({
      recipient: params.buyerId,
      title: "New Wholesale Quotation Received 📋",
      message: `Farmer ${params.farmerName} submitted a quotation of ₹${params.offeredPrice.toLocaleString()}/${params.unit} for your ${params.product} demand.`,
      type: "offer_received",
      link: "/business/dashboard",
      metadata: { requirementId: params.requirementId },
    });
  }
}

export const notificationService = new NotificationService();
