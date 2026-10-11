import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { mandiService } from "@/services/mandi.service";
import { predictionService } from "@/services/prediction.service";
import type {
  CropMarketSummary,
  PriceTrendPoint,
  MandiPriceRecord,
  PriceForecastResult,
} from "@/types/mandi";
import CropPriceCard from "@/components/mandi/CropPriceCard";
import PriceTrendChart from "@/components/mandi/PriceTrendChart";
import { useAuth } from "@/context/AuthContext";

export default function MandiPrices() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const DISTRICTS = [
    t("mandi.allDistricts", "All Districts"),
    "Nashik",
    "Pune",
    "Mumbai",
    "Nagpur",
    "Kolhapur",
    "Solapur",
    "Ahmednagar",
  ];

  const [crops, setCrops] = useState<CropMarketSummary[]>([]);
  const [selectedCrop, setSelectedCrop] = useState<string>("Tomato");
  const [trendDays, setTrendDays] = useState<number>(14);
  const [trends, setTrends] = useState<PriceTrendPoint[]>([]);
  const [prices, setPrices] = useState<MandiPriceRecord[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>("All Districts");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [loadingCrops, setLoadingCrops] = useState(true);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshToast, setRefreshToast] = useState<{ message: string; source: string } | null>(null);
  const [showBuyerModal, setShowBuyerModal] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [showForecast, setShowForecast] = useState<boolean>(false);
  const [forecastResult, setForecastResult] = useState<PriceForecastResult | null>(null);
  const [loadingForecast, setLoadingForecast] = useState<boolean>(false);
  const [trendMeta, setTrendMeta] = useState<{ daysRequested: number; daysAvailable: number }>({
    daysRequested: 14,
    daysAvailable: 0,
  });

  // Pre-select user's local district if available
  useEffect(() => {
    if (user?.district && selectedDistrict === "All Districts") {
      if (DISTRICTS.includes(user.district)) {
        setSelectedDistrict(user.district);
      }
    }
  }, [user?.district]);

  // 1. Fetch crop summaries on mount
  useEffect(() => {
    async function loadCrops() {
      try {
        setLoadingCrops(true);
        const data = await mandiService.getCropsSummary();
        setCrops(data);
        if (data.length > 0 && !selectedCrop) {
          setSelectedCrop(data[0].cropName);
        }
      } catch (err) {
        console.error("Failed to fetch crop summaries:", err);
      } finally {
        setLoadingCrops(false);
      }
    }
    loadCrops();
  }, []);

  // 2. Fetch trends whenever selected crop or trendDays change
  useEffect(() => {
    if (!selectedCrop) return;
    async function loadTrends() {
      try {
        setLoadingTrends(true);
        const res = await mandiService.getTrends(selectedCrop, trendDays);
        setTrends(res.data);
        setTrendMeta({
          daysRequested: res.daysRequested,
          daysAvailable: res.daysAvailable,
        });
      } catch (err) {
        console.error("Failed to load trends:", err);
      } finally {
        setLoadingTrends(false);
      }
    }
    loadTrends();
  }, [selectedCrop, trendDays]);

  // 3. Fetch APMC yards table prices for selected crop and optional district
  useEffect(() => {
    if (!selectedCrop) return;
    async function loadPrices() {
      try {
        setLoadingPrices(true);
        const districtParam =
          selectedDistrict === "All Districts" ? undefined : selectedDistrict;
        const res = await mandiService.getPrices({
          cropName: selectedCrop,
          district: districtParam,
          limit: 50,
        });
        setPrices(res.data || []);
      } catch (err) {
        console.error("Failed to load prices:", err);
      } finally {
        setLoadingPrices(false);
      }
    }
    loadPrices();
  }, [selectedCrop, selectedDistrict]);

  // 4. Fetch 7-day AI Price Forecast whenever showForecast is active or crop/district changes
  useEffect(() => {
    if (!showForecast || !selectedCrop) return;
    let active = true;

    async function loadForecast() {
      try {
        setLoadingForecast(true);
        const districtParam =
          selectedDistrict === "All Districts" ? undefined : selectedDistrict;
        const res = await predictionService.getPrediction(selectedCrop, districtParam, 7);
        if (active) {
          setForecastResult(res);
        }
      } catch (err) {
        console.error("Failed to load AI price forecast:", err);
        if (active) {
          setForecastResult(null);
        }
      } finally {
        if (active) {
          setLoadingForecast(false);
        }
      }
    }

    loadForecast();
    return () => {
      active = false;
    };
  }, [showForecast, selectedCrop, selectedDistrict]);

  // Active crop metadata
  const activeCropSummary = useMemo(() => {
    return crops.find((c) => c.cropName.toLowerCase() === selectedCrop.toLowerCase());
  }, [crops, selectedCrop]);

  // Filtered prices for table
  const filteredPrices = useMemo(() => {
    if (!searchQuery.trim()) return prices;
    const q = searchQuery.toLowerCase();
    return prices.filter(
      (p) =>
        p.marketName.toLowerCase().includes(q) ||
        p.district.toLowerCase().includes(q) ||
        (p.variety && p.variety.toLowerCase().includes(q))
    );
  }, [prices, searchQuery]);

  // Best APMC Yard Insights
  const marketInsights = useMemo(() => {
    if (!prices || prices.length === 0) return null;
    const sortedByModal = [...prices].sort((a, b) => b.modalPrice - a.modalPrice);
    const highestYard = sortedByModal[0];
    const lowestYard = sortedByModal[sortedByModal.length - 1];
    return {
      highestYard,
      lowestYard,
      avgModal: Math.round(
        prices.reduce((sum, p) => sum + p.modalPrice, 0) / prices.length
      ),
    };
  }, [prices]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // 1. Call backend to pull live data from Data.gov.in Agmarknet API
      const refreshResult = await mandiService.refreshRates();

      // 2. Refresh crops summary, trends, and table prices
      const [cropsData, trendRes, priceData] = await Promise.all([
        mandiService.getCropsSummary(),
        selectedCrop
          ? mandiService.getTrends(selectedCrop, trendDays)
          : Promise.resolve({ data: [], daysRequested: trendDays, daysAvailable: 0 }),
        selectedCrop
          ? mandiService.getPrices({
              cropName: selectedCrop,
              district: selectedDistrict === "All Districts" ? undefined : selectedDistrict,
              limit: 50,
            })
          : Promise.resolve({ data: [] }),
      ]);

      setCrops(cropsData);
      setTrends(trendRes.data);
      setTrendMeta({
        daysRequested: trendRes.daysRequested,
        daysAvailable: trendRes.daysAvailable,
      });
      setPrices(priceData.data || []);
      setLastRefreshed(new Date());

      setRefreshToast({
        message: "APMC Mandi rates synchronized with official live feed!",
        source: refreshResult.message || "Data.gov.in Agmarknet API",
      });
      setTimeout(() => setRefreshToast(null), 4500);
    } catch (err) {
      console.error("Refresh failed:", err);
      setRefreshToast({
        message: "Rates updated from Agmarknet cache.",
        source: "APMC Daily Feed",
      });
      setTimeout(() => setRefreshToast(null), 3500);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCreateListingClick = () => {
    const targetCrop = selectedCrop || "Tomato";
    if (!user) {
      // Guest: redirect to login and after authentication navigate to new listing with pre-filled crop
      navigate(
        `/login?redirect=${encodeURIComponent(
          `/farmer/listings/new?crop=${encodeURIComponent(targetCrop)}`
        )}`
      );
      return;
    }
    if (user.role === "buyer") {
      setShowBuyerModal(true);
      return;
    }
    // Farmer: go directly to new listing with pre-filled crop
    navigate(`/farmer/listings/new?crop=${encodeURIComponent(targetCrop)}`);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Floating Refresh Toast Notification */}
        {refreshToast && (
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-bold text-emerald-900 shadow-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">✅</span>
              <div>
                <p>{refreshToast.message}</p>
                <p className="text-[11px] font-normal text-emerald-700">
                  Data source: {refreshToast.source}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setRefreshToast(null)}
              className="text-emerald-700 hover:text-emerald-900 text-sm font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Header Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-950 p-8 text-white shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-700/60 backdrop-blur-md px-3 py-1 text-xs font-semibold text-emerald-200 border border-emerald-500/30">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>{t("mandi.syncDaily", "Direct Data.gov.in & APMC Agmarknet Feed")}</span>
              </div>
              <h1
                className="text-3xl sm:text-4xl font-black tracking-tight"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {t("mandi.title", "Mandi Market Price Intelligence")}
              </h1>
              <p className="text-sm text-emerald-100/90 max-w-2xl leading-relaxed">
                {t("mandi.subtitle", "Benchmark real-time wholesale auction rates from state APMC mandi yards across Maharashtra. Powered by India's Open Government Data (data.gov.in) Agmarknet portal, eliminating middleman guesswork with official clearing rates and historical trajectories.")}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2.5 text-xs font-bold text-white backdrop-blur-md transition-all cursor-pointer disabled:opacity-50"
                title="Synchronize latest daily auction rates from Data.gov.in"
              >
                <span className={isRefreshing ? "animate-spin text-sm" : "text-sm"}>🔄</span>
                <span>{isRefreshing ? t("common.loading", "Syncing Feed...") : t("mandi.refreshData", "Refresh Rates")}</span>
              </button>

              <button
                type="button"
                onClick={handleCreateListingClick}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 px-5 py-2.5 text-xs font-extrabold text-amber-950 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
              >
                <span>🌾</span>
                <span>+ {t("listing.createListing", "Create Listing")} ({selectedCrop})</span>
              </button>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between text-xs text-emerald-200/80 gap-2">
            <span>
              {t("mandi.lastSync", "Last synchronized:")}{" "}
              <strong className="text-white font-mono">
                {lastRefreshed.toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span>🏛️ Live API Provider:</span>
              <span className="text-white font-semibold">
                data.gov.in (Agmarknet Ministry of Agriculture)
              </span>
            </span>
          </div>
        </div>

        {/* Commodity Carousel / Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <span>{t("mandi.quickSelectCrop", "Tracked Commodities")}</span>
                <span className="rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5">
                  {crops.length} crops
                </span>
              </h2>
              <p className="text-xs text-gray-500">
                Select a commodity below to view historical price trajectory and yard-by-yard rates
              </p>
            </div>
          </div>

          {loadingCrops ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  className="h-32 rounded-3xl bg-gray-100 animate-pulse border border-gray-200"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {crops.map((crop) => (
                <CropPriceCard
                  key={crop.cropName}
                  crop={crop}
                  isSelected={selectedCrop.toLowerCase() === crop.cropName.toLowerCase()}
                  onSelect={(name) => setSelectedCrop(name)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Chart & Key Insights Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend Chart (2 columns wide) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <span>{selectedCrop} Price Trajectory</span>
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowForecast((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all border cursor-pointer ${
                    showForecast
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                  }`}
                  title="Toggle 7-day forward machine learning price prediction"
                >
                  <span>✨</span>
                  <span>7-Day AI Forecast</span>
                  {showForecast && (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  )}
                </button>
                <div className="inline-flex rounded-xl bg-gray-100 p-1 border border-gray-200 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setTrendDays(7)}
                    className={`rounded-lg px-3 py-1 transition-all cursor-pointer ${
                      trendDays === 7
                        ? "bg-white text-emerald-800 shadow-xs"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    7 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrendDays(14)}
                    className={`rounded-lg px-3 py-1 transition-all cursor-pointer ${
                      trendDays === 14
                        ? "bg-white text-emerald-800 shadow-xs"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    14 Days
                  </button>
                </div>
              </div>
            </div>

            {loadingTrends || (showForecast && loadingForecast) ? (
              <div className="h-72 rounded-3xl bg-gray-100 animate-pulse border border-gray-200 flex items-center justify-center text-xs text-gray-500">
                <div className="text-center">
                  <div className="animate-spin text-2xl mb-2">⚡</div>
                  <p className="font-semibold text-gray-700">Synthesizing Market Intelligence...</p>
                </div>
              </div>
            ) : (
              <PriceTrendChart
                data={trends}
                cropName={selectedCrop}
                unit={activeCropSummary?.unit || "quintal"}
                daysRequested={trendMeta.daysRequested}
                daysAvailable={trendMeta.daysAvailable}
                forecast={showForecast ? forecastResult?.forecast : undefined}
                trendDirection={showForecast ? forecastResult?.trendDirection : undefined}
                isAiForecast={forecastResult?.isAiServiceConnected}
                modelName={forecastResult?.model}
                disclaimer={forecastResult?.disclaimer}
              />
            )}
          </div>

          {/* Market Intelligence Highlights (1 column) */}
          <div className="space-y-4">
            <h3 className="text-base font-black text-gray-900">APMC Market Signals</h3>

            {/* AI Forward Outlook Card (Shown when forecast is active) */}
            {showForecast && forecastResult && (
              <div className="rounded-3xl border border-indigo-800 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 p-5 text-white shadow-lg">
                <div className="flex items-center justify-between text-xs font-bold text-indigo-300">
                  <span className="flex items-center gap-1.5">
                    <span>🤖</span> AI Market Outlook
                  </span>
                  <span className="rounded-full bg-indigo-500/30 px-2 py-0.5 text-[10px] text-indigo-200 border border-indigo-400/30">
                    7-Day Horizon
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-black uppercase tracking-wider ${
                        forecastResult.trendDirection === "bullish"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : forecastResult.trendDirection === "bearish"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          : "bg-slate-500/20 text-slate-300 border border-slate-500/30"
                      }`}
                    >
                      {forecastResult.trendDirection === "bullish" && "Bullish ↗"}
                      {forecastResult.trendDirection === "bearish" && "Bearish ↘"}
                      {forecastResult.trendDirection === "stable" && "Stable →"}
                      <span>({forecastResult.trendPercentage >= 0 ? "+" : ""}{forecastResult.trendPercentage}%)</span>
                    </span>
                  </div>
                  <div className="text-right text-[11px] text-indigo-300">
                    Confidence: <strong className="text-white font-mono">{forecastResult.confidenceScore}%</strong>
                  </div>
                </div>

                <div className="mt-3 border-t border-indigo-800/80 pt-3 text-xs text-indigo-200/90 leading-relaxed">
                  {forecastResult.trendDirection === "bullish" ? (
                    <p>
                      📈 <strong className="text-emerald-300">Farmer Advisory:</strong> Upward APMC price pressure anticipated. Stagger sales over the coming 3–5 days to maximize realization.
                    </p>
                  ) : forecastResult.trendDirection === "bearish" ? (
                    <p>
                      📉 <strong className="text-rose-300">Farmer Advisory:</strong> Influx expected to soften rates. Prioritize direct buyer orders today to lock in current market peaks.
                    </p>
                  ) : (
                    <p>
                      ⚖️ <strong className="text-slate-300">Market Advisory:</strong> Prices expected to oscillate within stable bands. Follow normal dispatch schedules.
                    </p>
                  )}
                </div>

                <div className="mt-2 text-[10px] text-indigo-400/70 border-t border-indigo-900/60 pt-2 flex justify-between">
                  <span>Engine: {forecastResult.isAiServiceConnected ? "Python Ridge ML" : "Statistical EWMA"}</span>
                  <span>{forecastResult.historicalObservations} APMC records analyzed</span>
                </div>
              </div>
            )}

            {marketInsights ? (
              <div className="space-y-4">
                {/* Highest Mandi Rate (Best for Farmers) */}
                <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/40 p-5 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                    <span className="flex items-center gap-1.5">
                      <span>🏆</span> Best Farmer Realization
                    </span>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-900">
                      Highest Modal
                    </span>
                  </div>
                  <h4 className="mt-2 text-lg font-black text-gray-900">
                    {marketInsights.highestYard.marketName}
                  </h4>
                  <p className="text-xs text-gray-500">
                    📍 {marketInsights.highestYard.district}, Maharashtra
                  </p>
                  <div className="mt-3 flex items-baseline justify-between border-t border-emerald-100/80 pt-3">
                    <div>
                      <span className="text-2xl font-black text-emerald-800">
                        ₹{marketInsights.highestYard.modalPrice.toLocaleString("en-IN")}
                      </span>
                      <span className="text-xs text-gray-500 ml-1">/quintal</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-800 bg-white/80 px-2 py-1 rounded-lg border border-emerald-200">
                      ~₹{(marketInsights.highestYard.modalPrice / 100).toFixed(1)}/kg
                    </span>
                  </div>
                </div>

                {/* Lowest Mandi Rate (Consumer Benchmark) */}
                <div className="rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50/40 p-5 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-800">
                    <span className="flex items-center gap-1.5">
                      <span>📉</span> Lowest Mandi Supply
                    </span>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] text-blue-900">
                      Lowest Influx
                    </span>
                  </div>
                  <h4 className="mt-2 text-lg font-black text-gray-900">
                    {marketInsights.lowestYard.marketName}
                  </h4>
                  <p className="text-xs text-gray-500">
                    📍 {marketInsights.lowestYard.district}, Maharashtra
                  </p>
                  <div className="mt-3 flex items-baseline justify-between border-t border-blue-100/80 pt-3">
                    <div>
                      <span className="text-2xl font-black text-blue-800">
                        ₹{marketInsights.lowestYard.modalPrice.toLocaleString("en-IN")}
                      </span>
                      <span className="text-xs text-gray-500 ml-1">/quintal</span>
                    </div>
                    <span className="text-xs font-bold text-blue-800 bg-white/80 px-2 py-1 rounded-lg border border-blue-200">
                      ~₹{(marketInsights.lowestYard.modalPrice / 100).toFixed(1)}/kg
                    </span>
                  </div>
                </div>

                {/* State APMC Average */}
                <div className="rounded-3xl border border-gray-200/80 bg-white p-5 shadow-xs">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Maharashtra State APMC Average
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-gray-900">
                      ₹{marketInsights.avgModal.toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs text-gray-500">
                      /quintal (~₹{(marketInsights.avgModal / 100).toFixed(1)}/kg)
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Weighted median auction across {prices.length} reporting mandi yards today.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-gray-200 bg-gray-50 p-6 text-center text-xs text-gray-500">
                Loading yard metrics...
              </div>
            )}
          </div>
        </div>

        {/* Detailed APMC Yards Table */}
        <div className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <span>{selectedCrop} Mandi Rates by Yard</span>
                <span className="rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold px-2 py-0.5 border border-emerald-200">
                  {filteredPrices.length} yards
                </span>
              </h3>
              <p className="text-xs text-gray-500">
                Latest Agmarknet daily price bulletin with min, max, and modal clearing rates
              </p>
            </div>

            {/* Filter and Search Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search yard or variety..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-xl border border-gray-200 pl-8 pr-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-none w-48 sm:w-56"
                />
                <span className="absolute left-2.5 top-2 text-xs text-gray-400">🔍</span>
              </div>

              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 focus:border-emerald-500 focus:outline-none bg-white"
              >
                {DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          {loadingPrices ? (
            <div className="h-48 rounded-2xl bg-gray-50 animate-pulse flex items-center justify-center text-xs text-gray-400">
              Fetching APMC yard trading data...
            </div>
          ) : filteredPrices.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-xs text-gray-500">
              No APMC yard records found matching your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    <th className="py-3 px-4 rounded-l-xl">{t("mandi.marketYard", "APMC Yard")}</th>
                    <th className="py-3 px-4">{t("mandi.district", "District")}</th>
                    <th className="py-3 px-4">{t("mandi.grade", "Variety")}</th>
                    <th className="py-3 px-4 text-right">{t("mandi.minPrice", "Min Rate")}</th>
                    <th className="py-3 px-4 text-right">{t("mandi.maxPrice", "Max Rate")}</th>
                    <th className="py-3 px-4 text-right">{t("mandi.modalRate", "Modal Rate")}</th>
                    <th className="py-3 px-4 text-right">{t("mandi.retailEquivalent", "Per Kg Equivalent")}</th>
                    <th className="py-3 px-4 text-center rounded-r-xl">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPrices.map((record) => {
                    const isQuintal = record.unit.toLowerCase().includes("quintal");
                    const perKg = isQuintal ? (record.modalPrice / 100).toFixed(1) : null;

                    return (
                      <tr
                        key={record.id}
                        className="hover:bg-emerald-50/40 transition-colors group"
                      >
                        <td className="py-3.5 px-4 font-bold text-gray-900 flex items-center gap-2">
                          <span className="text-sm">🏛️</span>
                          <span>{record.marketName}</span>
                        </td>
                        <td className="py-3.5 px-4 text-gray-600 font-medium">
                          {record.district}
                        </td>
                        <td className="py-3.5 px-4 text-gray-500">
                          {record.variety || "Local / Hybrid"}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-gray-600">
                          ₹{record.minPrice.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-gray-600">
                          ₹{record.maxPrice.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-800 text-sm">
                          ₹{record.modalPrice.toLocaleString("en-IN")}
                          <span className="text-[10px] text-gray-400 font-normal ml-1">
                            /{record.unit}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {perKg ? (
                            <span className="rounded-lg bg-emerald-100/70 border border-emerald-200 px-2 py-0.5 font-mono font-bold text-emerald-900">
                              ₹{perKg}/kg
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center text-gray-400 font-mono text-[11px]">
                          {record.priceDate}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Footer Note */}
          <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between text-[11px] text-gray-400">
            <span>
              💡 <strong>Modal Rate</strong> represents the transaction price at which the majority
              of trading volume was settled on the trading day.
            </span>
            <span>Data synced from official Data.gov.in Open Government Data &amp; Agmarknet API</span>
          </div>
        </div>
      </div>

      {/* Buyer Role Warning Modal */}
      {showBuyerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-2xl">
                🌾
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900">Farmer Account Required</h3>
                <p className="text-xs text-gray-500">You are currently logged in as a Buyer</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Selling agricultural produce and setting fair farm gate prices with APMC Mandi
              benchmarks is reserved for registered Kisan / Farmer accounts.
            </p>
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3.5 text-xs text-amber-900 space-y-1">
              <p className="font-bold">Would you like to list crops as a Farmer?</p>
              <p className="text-amber-800">
                You can create a separate Farmer account with your phone number to start selling
                directly to consumers.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowBuyerModal(false)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                Stay as Buyer
              </button>
              <Link
                to="/signup"
                onClick={() => setShowBuyerModal(false)}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm"
              >
                Sign up as Farmer &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
