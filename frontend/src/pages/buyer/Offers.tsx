import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { offerService } from "@/services/offer.service";
import type { Offer, OfferStatus } from "@/types/offer";
import Spinner from "@/components/common/Spinner";

export default function BuyerOffers() {
  const { t } = useTranslation();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OfferStatus | "all">("all");

  useEffect(() => {
    loadOffers();
  }, []);

  async function loadOffers() {
    setLoading(true);
    try {
      const data = await offerService.getMyOffers();
      setOffers(data);
    } catch (err) {
      console.error("Failed to load offers:", err);
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredOffers = offers.filter((o) => {
    if (filter === "all") return true;
    return o.status === filter;
  });

  const pendingCount = offers.filter((o) => o.status === "pending").length;
  const acceptedCount = offers.filter((o) => o.status === "accepted").length;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0d281e] via-[#164230] to-[#0d281e] p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="rounded-full bg-amber-400/20 border border-amber-400/30 px-3 py-0.5 text-xs font-bold text-amber-300">
                🤝 {t("offers.directNegotiations")}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white" style={{ fontFamily: "var(--font-heading)" }}>
              {t("offers.buyerTitle")}
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/80 mt-1 max-w-xl">
              {t("offers.buyerSubtitle")}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/products"
              className="rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2.5 text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            >
              <span>🌱</span>
              <span>{t("offers.browseProduce")}</span>
            </Link>
            <Link
              to="/buyer/dashboard"
              className="rounded-2xl border border-white/20 bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 text-xs font-bold transition-all"
            >
              {t("nav.dashboard")} &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Counter */}
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
              {tab === "all"
                ? `${t("offers.allBids")} (${offers.length})`
                : t(`status.${tab}`, tab)}
              {tab === "pending" && pendingCount > 0 && ` (${pendingCount})`}
              {tab === "accepted" && acceptedCount > 0 && ` (${acceptedCount})`}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={loadOffers}
          className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
        >
          <span>🔄</span>
          <span>{t("offers.refresh")}</span>
        </button>
      </div>

      {/* Offers Grid / List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : filteredOffers.length === 0 ? (
        <div className="rounded-3xl border border-gray-200 bg-white p-12 text-center space-y-3">
          <span className="text-4xl">📭</span>
          <h3 className="text-base font-bold text-gray-900">{t("offers.noOffersFound")}</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {filter === "all"
              ? t("offers.noOffersDesc")
              : `${t("offers.noOffersFound")} (${t("status." + filter, filter)})`}
          </p>
          <Link
            to="/products"
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition-colors shadow-xs"
          >
            {t("offers.exploreMarketplace")}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {filteredOffers.map((offer) => {
            const isPending = offer.status === "pending";
            const isAccepted = offer.status === "accepted";
            const isRejected = offer.status === "rejected";
            const isExpired = offer.status === "expired";
            const total = offer.offerPrice * offer.offerQuantity;
            const originalTotal = offer.originalPrice * offer.offerQuantity;
            const savings = originalTotal - total;

            return (
              <div
                key={offer.id}
                className={`rounded-3xl border p-5 sm:p-6 transition-all shadow-xs flex flex-col justify-between ${
                  isAccepted
                    ? "border-emerald-300 bg-emerald-50/40"
                    : isRejected
                    ? "border-red-200 bg-red-50/20"
                    : isExpired
                    ? "border-gray-200 bg-gray-50/60 opacity-80"
                    : "border-amber-300/80 bg-white"
                }`}
              >
                <div>
                  {/* Top Bar: Title & Status */}
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100">
                    <div>
                      <h3 className="text-base font-black text-gray-900">{offer.listingTitle}</h3>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {t("common.farmer")}: <strong>{offer.farmerName}</strong>
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wider shrink-0 ${
                        isAccepted
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : isRejected
                          ? "bg-red-100 text-red-800 border border-red-300"
                          : isExpired
                          ? "bg-gray-200 text-gray-700"
                          : "bg-amber-100 text-amber-800 border border-amber-300 animate-pulse"
                      }`}
                    >
                      {t(`status.${offer.status}`, offer.status)}
                    </span>
                  </div>

                  {/* Pricing Comparison */}
                  <div className="mt-4 grid grid-cols-2 gap-3 p-3.5 bg-white rounded-2xl border border-gray-100 shadow-2xs">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">{t("offers.yourBid")}</p>
                      <p className="text-base font-black text-emerald-700">
                        ₹{offer.offerPrice}/{offer.unit}
                      </p>
                      <p className="text-xs text-gray-500 font-semibold">
                        {t("common.quantity")}: {offer.offerQuantity} {offer.unit}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">{t("offers.listedPrice")}</p>
                      <p className="text-base font-bold text-gray-400 line-through">
                        ₹{offer.originalPrice}/{offer.unit}
                      </p>
                      <p className="text-xs font-black text-gray-900">
                        {t("common.total")}: ₹{total.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {savings > 0 && (
                    <p className="text-[11px] font-bold text-emerald-700 mt-2">
                      🎉 {t("offers.negotiatedSavings", { amount: savings.toFixed(2) })}
                    </p>
                  )}

                  {offer.note && (
                    <div className="mt-3 p-2.5 bg-gray-50 rounded-xl text-xs text-gray-600 border border-gray-100 italic">
                      &ldquo;{offer.note}&rdquo;
                    </div>
                  )}

                  {isRejected && offer.rejectionReason && (
                    <div className="mt-3 p-2.5 bg-red-50 rounded-xl text-xs text-red-800 border border-red-200">
                      <strong>{t("offers.farmerResponse")}</strong> {offer.rejectionReason}
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-gray-400 text-[11px]">
                    {isPending
                      ? `${t("offers.expires")} ${new Date(offer.expiresAt).toLocaleDateString()}`
                      : `${t("offers.submitted")} ${new Date(offer.createdAt).toLocaleDateString()}`}
                  </span>

                  {isAccepted && offer.orderId && (
                    <Link
                      to="/buyer/orders"
                      className="rounded-xl bg-emerald-700 px-4 py-2 font-bold text-white hover:bg-emerald-800 transition-colors shadow-2xs"
                    >
                      {t("offers.viewConfirmedOrder")}
                    </Link>
                  )}

                  {isPending && (
                    <span className="font-bold text-amber-700 flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                      {t("offers.awaitingProducer")}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
