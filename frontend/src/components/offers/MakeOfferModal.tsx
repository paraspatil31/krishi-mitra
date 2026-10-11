import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { offerService } from "@/services/offer.service";
import type { Product, Listing } from "@/types/product";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import ErrorMessage from "@/components/common/ErrorMessage";

interface MakeOfferModalProps {
  isOpen: boolean;
  listing: Product | Listing;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function MakeOfferModal({
  isOpen,
  listing,
  onClose,
  onSuccess,
}: MakeOfferModalProps) {
  const { t } = useTranslation();
  const [offerPrice, setOfferPrice] = useState<number>(Math.round(listing.price * 0.9)); // Default to 10% discount
  const [offerQuantity, setOfferQuantity] = useState<number>(Math.min(5, listing.quantity));
  const [note, setNote] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [submitted, setSubmitted] = useState<boolean>(false);

  if (!isOpen) return null;

  const totalValue = Math.round(offerPrice * offerQuantity * 100) / 100;
  const originalTotal = Math.round(listing.price * offerQuantity * 100) / 100;
  const savings = Math.max(0, originalTotal - totalValue);
  const discountPct = listing.price > 0 ? Math.round(((listing.price - offerPrice) / listing.price) * 100) : 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (offerPrice <= 0) {
      setError("Please enter a valid offer price per unit.");
      return;
    }
    if (offerQuantity <= 0) {
      setError("Please enter a valid requested quantity.");
      return;
    }
    if (offerQuantity > listing.quantity) {
      setError(`Cannot request more than the available stock (${listing.quantity} ${listing.unit}).`);
      return;
    }

    setLoading(true);
    try {
      await offerService.createOffer({
        listingId: listing.id,
        offerPrice,
        offerQuantity,
        note: note.trim() || undefined,
      });
      setSubmitted(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to submit price offer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-3xl border border-emerald-900/20 bg-white p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Subtle decorative top bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-600 via-amber-500 to-emerald-700" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800">
              {t("offers.title")}
            </span>
            <h3 className="text-xl font-black text-gray-900" style={{ fontFamily: "var(--font-heading)" }}>
              {t("offers.proposeOffer")}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            ✕
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl mx-auto">
              🤝
            </div>
            <div>
              <h4 className="text-lg font-black text-gray-900">{t("offers.submitOffer")}!</h4>
              <p className="text-xs text-gray-600 mt-1 max-w-sm mx-auto leading-relaxed">
                Your bid of <strong>₹{offerPrice}/{listing.unit}</strong> for <strong>{offerQuantity} {listing.unit}</strong> has been transmitted directly to <strong>{listing.farmerName}</strong>.
              </p>
            </div>
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 max-w-sm mx-auto text-left flex items-start gap-2">
              <span className="text-base">⏳</span>
              <span>The farmer has <strong>72 hours</strong> to review and accept your offer. When accepted, an order is confirmed automatically.</span>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Link
                to="/buyer/offers"
                className="rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 transition-colors shadow-xs"
              >
                View My Active Offers &rarr;
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {t("common.close", "Close")}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {error && <ErrorMessage message={error} />}

            {/* Produce Summary Card */}
            <div className="flex items-center justify-between p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-100">
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase">{t("products.harvestDate", "Target Harvest")}</p>
                <p className="text-sm font-black text-gray-900">{listing.name}</p>
                <p className="text-[11px] text-gray-600">{t("products.farmer", "Farmer")}: {listing.farmerName}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 font-bold uppercase">{t("listing.pricePerUnit", "Listed Rate")}</p>
                <p className="text-base font-black text-emerald-800">₹{listing.price}/{listing.unit}</p>
                <p className="text-[11px] text-gray-500">{t("products.stock", "In Stock")}: {listing.quantity} {listing.unit}</p>
              </div>
            </div>

            {/* Offer Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label={`${t("offers.yourOffer")} (₹/${listing.unit})`}
                  type="number"
                  step="0.5"
                  min="1"
                  value={String(offerPrice)}
                  onChange={(e) => setOfferPrice(parseFloat(e.target.value) || 0)}
                  required
                />
                {discountPct !== 0 && (
                  <p className={`text-[11px] mt-1 font-bold ${discountPct > 0 ? "text-emerald-700" : "text-amber-700"}`}>
                    {discountPct > 0 ? `🔥 ${discountPct}% below listed rate` : `Above listing rate`}
                  </p>
                )}
              </div>

              <div>
                <Input
                  label={`${t("offers.offeredQuantity")} (${listing.unit})`}
                  type="number"
                  min="1"
                  max={listing.quantity}
                  value={String(offerQuantity)}
                  onChange={(e) => setOfferQuantity(parseInt(e.target.value) || 0)}
                  required
                />
                <p className="text-[11px] mt-1 text-gray-500">
                  Max available: {listing.quantity} {listing.unit}
                </p>
              </div>
            </div>

            {/* Note to Farmer */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Note for Farmer (Optional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g., Looking for ongoing weekly deliveries or farm-gate pickup this Sunday..."
                rows={2}
                maxLength={400}
                className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-xs text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
              />
            </div>

            {/* Cost Breakdown Box */}
            <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Proposed Total Value:</span>
                <span className="font-bold text-gray-900">₹{totalValue.toFixed(2)}</span>
              </div>
              {savings > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>{t("offers.potentialSavings")}:</span>
                  <span>-₹{savings.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-200">
                <span>Terms:</span>
                <span>Direct escrow guarantee upon acceptance</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {t("common.cancel")}
              </button>
              <Button
                type="submit"
                loading={loading}
                className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:from-emerald-500 hover:to-emerald-600"
              >
                {t("offers.submitOffer")} &rarr;
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
