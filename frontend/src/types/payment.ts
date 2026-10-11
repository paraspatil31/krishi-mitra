export type PaymentStatus =
  | "initiated"
  | "captured"
  | "held"
  | "released"
  | "refunded"
  | "failed";

export interface InitiatePaymentResponse {
  paymentId: string;
  orderId: string;
  razorpayOrderId: string;
  amount: number; // in paise
  currency: string;
  keyId: string;
  isMock: boolean;
  buyerName: string;
}

export interface VerifyPaymentPayload {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature?: string;
}

export interface PaymentRecord {
  _id: string;
  orderId: string;
  buyerId: string;
  farmerId: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  amount: number;
  amountPaise: number;
  currency: string;
  status: PaymentStatus;
  releasedAt?: string;
  createdAt: string;
  updatedAt: string;
}
