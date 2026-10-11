import { api } from "./api";
import type { Review, ReviewSummary, CreateReviewPayload } from "@/types/review";

export const reviewService = {
  async createReview(payload: CreateReviewPayload): Promise<Review> {
    const res = await api.post<{ data: Review }>("/reviews", payload);
    return res.data;
  },

  async getUserReviews(userId: string): Promise<{ data: Review[]; summary: ReviewSummary }> {
    const res = await api.get<{ data: Review[]; summary: ReviewSummary }>(`/reviews/user/${userId}`);
    return res;
  },

  async getOrderReview(orderId: string): Promise<Review | null> {
    const res = await api.get<{ data: Review | null }>(`/reviews/order/${orderId}`);
    return res.data;
  },
};
