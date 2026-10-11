import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { Listing } from "@/types/product";
import Button from "@/components/common/Button";
import ProvenanceModal from "./ProvenanceModal";
import QualityGradeBadge from "@/components/common/QualityGradeBadge";

interface ListingCardProps {
  listing: Listing;
  onDelete: (id: string) => void;
  deleting?: boolean;
}

const STATUS_STYLES: Record<Listing["status"], { badge: string; dot: string }> = {
  active: {
    badge: "bg-emerald-50 text-emerald-800 border-emerald-300/80 shadow-xs",
    dot: "bg-emerald-500 animate-pulse",
  },
  draft: {
    badge: "bg-amber-50 text-amber-800 border-amber-300/80 shadow-xs",
    dot: "bg-amber-500",
  },
  sold_out: {
    badge: "bg-red-50 text-red-800 border-red-300/80 shadow-xs",
    dot: "bg-red-500",
  },
  archived: {
    badge: "bg-gray-100 text-gray-700 border-gray-300 shadow-xs",
    dot: "bg-gray-400",
  },
};

const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  vegetables: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80",
  fruits: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600&auto=format&fit=crop&q=80",
  grains: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&auto=format&fit=crop&q=80",
  dairy: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80",
  herbs: "https://images.unsplash.com/photo-1509358271058-acd22cc93898?w=600&auto=format&fit=crop&q=80",
  other: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&auto=format&fit=crop&q=80",
};

export default function ListingCard({ listing, onDelete, deleting = false }: ListingCardProps) {
  const { t } = useTranslation();
  const listingId = listing.id || (listing as any)._id;
  const statusMeta = STATUS_STYLES[listing.status] || STATUS_STYLES.draft;
  const fallbackImg = CATEGORY_FALLBACK_IMAGES[listing.category?.toLowerCase()] || CATEGORY_FALLBACK_IMAGES.vegetables;
  const imageSrc = listing.images && listing.images[0] ? listing.images[0] : fallbackImg;
  const isLowStock = listing.quantity > 0 && listing.quantity <= 15;
  const isOutOfStock = listing.quantity === 0;
  const [showProvenance, setShowProvenance] = useState(false);

  const statusTexts: Record<Listing["status"], string> = {
    active: t("listing.activeInStore"),
    draft: t("listing.draftHidden"),
    sold_out: t("listing.soldOut"),
    archived: t("listing.archived"),
  };

  return (
    <div className="group relative rounded-3xl border border-gray-200/80 bg-white overflow-hidden shadow-xs hover:shadow-xl hover:border-emerald-300/80 transition-all duration-300 card-hover-lift flex flex-col">
      {/* Visual Crop Header */}
      <div className="relative h-48 w-full overflow-hidden bg-gray-100 shrink-0">
        <img
          src={imageSrc}
          alt={listing.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold backdrop-blur-md ${statusMeta.badge}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
            {statusTexts[listing.status] || statusTexts.draft}
          </span>
        </div>

        {/* Category & Quality Pill */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-black/40 backdrop-blur-md border border-white/20 px-2.5 py-1 text-[11px] font-bold text-white uppercase tracking-wider">
            <span>🌿</span>
            <span>{listing.category}</span>
          </span>
          <QualityGradeBadge grade={(listing as any).qualityGrade || "A"} size="sm" showLabel={false} />
        </div>

        {/* Price & Unit Overlay */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white">
          <div>
            <p className="text-xl font-black drop-shadow-sm">
              ₹{listing.price.toFixed(2)}
              <span className="text-xs font-normal text-emerald-100"> / {listing.unit}</span>
            </p>
          </div>
          {listing.location && (
            <span className="text-[11px] font-semibold text-emerald-50/90 bg-black/30 backdrop-blur-xs px-2 py-0.5 rounded-md truncate max-w-[130px]">
              📍 {listing.location}
            </span>
          )}
        </div>
      </div>

      {/* Details Body */}
      <div className="flex flex-col flex-1 p-5">
        <div className="flex items-start justify-between gap-2">
          <h3
            className="font-extrabold text-lg text-gray-900 line-clamp-1 group-hover:text-emerald-700 transition-colors"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {listing.name}
          </h3>
        </div>

        <p className="mt-1.5 text-xs text-gray-500 line-clamp-2 leading-relaxed flex-1">
          {listing.description || "Freshly harvested produce cultivated with sustainable farm practices."}
        </p>

        {/* Stock Status Bar */}
        <div className="mt-4 rounded-2xl bg-gray-50 border border-gray-100 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-gray-700 flex items-center gap-1">
              <span>📦</span> {t("listing.availableStock")}:
            </span>
            <span
              className={`font-black ${
                isOutOfStock
                  ? "text-red-600"
                  : isLowStock
                  ? "text-amber-600"
                  : "text-emerald-700"
              }`}
            >
              {listing.quantity} {listing.unit}
              {isOutOfStock ? ` (${t("listing.empty")})` : isLowStock ? ` (${t("listing.low")})` : ""}
            </span>
          </div>

          {/* Progress gauge */}
          <div className="mt-2 h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isOutOfStock
                  ? "w-0"
                  : isLowStock
                  ? "bg-amber-500 w-1/4"
                  : "bg-emerald-600 w-3/4"
              }`}
            />
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
            <span>
              {t("listing.harvest")}:{" "}
              <strong className="text-gray-600 font-semibold">
                {listing.harvestDate
                  ? new Date(listing.harvestDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Recent"}
              </strong>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowProvenance(true)}
                className="text-amber-800 hover:text-amber-900 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md hover:bg-amber-100 transition text-[10px]"
                title="View cryptographic provenance certificate"
              >
                📜 {t("listing.provenance")}
              </button>
              <Link
                to={`/products/${listingId}`}
                className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("listing.buyerView")} ↗
              </Link>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2">
          <Link
            to={`/farmer/listings/${listingId}/edit`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-600/30 bg-emerald-50/50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 hover:border-emerald-500 transition-all btn-spring"
          >
            <span>✏️</span> {t("listing.editCrop")}
          </Link>
          <Button
            variant="danger"
            size="sm"
            onClick={() => onDelete(listingId)}
            loading={deleting}
            className="rounded-xl px-3 py-2 text-xs font-bold btn-spring"
            title={t("listing.deleteCrop")}
          >
            <span>🗑️</span>
          </Button>
        </div>
      </div>

      <ProvenanceModal
        isOpen={showProvenance}
        listingId={listingId}
        cropName={listing.name}
        onClose={() => setShowProvenance(false)}
      />
    </div>
  );
}
