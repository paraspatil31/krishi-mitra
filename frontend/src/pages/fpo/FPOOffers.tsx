import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { fpoService, FPOOffer } from "@/services/fpo.service";
import Spinner from "@/components/common/Spinner";
import ErrorMessage from "@/components/common/ErrorMessage";

export default function FPOOffers() {
  const [offers, setOffers] = useState<FPOOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "accepted" | "rejected" | "expired" | "all">("pending");

  // Action Dialogs
  const [offerToAccept, setOfferToAccept] = useState<FPOOffer | null>(null);
  const [offerToReject, setOfferToReject] = useState<FPOOffer | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadOffers();
  }, []);

  async function loadOffers() {
    try {
      setLoading(true);
      setError(null);
      const data = await fpoService.getOffers();
      setOffers(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load buyer offers");
    } finally {
      setLoading(false);
    }
  }

  async function handleAcceptOffer() {
    if (!offerToAccept) return;
    try {
      setActionLoading(true);
      setError(null);
      await fpoService.respondOffer(offerToAccept.id, "accept");
      setActionSuccess(`Offer from ${offerToAccept.buyerName} accepted! Stock has been atomically reserved and an order has been created.`);
      setOfferToAccept(null);
      await loadOffers();
    } catch (err: any) {
      setError(err?.message || "Failed to accept offer");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRejectOffer() {
    if (!offerToReject) return;
    try {
      setActionLoading(true);
      setError(null);
      await fpoService.respondOffer(offerToReject.id, "reject", rejectReason);
      setActionSuccess(`Offer from ${offerToReject.buyerName} declined.`);
      setOfferToReject(null);
      setRejectReason("");
      await loadOffers();
    } catch (err: any) {
      setError(err?.message || "Failed to decline offer");
    } finally {
      setActionLoading(false);
    }
  }

  const filteredOffers = offers.filter((o) => {
    if (activeTab === "all") return true;
    return o.status === activeTab;
  });

  const pendingCount = offers.filter((o) => o.status === "pending").length;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Link to="/fpo/dashboard" className="text-xs text-gray-500 hover:text-emerald-700">
              ← FPO Dashboard
            </Link>
          </div>
          <h1
            className="text-2xl font-bold text-gray-900 mt-1"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Aggregated Buyer Offers
          </h1>
          <p className="text-xs text-gray-500">
            Commercial wholesale bids received across all member harvest lots.
          </p>
        </div>

        <Link
          to="/fpo/lots"
          className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-xs"
        >
          <span>📦</span>
          <span>View Lots</span>
        </Link>
      </div>

      {error && <ErrorMessage message={error} />}

      {actionSuccess && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 flex items-center justify-between">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-700 hover:text-emerald-900">
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-gray-200 pb-3 mb-6">
        {[
          { key: "pending", label: `Pending Review (${pendingCount})` },
          { key: "accepted", label: "Accepted" },
          { key: "rejected", label: "Declined" },
          { key: "expired", label: "Expired" },
          { key: "all", label: "All Offers" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`rounded-xl px-4 py-2 text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Offers List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : filteredOffers.length > 0 ? (
        <div className="space-y-4">
          {filteredOffers.map((o) => {
            const discountPct = Math.round(
              ((o.originalPrice - o.offerPrice) / o.originalPrice) * 100
            );
            const totalOfferValue = o.offerPrice * o.offerQuantity;

            return (
              <div
                key={o.id}
                className="rounded-3xl border border-gray-100 bg-white p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-2 max-w-2xl">
                  {/* Lot Attribution & Status */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-900 border border-emerald-200/60">
                      🌾 {o.listingTitle}
                    </span>
                    <span className="text-xs text-gray-400">|</span>
                    <span className="text-xs text-gray-600 font-medium">
                      Producer: {o.farmerName}
                    </span>
                    <span
                      className={`ml-auto sm:ml-2 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                        o.status === "pending"
                          ? "bg-amber-100 text-amber-800"
                          : o.status === "accepted"
                          ? "bg-emerald-100 text-emerald-800"
                          : o.status === "rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {o.status}
                    </span>
                  </div>

                  {/* Buyer details */}
                  <div className="flex items-center gap-2 text-xs text-gray-700">
                    <span className="font-bold text-gray-900">🏢 {o.buyerName}</span>
                    <span className="text-gray-400">•</span>
                    <span>📞 {o.buyerPhone}</span>
                  </div>

                  {o.note && (
                    <p className="text-xs text-gray-600 italic bg-gray-50/80 p-2.5 rounded-xl border border-gray-100">
                      "{o.note}"
                    </p>
                  )}

                  {o.rejectionReason && (
                    <p className="text-xs text-red-600 bg-red-50/60 p-2.5 rounded-xl border border-red-100">
                      Declined reason: {o.rejectionReason}
                    </p>
                  )}
                </div>

                {/* Pricing and Action Section */}
                <div className="flex flex-col sm:flex-row sm:items-center md:flex-col md:items-end gap-4 border-t sm:border-t-0 md:border-l border-gray-100 sm:pt-0 pt-4 md:pl-6 shrink-0">
                  <div className="text-left md:text-right">
                    <div className="flex items-baseline md:justify-end gap-2">
                      <span className="text-lg font-bold text-gray-900">
                        ₹{o.offerPrice}/{o.unit}
                      </span>
                      <span className="text-xs text-gray-400 line-through">
                        ₹{o.originalPrice}
                      </span>
                      {discountPct > 0 && (
                        <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md">
                          -{discountPct}%
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Volume: <span className="font-bold text-gray-800">{o.offerQuantity} {o.unit}</span>
                    </div>
                    <div className="text-xs font-bold text-emerald-800 mt-1">
                      Total Bid: ₹{totalOfferValue.toLocaleString("en-IN")}
                    </div>
                  </div>

                  {o.status === "pending" && (
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => setOfferToReject(o)}
                        className="flex-1 sm:flex-none rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => setOfferToAccept(o)}
                        className="flex-1 sm:flex-none rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs transition-all"
                      >
                        Accept & Reserve
                      </button>
                    </div>
                  )}

                  {o.orderId && (
                    <Link
                      to={`/fpo/orders`}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
                    >
                      View Order Manifest →
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-gray-200 p-12 text-center bg-gray-50/50">
          <span className="text-4xl block mb-2">🤝</span>
          <h3 className="text-sm font-bold text-gray-900 mb-1">No offers in this category</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            When wholesale buyers submit price bids on your member crop lots, they will appear here for negotiation.
          </p>
        </div>
      )}

      {/* Accept Confirmation Dialog */}
      {offerToAccept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl animate-scaleIn border border-gray-100 text-center">
            <span className="text-3xl block mb-2">✅</span>
            <h3 className="text-base font-bold text-gray-900 mb-1">Accept Buyer Offer?</h3>
            <p className="text-xs text-gray-500 mb-4">
              Accepting will atomically decrement <strong>{offerToAccept.offerQuantity} {offerToAccept.unit}</strong> from {offerToAccept.listingTitle} stock and generate a confirmed purchase order.
            </p>
            <div className="rounded-2xl bg-emerald-50/70 p-3 mb-5 text-xs text-emerald-900 font-medium">
              Rate: ₹{offerToAccept.offerPrice}/{offerToAccept.unit} • Total: ₹{(offerToAccept.offerPrice * offerToAccept.offerQuantity).toLocaleString("en-IN")}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setOfferToAccept(null)}
                className="w-1/2 rounded-xl border border-gray-200 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAcceptOffer}
                disabled={actionLoading}
                className="w-1/2 rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 shadow-xs"
              >
                {actionLoading ? "Processing..." : "Confirm & Reserve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Dialog */}
      {offerToReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl animate-scaleIn border border-gray-100">
            <h3 className="text-base font-bold text-gray-900 mb-1">Decline Offer</h3>
            <p className="text-xs text-gray-500 mb-4">
              Provide a brief note to {offerToReject.buyerName} explaining why this rate or volume could not be accepted.
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Current mandi rate is higher, or lot committed elsewhere..."
              className="w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-emerald-500 focus:outline-hidden mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setOfferToReject(null)}
                className="w-1/2 rounded-xl border border-gray-200 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleRejectOffer}
                disabled={actionLoading}
                className="w-1/2 rounded-xl bg-red-600 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50 shadow-xs"
              >
                {actionLoading ? "Declining..." : "Decline Offer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
