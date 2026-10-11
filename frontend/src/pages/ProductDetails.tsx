import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { productService } from "@/services/product.service";
import { useCart } from "@/context/CartContext";
import type { Product } from "@/types/product";
import Spinner from "@/components/common/Spinner";
import VerifiedBadge from "@/components/common/VerifiedBadge";
import ProvenanceModal from "@/components/listings/ProvenanceModal";
import MandiBenchmarkBadge from "@/components/mandi/MandiBenchmarkBadge";
import MakeOfferModal from "@/components/offers/MakeOfferModal";
import QualityGradeBadge from "@/components/common/QualityGradeBadge";
import RatingStars from "@/components/reviews/RatingStars";
import { reviewService } from "@/services/review.service";
import { useAuth } from "@/context/AuthContext";

const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  vegetables: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&auto=format&fit=crop&q=80",
  fruits: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=800&auto=format&fit=crop&q=80",
  grains: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&auto=format&fit=crop&q=80",
  dairy: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800&auto=format&fit=crop&q=80",
  herbs: "https://images.unsplash.com/photo-1509358271058-acd22cc93898?w=800&auto=format&fit=crop&q=80",
  other: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&auto=format&fit=crop&q=80",
};

export default function ProductDetails() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [showProvenance, setShowProvenance] = useState(false);
  const [showMakeOffer, setShowMakeOffer] = useState(false);
  const [farmerReviews, setFarmerReviews] = useState<{ count: number; average: number }>({ count: 0, average: 0 });
  const { add } = useCart();

  useEffect(() => {
    if (!id || id === "undefined") {
      setLoading(false);
      setError("Invalid product ID");
      return;
    }

    setLoading(true);
    setError("");
    productService
      .getProductById(id)
      .then((data) => {
        setProduct(data);
        setError("");
        if ((data as any)?.farmerId) {
          reviewService
            .getUserReviews((data as any).farmerId)
            .then((res) => {
              if (res.summary) {
                setFarmerReviews({
                  count: res.summary.totalReviews,
                  average: res.summary.averageRating,
                });
              }
            })
            .catch(() => {});
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load product");
        setProduct(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  function getSafeProduct() {
    if (!product) return null;
    return {
      ...product,
      id: product.id || (product as any)._id || id!,
    };
  }

  function handleAddToCart() {
    const safeProduct = getSafeProduct();
    if (!safeProduct) return;
    add(safeProduct, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  }

  function handleBuyNow() {
    const safeProduct = getSafeProduct();
    if (!safeProduct) return;
    add(safeProduct, qty);
    navigate("/checkout");
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-24 flex flex-col items-center justify-center">
        <Spinner size="lg" />
        <p className="mt-4 text-sm text-gray-500">{t("products.loadingDetails", "Loading produce details…")}</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-2xl text-amber-700 mb-4">
          🌾
        </div>
        <h2 className="text-2xl font-bold text-gray-900">{t("products.productNotAvailable", "Product Not Available")}</h2>
        <p className="mt-2 text-gray-600">
          {error || "This listing could not be found or may have been removed."}
        </p>
        <Link
          to="/products"
          className="mt-6 inline-block rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-emerald-700 transition-colors"
        >
          {t("products.browseOther", "← Browse Other Products")}
        </Link>
      </div>
    );
  }

  const isOutOfStock = product.quantity <= 0;
  const fallbackImg = CATEGORY_FALLBACK_IMAGES[product.category] || CATEGORY_FALLBACK_IMAGES.vegetables;
  const displayImg = product.images && product.images.length > 0 ? product.images[0] : fallbackImg;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
      <Link
        to="/products"
        className="inline-flex items-center text-sm font-semibold text-emerald-700 hover:text-emerald-800 mb-6 group"
      >
        <span className="group-hover:-translate-x-1 transition-transform mr-1">&larr;</span> {t("products.backToMarket", "Back to Marketplace")}
      </Link>

      <div className="grid gap-8 lg:gap-12 md:grid-cols-2 items-start">
        {/* Product Image or Fallback */}
        <div className="overflow-hidden rounded-3xl border border-gray-100 bg-gray-50 shadow-sm relative">
          <img
            src={displayImg}
            alt={product.name}
            className="h-80 w-full object-cover sm:h-[480px]"
            onError={(e) => {
              (e.target as HTMLImageElement).src = fallbackImg;
            }}
          />

          {/* Stock Badge */}
          <span
            className={`absolute top-4 right-4 rounded-full px-3.5 py-1 text-xs font-bold shadow-md ${
              isOutOfStock
                ? "bg-red-500 text-white"
                : product.quantity <= 5
                ? "bg-amber-500 text-white"
                : "bg-emerald-600 text-white"
            }`}
          >
            {isOutOfStock
              ? t("listing.soldOut", "Sold Out")
              : product.quantity <= 5
              ? t("products.onlyLeft", { count: product.quantity, unit: product.unit, defaultValue: `Only ${product.quantity} ${product.unit} left` })
              : t("listing.availableStock", "In Stock")}
          </span>
        </div>

        {/* Product Info */}
        <div className="flex flex-col">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-block rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800">
              {product.category}
            </span>
            <QualityGradeBadge grade={(product as any).qualityGrade || "A"} />
          </div>

          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
            {product.name}
          </h1>

          <p className="mt-4 text-sm sm:text-base leading-relaxed text-gray-600">
            {product.description}
          </p>

          <div className="mt-6 border-y border-gray-100 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold text-gray-900">
                  ₹{product.price.toFixed(2)}
                </span>
                <span className="text-sm font-medium text-gray-500">
                  / {product.unit}
                </span>
              </div>
              <MandiBenchmarkBadge cropName={product.name} district={product.location} />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {t("products.availableInventory", "Available Inventory:")}{" "}
              <span className="font-semibold text-gray-800">
                {product.quantity} {product.unit}
              </span>
            </p>
          </div>

          <div className="mt-4 space-y-2.5 text-sm text-gray-600 bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">{t("products.farmer", "Farmer")}:</span>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{product.farmerName}</span>
                  <VerifiedBadge type="farmer" />
                </div>
                {farmerReviews.count > 0 ? (
                  <RatingStars
                    rating={farmerReviews.average}
                    count={farmerReviews.count}
                    size="sm"
                  />
                ) : (
                  <span className="text-[11px] text-gray-400">{t("products.newVerifiedProducer", "★ New Verified Producer")}</span>
                )}
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t("products.location", "Location")}:</span>
              <span className="font-medium text-gray-800">📍 {product.location}</span>
            </div>
            {product.harvestDate && (
              <div className="flex justify-between">
                <span className="text-gray-500">{t("products.harvestDate", "Harvest Date")}:</span>
                <span className="font-medium text-gray-800">
                  {new Date(product.harvestDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
            <div className="pt-2.5 border-t border-gray-200/60 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-emerald-800 font-medium flex items-center gap-1.5">
                <span>🔗</span> {t("products.cryptographicOrigin", "Blockchain Provenance:")}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowProvenance(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200/90 text-emerald-900 px-2.5 py-1 text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <span>📜</span> Certificate
                </button>
                <Link
                  to={`/verify/${id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 px-2 py-1 text-xs font-bold transition shadow-xs"
                  title="Open full public verification page & QR code"
                >
                  <span>QR Verify</span>
                  <span>↗</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Stepper & Actions */}
          {!isOutOfStock ? (
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center rounded-xl border border-gray-200 bg-white">
                  <button
                    type="button"
                    onClick={() => setQty((prev) => Math.max(1, prev - 1))}
                    disabled={qty <= 1}
                    className="px-3.5 py-2 text-base font-bold text-gray-600 hover:text-emerald-700 disabled:opacity-30"
                  >
                    –
                  </button>
                  <span className="w-10 text-center font-bold text-gray-900 text-sm">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQty((prev) => Math.min(product.quantity, prev + 1))}
                    disabled={qty >= product.quantity}
                    className="px-3.5 py-2 text-base font-bold text-gray-600 hover:text-emerald-700 disabled:opacity-30"
                  >
                    +
                  </button>
                </div>

                <span className="text-xs text-gray-500">
                  {t("common.subtotal", "Subtotal:")} <strong>₹{(product.price * qty).toFixed(2)}</strong>
                </span>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="flex-1 rounded-xl border-2 border-emerald-600 bg-white px-5 py-3 text-sm font-bold text-emerald-700 hover:bg-emerald-50 transition-colors"
                >
                  {added ? t("products.added", "Added to Cart ✓") : t("products.addToCart", "Add to Cart")}
                </button>

                <button
                  type="button"
                  onClick={handleBuyNow}
                  className="flex-1 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
                >
                  {t("products.buyNow", "Buy Now")} &rarr;
                </button>

                {/* Make Offer / Direct Negotiation Button */}
                {(!user || user.role === "buyer") && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!isAuthenticated) {
                        navigate("/login");
                      } else {
                        setShowMakeOffer(true);
                      }
                    }}
                    className="w-full rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-2.5 text-xs font-bold text-amber-900 hover:from-amber-100 hover:to-orange-100 transition-all flex items-center justify-center gap-2 shadow-2xs"
                  >
                    <span>🤝</span>
                    <span>{t("products.proposePriceOffer", "Propose Price Offer / Bulk Discount")}</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl bg-gray-100 p-4 text-center text-sm font-semibold text-gray-600">
              {t("products.soldOutNotice", "This produce is currently sold out. Check back soon for the next harvest!")}
            </div>
          )}

          <div className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5 text-xs text-emerald-900 flex items-start gap-2.5">
            <span className="text-base">🔒</span>
            <p>
              {t("products.escrowNote", { name: product.farmerName, defaultValue: `Direct Escrow Protection: Your payment is held safely and released to ${product.farmerName} only after you inspect and accept delivery.` })}
            </p>
          </div>
        </div>
      </div>

      {/* Provenance Modal */}
      <ProvenanceModal
        isOpen={showProvenance}
        listingId={id || ""}
        cropName={product.name}
        onClose={() => setShowProvenance(false)}
      />

      {/* Make Offer Modal */}
      {product && (
        <MakeOfferModal
          isOpen={showMakeOffer}
          listing={product}
          onClose={() => setShowMakeOffer(false)}
        />
      )}
    </div>
  );
}
