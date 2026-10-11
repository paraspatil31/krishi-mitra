import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { reviewService } from "@/services/review.service";
import type { Review } from "@/types/review";
import RatingStars from "./RatingStars";
import Button from "@/components/common/Button";
import ErrorMessage from "@/components/common/ErrorMessage";

interface OrderReviewCardProps {
  orderId: string;
  orderStatus: string;
  isBuyer: boolean;
  farmerName: string;
  buyerName: string;
}

export default function OrderReviewCard({
  orderId,
  orderStatus,
  isBuyer,
  farmerName,
  buyerName,
}: OrderReviewCardProps) {
  const { t } = useTranslation();
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>("");
  const [showForm, setShowForm] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    if (orderStatus === "delivered") {
      setLoading(true);
      reviewService
        .getOrderReview(orderId)
        .then((existing) => {
          if (mounted) setReview(existing);
        })
        .catch(() => {})
        .finally(() => {
          if (mounted) setLoading(false);
        });
    } else {
      setLoading(false);
    }
    return () => {
      mounted = false;
    };
  }, [orderId, orderStatus]);

  if (orderStatus !== "delivered") {
    return null;
  }

  const targetName = isBuyer ? farmerName : buyerName;
  const targetRole = isBuyer ? "Kisan / Farmer" : "Buyer";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!comment.trim() || comment.trim().length < 3) {
      setError("Please write at least 3 characters in your review comment.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await reviewService.createReview({
        orderId,
        rating,
        comment: comment.trim(),
      });
      setReview(created);
      setShowForm(false);
    } catch (err: any) {
      setError(err.message || "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs animate-pulse">
        <div className="h-5 w-48 bg-gray-200 rounded-md mb-3" />
        <div className="h-4 w-full bg-gray-100 rounded-md" />
      </div>
    );
  }

  // Already reviewed state
  if (review) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50/40 p-6 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌟</span>
            <div>
              <h4 className="text-sm font-bold text-gray-900">
                Your Verified Delivery Review
              </h4>
              <p className="text-xs text-emerald-800">
                Feedback for {targetName} ({targetRole})
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
            Verified Delivered Order
          </span>
        </div>

        <div className="space-y-1.5">
          <RatingStars rating={review.rating} size="md" />
          <p className="text-sm text-gray-700 italic bg-white p-3 rounded-2xl border border-emerald-100 shadow-2xs">
            "{review.comment}"
          </p>
          <p className="text-[11px] text-gray-400">
            Submitted on {new Date(review.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
          </p>
        </div>
      </div>
    );
  }

  // Unreviewed state: prompt to write review
  return (
    <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50/60 to-emerald-50/30 p-6 shadow-xs space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 text-2xl shadow-2xs">
            ⭐
          </div>
          <div>
            <h4 className="text-sm font-black text-gray-900" style={{ fontFamily: "var(--font-heading)" }}>
              {isBuyer ? `Rate produce & service from ${targetName}` : `Review buyer experience with ${targetName}`}
            </h4>
            <p className="text-xs text-gray-600">
              Delivery has been completed! Help build community trust with a verified post-delivery rating.
            </p>
          </div>
        </div>
        {!showForm && (
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
            className="shrink-0 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-xs"
          >
            {t("products.writeReview", "Write Review")}
          </Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t border-amber-200/80 space-y-4">
          <ErrorMessage message={error} />

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Your Rating (1 to 5 Stars)
            </label>
            <div className="flex items-center gap-3 bg-white px-3 py-2 rounded-2xl border border-gray-200 w-fit">
              <RatingStars
                rating={rating}
                editable={true}
                size="lg"
                onChange={setRating}
              />
              <span className="text-xs font-black text-emerald-800">
                {rating === 5 ? "5/5 — Excellent!" : rating === 4 ? "4/5 — Very Good" : rating === 3 ? "3/5 — Good" : rating === 2 ? "2/5 — Fair" : "1/5 — Needs Improvement"}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Review Comment & Experience
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                isBuyer
                  ? "Describe crop freshness, packaging quality, grading accuracy, and delivery satisfaction..."
                  : "Comment on buyer coordination, prompt delivery receipt, and communication..."
              }
              rows={3}
              className="w-full rounded-2xl border border-gray-200 p-3 text-xs text-gray-800 focus:border-emerald-600 focus:outline-none bg-white shadow-2xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-xl px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {t("common.cancel")}
            </button>
            <Button
              type="submit"
              size="sm"
              loading={submitting}
              className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-xs"
            >
              {t("products.submitReview", "Submit Verified Review")}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
