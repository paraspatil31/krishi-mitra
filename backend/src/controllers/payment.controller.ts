import { Request, Response, NextFunction } from "express";
import Payment from "../models/Payment";
import Order from "../models/Order";
import { AppError } from "../utils/AppError";
import {
  createRazorpayOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from "../services/payment.service";
import { notificationService } from "../services/notification.service";

/**
 * Initiates a payment session for an order (buyer only).
 * Re-reads order and total amount server-side (Hard rule #1).
 */
export async function initiate(req: Request, res: Response, next: NextFunction) {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      throw new AppError("Order ID is required", 400);
    }

    const order = await Order.findById(orderId);
    if (!order) {
      throw new AppError("Order not found", 404);
    }

    // Role check: Only the buyer who owns the order can initiate payment
    if (order.buyerId !== req.user!.id && req.user!.role !== "admin") {
      throw new AppError("Forbidden: You do not own this order", 403);
    }

    // Check existing payment status
    let payment = await Payment.findOne({ orderId: order._id });
    if (payment && ["captured", "held", "released"].includes(payment.status)) {
      throw new AppError("Order has already been paid for", 400);
    }

    // Hard rule #1: Calculate amount in paise strictly from server-side order.total
    const amountInPaise = Math.round(order.total * 100);

    const rzpOrder = await createRazorpayOrder({
      amountInPaise,
      currency: "INR",
      receipt: `rcpt_${order._id.toString().slice(-10)}`,
      notes: {
        orderId: order._id.toString(),
        buyerId: order.buyerId,
        farmerId: order.farmerId,
      },
    });

    if (!payment) {
      payment = new Payment({
        orderId: order._id,
        buyerId: order.buyerId,
        farmerId: order.farmerId,
        razorpayOrderId: rzpOrder.id,
        amount: order.total,
        amountPaise: amountInPaise,
        currency: rzpOrder.currency || "INR",
        status: "initiated",
      });
    } else {
      payment.razorpayOrderId = rzpOrder.id;
      payment.status = "initiated";
    }

    await payment.save();

    res.status(200).json({
      data: {
        paymentId: payment._id,
        orderId: order._id,
        razorpayOrderId: rzpOrder.id,
        amount: amountInPaise,
        currency: rzpOrder.currency || "INR",
        keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
        isMock: rzpOrder.isMock || false,
        buyerName: order.buyerName,
      },
    });
  } catch (e) {
    next(e);
  }
}

/**
 * Handles client-side payment verification callback after hosted checkout modal
 */
export async function verify(req: Request, res: Response, next: NextFunction) {
  try {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!orderId || !razorpayOrderId || !razorpayPaymentId) {
      throw new AppError("Missing payment verification details", 400);
    }

    const order = await Order.findById(orderId);
    if (!order) {
      throw new AppError("Order not found", 404);
    }

    if (order.buyerId !== req.user!.id && req.user!.role !== "admin") {
      throw new AppError("Forbidden", 403);
    }

    const payment = await Payment.findOne({ orderId: order._id });
    if (!payment) {
      throw new AppError("Payment record not found for this order", 404);
    }

    // Verify signature
    const isValid = verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature || ""
    );

    if (!isValid) {
      payment.status = "failed";
      await payment.save();
      throw new AppError("Invalid payment signature", 400);
    }

    payment.razorpayPaymentId = razorpayPaymentId;
    payment.razorpaySignature = razorpaySignature;
    payment.status = "captured";
    await payment.save();

    // Advance order to confirmed if still pending
    if (order.status === "pending") {
      order.status = "confirmed";
      await order.save();
    }

    res.status(200).json({
      data: {
        status: "success",
        payment,
        order,
      },
    });
  } catch (e) {
    next(e);
  }
}

/**
 * Razorpay webhook handler with idempotency deduplication (Hard rule #5).
 * Mounts on public route, verifies webhook signature.
 */
