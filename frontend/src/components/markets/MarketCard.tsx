import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { Market, MarketType } from "../../types/market";

interface MarketCardProps {
  market: Market;
  isSelected?: boolean;
  onSelect?: (market: Market) => void;
}

export const MarketCard: React.FC<MarketCardProps> = ({
  market,
  isSelected = false,
  onSelect,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const getTypeBadge = (type: MarketType) => {
    switch (type) {
      case "apmc_mandi":
        return {
          label: t("markets.types.apmc", "APMC Mandi"),
          bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
          dot: "bg-emerald-500",
        };
      case "sub_yard":
        return {
          label: t("markets.types.sub_yard", "Sub-Yard"),
          bg: "bg-amber-50 text-amber-800 border-amber-200",
          dot: "bg-amber-500",
        };
      case "weekly_haat":
        return {
          label: t("markets.types.weekly_haat", "Weekly Haat"),
          bg: "bg-orange-50 text-orange-800 border-orange-200",
          dot: "bg-orange-500",
        };
      case "fpo_collection_center":
        return {
          label: t("markets.types.fpo", "FPO Collection Center"),
          bg: "bg-indigo-50 text-indigo-800 border-indigo-200",
          dot: "bg-indigo-500",
        };
      default:
        return {
          label: t("markets.types.market", "Market"),
          bg: "bg-gray-50 text-gray-800 border-gray-200",
          dot: "bg-gray-400",
        };
    }
  };

  const badge = getTypeBadge(market.marketType);
  const [lng, lat] = market.location.coordinates;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  const handleCheckMandiPrices = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/mandi-prices?search=${encodeURIComponent(market.district)}`);
  };

  return (
    <div
      onClick={() => onSelect && onSelect(market)}
      className={`rounded-xl border p-4 transition-all duration-200 cursor-pointer ${
        isSelected
          ? "border-emerald-600 bg-emerald-50/40 shadow-md ring-2 ring-emerald-500/20"
          : "border-stone-200 bg-white hover:border-emerald-300 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${badge.bg}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
              {badge.label}
            </span>

            {market.enamEnabled && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                ⚡ e-NAM
              </span>
            )}

            {market.distanceKm !== undefined && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900">
                📍 {market.distanceKm} km {t("markets.away", "away")}
              </span>
            )}
          </div>

          <h3 className="text-base font-bold text-stone-900 leading-snug">
            {market.name}
          </h3>
          <p className="text-xs text-stone-500 mt-0.5 flex items-center gap-1">
            <span>{market.district}, {market.state}</span>
            <span>•</span>
            <span>PIN: {market.pincode}</span>
          </p>
        </div>
      </div>

      <p className="text-xs text-stone-600 mt-2 line-clamp-1">
        {market.address}
      </p>

      {/* Operating Hours & Days */}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
        <div className="flex items-center gap-1">
          <span className="text-stone-400">🕒</span>
          <span>{market.operatingHours}</span>
        </div>
        {market.operatingDays && market.operatingDays.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-stone-400">📅</span>
            <span>
              {market.operatingDays.length >= 6
                ? t("markets.daily", "Daily (Mon-Sat)")
                : market.operatingDays.join(", ")}
            </span>
          </div>
        )}
      </div>

      {/* Major Commodities Pills */}
      {market.majorCommodities && market.majorCommodities.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-1">
            {t("markets.traded_crops", "Key Traded Crops")}:
          </p>
          <div className="flex flex-wrap gap-1">
            {market.majorCommodities.slice(0, 5).map((crop, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded text-[11px] font-medium bg-stone-100 text-stone-700"
              >
                {crop}
              </span>
            ))}
            {market.majorCommodities.length > 5 && (
              <span className="px-1.5 py-0.5 rounded text-[11px] text-stone-400">
                +{market.majorCommodities.length - 5}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Key Facilities */}
      {market.facilities && market.facilities.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {market.facilities.slice(0, 3).map((facility, idx) => (
            <span
              key={idx}
              className="text-[11px] text-stone-500 bg-stone-50 border border-stone-100 rounded px-1.5 py-0.5"
            >
              ✓ {facility}
            </span>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
        <a
          href={`tel:${market.contactPhone}`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-xs font-semibold text-stone-700 hover:text-emerald-700 px-2 py-1 rounded hover:bg-stone-100"
        >
          <span>📞</span>
          <span>{market.contactPhone}</span>
        </a>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCheckMandiPrices}
            className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors"
          >
            📊 {t("markets.check_rates", "Today's Rates")}
          </button>

          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition-colors inline-flex items-center gap-1"
          >
            <span>🧭</span>
            <span>{t("markets.directions", "Directions")}</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default MarketCard;
