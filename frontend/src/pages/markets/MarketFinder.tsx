import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { marketService } from "../../services/market.service";
import { Market, MarketType } from "../../types/market";
import { MarketFinderMap } from "../../components/markets/MarketFinderMap";
import { MarketCard } from "../../components/markets/MarketCard";
import { useAuth } from "@/context/AuthContext";

const MAHARASHTRA_DISTRICTS = [
  "Pune",
  "Nashik",
  "Thane",
  "Kolhapur",
  "Sangli",
  "Solapur",
  "Ahmednagar",
  "Nagpur",
  "Amravati",
  "Aurangabad",
  "Satara",
  "Jalgaon",
  "Beed",
  "Nanded",
  "Latur",
  "Osmanabad",
  "Dhule",
  "Parbhani",
];

const RADIUS_OPTIONS = [15, 30, 50, 100, 200];

export const MarketFinder: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [markets, setMarkets] = useState<Market[]>([]);
  const [commodities, setCommodities] = useState<string[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // View mode: 'map' or 'list'
  const [viewMode, setViewMode] = useState<"map" | "list">("map");

  // User coordinates
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState<string>("");
  const [locating, setLocating] = useState<boolean>(false);

  // Filters
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [selectedType, setSelectedType] = useState<MarketType | "">("");
  const [selectedCommodity, setSelectedCommodity] = useState<string>("");
  const [radiusKm, setRadiusKm] = useState<number>(50);
  const [enamOnly, setEnamOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Sync user's detected location and district
  useEffect(() => {
    if (user?.district && !selectedDistrict) {
      setSelectedDistrict(user.district);
    }
    if (user?.location?.coordinates?.length === 2 && !userLocation) {
      setUserLocation({
        lat: user.location.coordinates[1],
        lng: user.location.coordinates[0],
      });
      setLocationName(`📍 ${user.district || "Your Farm Region"}`);
    }
  }, [user]);

  // Load commodities once
  useEffect(() => {
    marketService
      .getTradedCommodities()
      .then((data) => setCommodities(data))
      .catch((err) => console.warn("Failed to load commodities:", err));
  }, []);

  // Fetch markets
  const fetchMarkets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await marketService.getNearbyMarkets({
        lat: userLocation?.lat,
        lng: userLocation?.lng,
        radiusKm,
        type: selectedType,
        commodity: selectedCommodity,
        district: selectedDistrict,
        search: searchQuery,
        enamOnly,
      });

      setMarkets(res.data || []);
      if (res.data && res.data.length > 0) {
        setSelectedMarket((prev) => prev || res.data[0]);
      } else {
        setSelectedMarket(null);
      }
    } catch (err: any) {
      console.error("Failed to fetch markets:", err);
      setError(err?.message || "Failed to load agricultural markets");
    } finally {
      setLoading(false);
    }
  }, [
    userLocation,
    radiusKm,
    selectedType,
    selectedCommodity,
    selectedDistrict,
    searchQuery,
    enamOnly,
  ]);

  useEffect(() => {
    fetchMarkets();
  }, [fetchMarkets]);

  // Detect GPS Location
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserLocation(coords);
        setLocationName(t("markets.detected_gps", "Your Detected GPS Location"));
        setSelectedDistrict(""); // Clear district override when GPS is active
        setLocating(false);
      },
      (err) => {
        console.warn("Geolocation denied or error:", err);
        alert(t("markets.gps_error", "Location access was denied or timed out. Please select your district from the dropdown."));
        setLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleClearLocation = () => {
    setUserLocation(null);
    setLocationName("");
  };

  // Quick statistics
  const totalMarkets = markets.length;
  const closestMarket = markets.find((m) => m.distanceKm !== undefined);
  const enamCount = markets.filter((m) => m.enamEnabled).length;

  return (
    <div className="min-h-screen bg-stone-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-emerald-900 via-stone-900 to-emerald-950 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold mb-3">
              <span>📍</span>
              <span>{t("markets.badge", "Direct Farmer-to-Market Proximity")}</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight font-serif">
              {t("markets.title", "Nearby Agricultural Market Finder")}
            </h1>
            <p className="mt-2 text-stone-300 text-sm sm:text-base max-w-2xl leading-relaxed">
              {t(
                "markets.subtitle",
                "Locate APMC Mandis, Sub-Yards, and Weekly Farmers' Haats near you. View real-time distance, e-NAM digital trading facilities, operating hours, and live wholesale rates."
              )}
            </p>

            {/* Quick Stats Strip */}
            <div className="mt-6 pt-6 border-t border-stone-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-stone-400 uppercase tracking-wider font-medium">
                  {t("markets.stats.total", "Markets Found")}
                </p>
                <p className="text-2xl font-black text-emerald-400 mt-0.5">
                  {totalMarkets}
                </p>
              </div>

              <div>
                <p className="text-xs text-stone-400 uppercase tracking-wider font-medium">
                  {t("markets.stats.closest", "Closest Yard")}
                </p>
                <p className="text-2xl font-black text-amber-300 mt-0.5">
                  {closestMarket && closestMarket.distanceKm !== undefined
                    ? `${closestMarket.distanceKm} km`
                    : "—"}
                </p>
              </div>

              <div>
                <p className="text-xs text-stone-400 uppercase tracking-wider font-medium">
                  {t("markets.stats.enam", "e-NAM Enabled")}
                </p>
                <p className="text-2xl font-black text-blue-400 mt-0.5">
                  {enamCount}
                </p>
              </div>

              <div>
                <p className="text-xs text-stone-400 uppercase tracking-wider font-medium">
                  {t("markets.stats.location", "Active Location")}
                </p>
                <p className="text-sm font-semibold text-stone-200 mt-1 truncate">
                  {locationName || selectedDistrict || t("markets.all_maharashtra", "All Maharashtra")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-sm space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search Input */}
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">
                {t("markets.search_label", "Search Market or Place")}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("markets.search_placeholder", "e.g. Pune, Lasalgaon, Onion...")}
                  className="w-full text-xs sm:text-sm pl-8 pr-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="absolute left-2.5 top-2.5 text-stone-400 text-xs">🔍</span>
              </div>
            </div>

            {/* District Selector */}
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">
                {t("markets.district_label", "Filter by District")}
              </label>
              <select
                value={selectedDistrict}
                onChange={(e) => {
                  setSelectedDistrict(e.target.value);
                  if (e.target.value) {
                    setUserLocation(null);
                    setLocationName("");
                  }
                }}
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="">{t("markets.all_districts", "All Districts")}</option>
                {MAHARASHTRA_DISTRICTS.map((dist) => (
                  <option key={dist} value={dist}>
                    {dist}
                  </option>
                ))}
              </select>
            </div>

            {/* Commodity Filter */}
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">
                {t("markets.commodity_label", "Traded Commodity")}
              </label>
              <select
                value={selectedCommodity}
                onChange={(e) => setSelectedCommodity(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="">{t("markets.all_commodities", "All Commodities")}</option>
                {commodities.map((crop) => (
                  <option key={crop} value={crop}>
                    {crop}
                  </option>
                ))}
              </select>
            </div>

            {/* GPS Detect Location Action */}
            <div className="flex flex-col justify-end">
              {userLocation ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs text-emerald-800 flex items-center justify-between">
                    <span className="font-semibold truncate">📍 {locationName}</span>
                    <button
                      type="button"
                      onClick={handleClearLocation}
                      className="text-stone-400 hover:text-stone-700 font-bold ml-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={locating}
                  className="w-full text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl bg-stone-900 text-white hover:bg-stone-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span>{locating ? "⏳" : "🎯"}</span>
                  <span>
                    {locating
                      ? t("markets.detecting", "Detecting GPS...")
                      : t("markets.detect_location", "Detect My Location")}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Secondary Filter Row: Types, Radius & View Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-100">
            {/* Market Type Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-stone-500 mr-1">
                {t("markets.type", "Type")}:
              </span>
              {[
                { id: "", label: t("markets.types.all", "All") },
                { id: "apmc_mandi", label: t("markets.types.apmc", "APMC Mandi") },
                { id: "sub_yard", label: t("markets.types.sub_yard", "Sub-Yard") },
                { id: "weekly_haat", label: t("markets.types.weekly_haat", "Weekly Haat") },
                { id: "fpo_collection_center", label: t("markets.types.fpo", "FPO Center") },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setSelectedType(pill.id as any)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedType === pill.id
                      ? "bg-emerald-700 text-white"
                      : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                  }`}
                >
                  {pill.label}
                </button>
              ))}

              <label className="inline-flex items-center gap-1.5 ml-2 cursor-pointer text-xs font-semibold text-blue-700">
                <input
                  type="checkbox"
                  checked={enamOnly}
                  onChange={(e) => setEnamOnly(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>⚡ e-NAM Only</span>
              </label>
            </div>

            {/* Radius Selector & View Mode Switch */}
            <div className="flex items-center gap-3">
              {userLocation && (
                <div className="flex items-center gap-1">
                  <span className="text-xs font-semibold text-stone-500 mr-1">
                    {t("markets.radius", "Radius")}:
                  </span>
                  {RADIUS_OPTIONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRadiusKm(r)}
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        radiusKm === r
                          ? "bg-stone-800 text-white"
                          : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                      }`}
                    >
                      {r} km
                    </button>
                  ))}
                </div>
              )}

              {/* View Toggle */}
              <div className="inline-flex rounded-xl border border-stone-200 bg-stone-100 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode("map")}
                  className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                    viewMode === "map"
                      ? "bg-white text-stone-900 shadow-sm"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  🗺️ {t("markets.view_map", "Map")}
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                    viewMode === "list"
                      ? "bg-white text-stone-900 shadow-sm"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  📋 {t("markets.view_list", "Directory")}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Loading / Error States */}
        {loading && (
          <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto" />
            <p className="mt-3 text-stone-600 font-medium text-sm">
              {t("markets.loading", "Searching for nearby agricultural markets...")}
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 text-sm flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button
              type="button"
              onClick={fetchMarkets}
              className="text-xs font-bold underline ml-2"
            >
              {t("markets.retry", "Retry")}
            </button>
          </div>
        )}

        {/* Main Content Area */}
        {!loading && !error && (
          <div>
            {markets.length === 0 ? (
              <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
                <span className="text-4xl">🌾</span>
                <h3 className="mt-3 text-lg font-bold text-stone-800">
                  {t("markets.no_markets_title", "No agricultural markets found matching your filters")}
                </h3>
                <p className="mt-1 text-sm text-stone-500 max-w-md mx-auto">
                  {t(
                    "markets.no_markets_desc",
                    "Try expanding your radius, clearing district/crop filters, or searching for major APMC yards like Pune, Lasalgaon, or Vashi."
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDistrict("");
                    setSelectedType("");
                    setSelectedCommodity("");
                    setSearchQuery("");
                    setEnamOnly(false);
                    setRadiusKm(100);
                  }}
                  className="mt-4 px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800"
                >
                  {t("markets.reset_filters", "Reset All Filters")}
                </button>
              </div>
            ) : viewMode === "map" ? (
              /* Split Layout: Map on left/top + Market Cards on right/sidebar */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Interactive Map */}
                <div className="lg:col-span-7 xl:col-span-8">
                  <MarketFinderMap
                    markets={markets}
                    userLocation={userLocation}
                    selectedMarket={selectedMarket}
                    onSelectMarket={(m) => setSelectedMarket(m)}
                    height="600px"
                  />
                </div>

                {/* Sidebar Market Cards */}
                <div className="lg:col-span-5 xl:col-span-4 space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  <div className="flex items-center justify-between text-xs text-stone-500 px-1">
                    <span>
                      {t("markets.showing", "Showing")} {markets.length}{" "}
                      {t("markets.yards", "markets")}
                    </span>
                    <span>{t("markets.click_to_view", "Click card to focus on map")}</span>
                  </div>

                  {markets.map((market) => (
                    <MarketCard
                      key={market.id}
                      market={market}
                      isSelected={selectedMarket?.id === market.id}
                      onSelect={(m) => setSelectedMarket(m)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              /* Non-Map Directory List View (Accessible, High-contrast, Mobile-friendly) */
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-stone-500 px-1">
                  <span>
                    {t("markets.directory_header", "State Agricultural Mandi Directory")} ({markets.length} {t("markets.yards", "markets")})
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {markets.map((market) => (
                    <MarketCard
                      key={market.id}
                      market={market}
                      isSelected={selectedMarket?.id === market.id}
                      onSelect={(m) => setSelectedMarket(m)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketFinder;