export async function webhook(req: Request, res: Response) {
  const signature = req.headers["x-razorpay-signature"] as string;
  const rawBody = (req as any).rawBody
    ? (req as any).rawBody.toString("utf8")
    : JSON.stringify(req.body);

  // If secret configured, enforce signature verification
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (secret && !secret.startsWith("your_")) {
    if (!signature || !verifyWebhookSignature(rawBody, signature)) {
      return res.status(400).json({ error: "Invalid webhook signature" });
    }
  }

  const eventPayload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const eventName: string = eventPayload.event;
  const eventId: string =
    (req.headers["x-razorpay-event-id"] as string) ||
    eventPayload.id ||
    eventPayload.event_id ||
    `${eventName}_${Date.now()}`;

  const paymentEntity = eventPayload?.payload?.payment?.entity;
  const rzpOrderId = paymentEntity?.order_id || eventPayload?.payload?.order?.entity?.id;
  const orderIdFromNotes = paymentEntity?.notes?.orderId;

  // Locate payment document
  let payment = null;
  if (rzpOrderId) {
    payment = await Payment.findOne({ razorpayOrderId: rzpOrderId });
  }
  if (!payment && orderIdFromNotes) {
    payment = await Payment.findOne({ orderId: orderIdFromNotes });
  }

  if (!payment) {
    // Payment record might not be found if event is unrelated or test event
    return res.status(200).json({ status: "ignored", message: "No matching payment record found" });
  }

  // Hard rule #5: Idempotency check on gateway event ID
  if (payment.gatewayEventIds.includes(eventId)) {
    return res.status(200).json({ status: "ok", message: "Duplicate event skipped" });
  }

  // Record event in idempotency list and raw event audit log
  payment.gatewayEventIds.push(eventId);
  payment.webhookEventLog.push({
    eventId,
    event: eventName,
    receivedAt: new Date(),
    payload: eventPayload,
  });

  // Handle specific event types
  if (eventName === "payment.captured" || eventName === "order.paid") {
    payment.status = "captured";
    if (paymentEntity?.id) {
      payment.razorpayPaymentId = paymentEntity.id;
    }
    await payment.save();

    // Confirm order
    const order = await Order.findById(payment.orderId);
    if (order && order.status === "pending") {
      order.status = "confirmed";
      await order.save();
    }
  } else if (eventName === "payment.failed") {
    payment.status = "failed";
    await payment.save();
  } else {
    await payment.save();
  }

  return res.status(200).json({ status: "ok" });
}

/**
 * Releases escrow hold once produce is delivered (or triggered by admin).
 */
export async function release(req: Request, res: Response, next: NextFunction) {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);
    if (!order) throw new AppError("Order not found", 404);

    const payment = await Payment.findOne({ orderId: order._id });
    if (!payment) throw new AppError("Payment record not found", 404);

    if (payment.status !== "captured" && payment.status !== "held") {
      throw new AppError(`Cannot release payment with status '${payment.status}'`, 400);
    }

    payment.status = "released";
    payment.releasedAt = new Date();
    await payment.save();

    // Notify farmer of escrow release
    notificationService.notifyEscrowReleased({
      farmerId: order.farmerId,
      amount: payment.amount,
      orderId: (order._id?.toString() || order.id || orderId) as string,
    });

    res.status(200).json({
      data: {
        message: "Payment released to farmer successfully",
        payment,
      },
    });
  } catch (e) {
    next(e);
  }
}

/**
 * Gets payment details for an order (buyer, farmer, or admin).
 */
export async function getByOrderId(req: Request, res: Response, next: NextFunction) {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);
    if (!order) throw new AppError("Order not found", 404);

    if (
      req.user!.role !== "admin" &&
      order.buyerId !== req.user!.id &&
      order.farmerId !== req.user!.id
    ) {
      throw new AppError("Forbidden", 403);
    }

    const payment = await Payment.findOne({ orderId: order._id });
    if (!payment) {
      return res.status(200).json({ data: null });
    }

    res.status(200).json({ data: payment });
  } catch (e) {
    next(e);
  }
}

/**
 * Admin override route for manual refund or escrow release (Hard rule #3 & T4.5).
 */
export async function adminOverride(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { action, reason } = req.body;

    if (!["release", "refund"].includes(action)) {
      throw new AppError("Action must be either 'release' or 'refund'", 400);
    }
    if (!reason || typeof reason !== "string" || !reason.trim()) {
      throw new AppError("A valid reason is required for admin payment override", 400);
    }

    const payment = await Payment.findById(id);
    if (!payment) throw new AppError("Payment record not found", 404);

    if (action === "release") {
      payment.status = "released";
      payment.releasedAt = new Date();
    } else {
      payment.status = "refunded";
      payment.refundedAt = new Date();
    }

    payment.adminOverrideReason = reason.trim();
    payment.adminOverrideBy = req.user!.id;
    await payment.save();

    res.status(200).json({
      data: {
        message: `Payment status successfully overridden to '${payment.status}'`,
        payment,
      },
    });
  } catch (e) {
    next(e);
  }
}
