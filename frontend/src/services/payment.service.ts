import { api } from "./api";
import type {
  InitiatePaymentResponse,
  VerifyPaymentPayload,
  PaymentRecord,
} from "@/types/payment";

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && (window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export const paymentService = {
  async initiate(orderId: string): Promise<InitiatePaymentResponse> {
    const res = await api.post<{ data: InitiatePaymentResponse }>("/payments/initiate", {
      orderId,
    });
    return res.data;
  },

  async verify(payload: VerifyPaymentPayload): Promise<any> {
    const res = await api.post<{ data: any }>("/payments/verify", payload);
    return res.data;
  },

  async getByOrderId(orderId: string): Promise<PaymentRecord | null> {
    const res = await api.get<{ data: PaymentRecord | null }>(`/payments/order/${orderId}`);
    return res.data;
  },

  async release(orderId: string): Promise<any> {
    const res = await api.post<{ data: any }>(`/payments/release/${orderId}`, {});
    return res.data;
  },
};
