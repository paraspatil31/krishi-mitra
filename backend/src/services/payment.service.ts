import crypto from "crypto";
import Razorpay from "razorpay";

let razorpayInstance: Razorpay | null = null;

export function getRazorpayClient(): Razorpay | null {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret || key_id.startsWith("your_")) {
    return null;
  }

  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id,
      key_secret,
    });
  }

  return razorpayInstance;
}

export interface CreateOrderParams {
  amountInPaise: number;
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResult {
  id: string;
  amount: number;
  currency: string;
  receipt?: string;
  isMock?: boolean;
}

/**
 * Creates a Razorpay order. If keys are missing (e.g. initial dev before account creation),
 * it returns a safe mock order so frontend checkout flow can still be previewed.
 */
export async function createRazorpayOrder(params: CreateOrderParams): Promise<RazorpayOrderResult> {
  const client = getRazorpayClient();

  if (!client) {
    // Dev fallback when keys are not configured yet
    const mockId = `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return {
      id: mockId,
      amount: params.amountInPaise,
      currency: params.currency || "INR",
      receipt: params.receipt,
      isMock: true,
    };
  }

  const order = await client.orders.create({
    amount: params.amountInPaise,
    currency: params.currency || "INR",
    receipt: params.receipt,
    notes: params.notes,
  });

  return {
    id: order.id,
    amount: Number(order.amount),
    currency: order.currency,
    receipt: order.receipt,
    isMock: false,
  };
}

/**
 * Verifies Razorpay payment signature returned on frontend checkout completion
 */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret || secret.startsWith("your_")) {
    // In mock/dev mode without real secret, verify if dummy signature or mock
    return orderId.startsWith("order_mock_");
  }

  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  return expectedSignature === signature;
}

/**
 * Verifies Razorpay webhook signature against raw request body
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret || webhookSecret.startsWith("your_")) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  return expectedSignature === signature;
}
