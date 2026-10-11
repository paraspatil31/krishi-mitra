import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { offerService } from "@/services/offer.service";
import type { Offer, OfferStatus } from "@/types/offer";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { FARMER_NAV } from "./navItems";
import Spinner from "@/components/common/Spinner";
import Button from "@/components/common/Button";

export default function FarmerOffers() {
  const { t } = useTranslation();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OfferStatus | "all">("all");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [rejectModalOffer, setRejectModalOffer] = useState<Offer | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    loadOffers();
  }, []);

  async function loadOffers() {
    setLoading(true);
    try {
      const data = await offerService.getMyOffers();
      setOffers(data);
    } catch (err) {
      console.error("Failed to load farmer offers:", err);
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept(offer: Offer) {
    if (!window.confirm(`Accept ₹${offer.offerPrice}/${offer.unit} for ${offer.offerQuantity} ${offer.unit} from ${offer.buyerName}? This will atomically reserve inventory and create an active order.`)) {
      return;
    }

    setActionLoadingId(offer.id);
    setFeedbackMsg(null);
    try {
      await offerService.respondToOffer(offer.id, { action: "accept" });
      setFeedbackMsg({
        text: `✅ Offer from ${offer.buyerName} accepted! Order created atomically and inventory deducted.`,
        type: "success",
      });
      await loadOffers();
    } catch (err: any) {
      setFeedbackMsg({
        text: `❌ ${err.message || "Failed to accept offer."}`,
        type: "error",
      });
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleRejectSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rejectModalOffer) return;

    setActionLoadingId(rejectModalOffer.id);
    setFeedbackMsg(null);
    try {
      await offerService.respondToOffer(rejectModalOffer.id, {
        action: "reject",
        reason: rejectReason.trim() || "Offer declined by producer",
      });
      setFeedbackMsg({
        text: `Offer from ${rejectModalOffer.buyerName} was declined.`,
        type: "success",
      });
      setRejectModalOffer(null);
      setRejectReason("");
      await loadOffers();
    } catch (err: any) {
      setFeedbackMsg({
        text: `❌ ${err.message || "Failed to decline offer."}`,
        type: "error",
      });
    } finally {
      setActionLoadingId(null);
    }
  }

  const filteredOffers = offers.filter((o) => {
    if (filter === "all") return true;
    return o.status === filter;
  });

  const pendingOffers = offers.filter((o) => o.status === "pending");
  const acceptedOffers = offers.filter((o) => o.status === "accepted");
  const totalRealized = acceptedOffers.reduce((sum, o) => sum + o.offerPrice * o.offerQuantity, 0);

  return (
    <DashboardLayout
      title={t("nav.priceOffers", "Offer Negotiations")}
      subtitle={t("offers.subtitle", "Direct buyer volume bids, wholesale proposals & atomic order conversion")}
      navItems={FARMER_NAV}
    >
      <div className="space-y-6 pb-12 max-w-7xl mx-auto">
        {/* KPI Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-2xl">⏳</span>
              <span className="rounded-full bg-amber-200/70 px-2.5 py-0.5 text-xs font-black text-amber-900">
                Action Needed
              </span>
            </div>
            <p className="text-3xl font-black text-gray-900 mt-3">{pendingOffers.length}</p>
            <p className="text-xs font-bold text-gray-600 mt-0.5">Pending Buyer Offers</p>
          </div>

          <div className="rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-2xl">🤝</span>
              <span className="rounded-full bg-emerald-200/70 px-2.5 py-0.5 text-xs font-black text-emerald-900">
                Deals Closed
              </span>
            </div>
            <p className="text-3xl font-black text-gray-900 mt-3">{acceptedOffers.length}</p>
            <p className="text-xs font-bold text-gray-600 mt-0.5">Accepted Direct Offers</p>
          </div>

          <div className="rounded-3xl border border-blue-200/80 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-2xl">💰</span>
              <span className="rounded-full bg-blue-200/70 px-2.5 py-0.5 text-xs font-black text-blue-900">
                Gross Volume
              </span>
            </div>
            <p className="text-3xl font-black text-gray-900 mt-3">₹{totalRealized.toFixed(2)}</p>
            <p className="text-xs font-bold text-gray-600 mt-0.5">Realized from Negotiations</p>
          </div>
        </div>

        {/* Global Feedback Alert */}
        {feedbackMsg && (
          <div
            className={`rounded-2xl border p-4 text-xs font-bold flex items-center justify-between gap-3 shadow-xs ${
              feedbackMsg.type === "success"
                ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                : "bg-red-50 border-red-300 text-red-900"
            }`}
          >
            <span>{feedbackMsg.text}</span>
            <button
              type="button"
              onClick={() => setFeedbackMsg(null)}
              className="text-gray-400 hover:text-gray-700 font-black px-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Filter Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-4">
          <div className="flex flex-wrap gap-2">
            {(["all", "pending", "accepted", "rejected", "expired"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all capitalize ${
                  filter === tab
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {tab === "all" ? `All (${offers.length})` : tab}
                {tab === "pending" && pendingOffers.length > 0 && ` (${pendingOffers.length})`}
                {tab === "accepted" && acceptedOffers.length > 0 && ` (${acceptedOffers.length})`}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={loadOffers}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
          >
            <span>🔄</span>
            <span>Refresh Offers</span>
          </button>
        </div>

        {/* Offers Content */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : filteredOffers.length === 0 ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-12 text-center space-y-3 shadow-xs">
            <span className="text-4xl">📬</span>
            <h3 className="text-base font-bold text-gray-900">No offers in this filter</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              When buyers propose wholesale bids or bulk purchase rates on your produce listings, they will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOffers.map((offer) => {
              const isPending = offer.status === "pending";
              const isAccepted = offer.status === "accepted";
              const isRejected = offer.status === "rejected";
              const isExpired = offer.status === "expired";
              const totalPayout = offer.offerPrice * offer.offerQuantity;
              const originalTotal = offer.originalPrice * offer.offerQuantity;
              const discountDiff = originalTotal - totalPayout;
              const discountPct = Math.round(((offer.originalPrice - offer.offerPrice) / offer.originalPrice) * 100);

              return (
                <div
                  key={offer.id}
                  className={`rounded-3xl border p-5 sm:p-6 transition-all shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6 ${
                    isPending
                      ? "border-amber-300 bg-white"
                      : isAccepted
                      ? "border-emerald-300 bg-emerald-50/30"
                      : "border-gray-200 bg-gray-50/60"
                  }`}
                >
                  <div className="space-y-3 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider ${
                          isAccepted
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : isRejected
                            ? "bg-red-100 text-red-800 border border-red-200"
                            : isExpired
                            ? "bg-gray-200 text-gray-700"
                            : "bg-amber-100 text-amber-800 border border-amber-300 animate-pulse"
                        }`}
                      >
                        {offer.status}
                      </span>
                      <span className="text-xs text-gray-400">
                        Submitted {new Date(offer.createdAt).toLocaleDateString()}
                      </span>
                      {isPending && (
                        <span className="text-[11px] text-amber-700 font-bold">
                          ⏳ Expires in {Math.max(0, Math.round((new Date(offer.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60)))}h
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-gray-900">{offer.listingTitle}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 mt-1">
                        <span>
                          Buyer: <strong>{offer.buyerName}</strong>
                        </span>
                        <span>•</span>
                        <span>Phone: {offer.buyerPhone}</span>
                      </div>
                    </div>

                    {offer.note && (
                      <div className="p-2.5 bg-gray-50 rounded-xl text-xs text-gray-700 border border-gray-100 italic">
                        &ldquo;{offer.note}&rdquo;
                      </div>
                    )}

                    {isRejected && offer.rejectionReason && (
                      <p className="text-xs text-red-700">
                        <strong>Reason:</strong> {offer.rejectionReason}
                      </p>
                    )}
                  </div>

                  {/* Financial & Action Panel */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-4 shrink-0 border-t lg:border-t-0 pt-4 lg:pt-0 border-gray-100">
                    <div className="text-left lg:text-right">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Proposed Payout</p>
                      <p className="text-2xl font-black text-emerald-800">
                        ₹{totalPayout.toFixed(2)}
                      </p>
                      <p className="text-xs font-bold text-gray-700">
                        ₹{offer.offerPrice}/{offer.unit} × {offer.offerQuantity} {offer.unit}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Listed: ₹{offer.originalPrice}/{offer.unit} {discountPct > 0 ? `(${discountPct}% off)` : ""}
                      </p>
                    </div>

                    {isPending ? (
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button
                          type="button"
                          loading={actionLoadingId === offer.id}
                          onClick={() => handleAccept(offer)}
                          className="flex-1 sm:flex-none rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 text-xs font-bold shadow-xs"
                        >
                          Accept &amp; Reserve Stock ✓
                        </Button>
                        <button
                          type="button"
                          disabled={actionLoadingId === offer.id}
                          onClick={() => setRejectModalOffer(offer)}
                          className="rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-700 px-3 py-2 text-xs font-bold transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    ) : isAccepted ? (
                      <Link
                        to="/farmer/orders"
                        className="rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 px-4 py-2 text-xs font-bold hover:bg-emerald-200 transition-colors"
                      >
                        View Order &amp; Dispatch &rarr;
                      </Link>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Decline Reason Modal */}
        {rejectModalOffer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-gray-100 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-gray-900">Decline Buyer Offer</h3>
                <button
                  type="button"
                  onClick={() => setRejectModalOffer(null)}
                  className="rounded-full p-1 text-gray-400 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-gray-600">
                Decline proposal of <strong>₹{rejectModalOffer.offerPrice}/{rejectModalOffer.unit}</strong> from <strong>{rejectModalOffer.buyerName}</strong>. You can provide a reason below:
              </p>

              <form onSubmit={handleRejectSubmit} className="space-y-4">
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g., Below minimum harvesting and packing costs, or stock is already reserved..."
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                />

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setRejectModalOffer(null)}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <Button
                    type="submit"
                    loading={actionLoadingId === rejectModalOffer.id}
                    className="rounded-xl bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-xs font-bold shadow-xs"
                  >
                    Confirm Decline
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
