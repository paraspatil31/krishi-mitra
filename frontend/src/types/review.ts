export interface Review {
  id: string;
  reviewerId: string;
  reviewerName: string;
  reviewerRole: "buyer" | "farmer";
  targetUserId: string;
  targetUserRole: "buyer" | "farmer";
  orderId: string;
  rating: number;
  comment: string;
  cropName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewSummary {
  totalReviews: number;
  averageRating: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface CreateReviewPayload {
  orderId: string;
  rating: number;
  comment: string;
}
