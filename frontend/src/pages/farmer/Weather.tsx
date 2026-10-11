import { useEffect, useState, useMemo } from "react";
import { Navigate } from "react-router";
import { useTranslation } from "react-i18next";
import { api } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { FARMER_NAV } from "./navItems";
import { getCachedLocation } from "@/utils/locationHelper";

interface WeatherAlertItem {
  id: string;
  district: string;
  alertType: "heavy_rain" | "frost" | "heatwave" | "strong_wind";
  severity: "info" | "warning" | "critical";
  headline: string;
  message: string;
  advisory: string;
  metricValue?: number;
  sentAt: string;
  validUntil: string;
}

interface WeatherResponse {
  data: {
    current?: {
      time: string;
      temperature_2m: number;
      relative_humidity_2m: number;
      precipitation: number;
      weather_code: number;
      wind_speed_10m: number;
    };
    daily?: {
      time: string[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      precipitation_sum: number[];
      precipitation_probability_max: number[];
      wind_speed_10m_max: number[];
    };
  };
  district: string;
  activeAlerts?: WeatherAlertItem[];
}

const DEFAULT_DISTRICTS = [
  "Nashik",
  "Pune",
  "Nagpur",
  "Kolhapur",
  "Solapur",
  "Ahmednagar",
  "Amarawati",
  "Akola",
  "Chhatrapati Sambhajinagar",
  "Jalgaon",
  "Satara",
  "Sangli",
  "Latur",
  "Thane",
  "Mumbai",
  "Dhule",
  "Nanded",
  "Ratnagiri",
];

function getWeatherDescription(code: number): { text: string; icon: string } {
  if (code === 0) return { text: "Clear Sky", icon: "☀️" };
  if (code === 1 || code === 2 || code === 3) return { text: "Partly Cloudy", icon: "⛅" };
  if (code >= 45 && code <= 48) return { text: "Fog / Mist", icon: "🌫️" };
  if (code >= 51 && code <= 55) return { text: "Drizzle", icon: "🌦️" };
  if (code >= 61 && code <= 65) return { text: "Rain Showers", icon: "🌧️" };
  if (code >= 71 && code <= 77) return { text: "Frost / Flurries", icon: "❄️" };
  if (code >= 80 && code <= 82) return { text: "Heavy Downpour", icon: "⛈️" };
  if (code >= 95 && code <= 99) return { text: "Thunderstorm", icon: "⚡" };
  return { text: "Overcast", icon: "☁️" };
}

export default function Weather() {
  const { t } = useTranslation();
  const { user, updateProfile, isAuthenticated, isLoading } = useAuth();

  // Strictly block buyers from accessing the weather dashboard
  if (!isLoading) {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    if (user?.role === "buyer") {
      return <Navigate to="/buyer/dashboard" replace />;
    }
  }

  const cachedLoc = getCachedLocation();
  const initialDistrict = user?.district || cachedLoc?.district || "Pune";
  const [districtList, setDistrictList] = useState<string[]>(DEFAULT_DISTRICTS);
  const [selectedDistrict, setSelectedDistrict] = useState<string>(initialDistrict);
  const [customSearch, setCustomSearch] = useState<string>("");
  const [locationSource, setLocationSource] = useState<string>(
    user?.district ? "Saved Farm Profile" : cachedLoc?.district ? "Cached Location" : "Auto Detecting..."
  );
  const [weatherData, setWeatherData] = useState<WeatherResponse | null>(null);
  const [alerts, setAlerts] = useState<WeatherAlertItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [usingGps, setUsingGps] = useState<boolean>(false);

  // Load weather for selected district
  const fetchWeather = async (district: string, customLat?: number, customLng?: number) => {
    try {
      setLoading(true);
      setError("");
      let url = `/weather?district=${encodeURIComponent(district)}`;
      if (customLat !== undefined && customLng !== undefined) {
        url = `/weather?lat=${customLat}&lng=${customLng}&district=${encodeURIComponent(district)}`;
      }

      const res = await api.get<WeatherResponse>(url);
      setWeatherData(res);
      setAlerts(res.activeAlerts || []);
    } catch (err: any) {
      console.error("Failed to fetch weather:", err);
      setError(err.message || "Failed to load meteorological advisory.");
    } finally {
      setLoading(false);
    }
  };

  // Sync with user's detected district or auto-trigger detection on mount
  useEffect(() => {
    if (user?.district) {
      setSelectedDistrict(user.district);
      if (!districtList.includes(user.district)) {
        setDistrictList((prev) => [user.district!, ...prev]);
      }
    } else {
      // Auto-fetch location directly so Nashik never defaults
      handleUseGps();
    }
  }, [user?.district]);

  useEffect(() => {
    fetchWeather(selectedDistrict);
  }, [selectedDistrict]);

  // Handle GPS Auto-Detection with robust reverse-geocoding & IP fallback
  const handleUseGps = () => {
    setUsingGps(true);
    setError("");
    setSuccessMsg("");

    const handleSuccess = async (lat: number, lng: number, source: string) => {
      try {
        // Reverse geocode coordinates to get human-readable Indian district name
        const rev = await api.get<{ data?: { district?: string; city?: string; state?: string; displayName?: string } }>(
          `/location/reverse?lat=${lat}&lng=${lng}`
        );
        const detected = rev.data?.district || rev.data?.city || "Detected Farm";
        
        // Add to district list if new
        setDistrictList((prev) => (prev.includes(detected) ? prev : [detected, ...prev]));
        setSelectedDistrict(detected);
        setLocationSource(source);
        setSuccessMsg(`📍 Successfully detected your farm in ${detected} (${lat.toFixed(2)}°N, ${lng.toFixed(2)}°E)`);

        // Save detected location directly to user profile
        if (updateProfile) {
          updateProfile({
            district: detected,
            location: { type: "Point", coordinates: [lng, lat] },
          }).catch(() => {});
        }

        await fetchWeather(detected, lat, lng);
      } catch {
        setSelectedDistrict("Detected Location");
        setLocationSource(source);
        setSuccessMsg(`📍 Weather loaded for coordinates (${lat.toFixed(2)}°N, ${lng.toFixed(2)}°E)`);
        await fetchWeather("Detected Location", lat, lng);
      } finally {
        setUsingGps(false);
      }
    };

    // 1. Try Browser HTML5 Geolocation with explicit timeout
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          handleSuccess(pos.coords.latitude, pos.coords.longitude, "Device GPS 🛰️");
        },
        async (err) => {
          console.warn("GPS unavailable/denied:", err.message);
          // 2. Fallback to IP-based Geolocation
          try {
            const ipRes = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(3500) });
            if (ipRes.ok) {
              const ipData = await ipRes.json();
              if (ipData.latitude && ipData.longitude) {
                await handleSuccess(ipData.latitude, ipData.longitude, "Network Location 🌐");
                return;
              }
            }
          } catch (ipErr) {
            console.warn("IP location fallback failed:", ipErr);
          }

          setError("GPS access was blocked or unavailable on this device. You can choose or search your district below.");
          setUsingGps(false);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    } else {
      // Browser doesn't support geolocation, try IP fallback directly
      fetch("https://ipapi.co/json/")
        .then((res) => res.json())
        .then((ipData) => {
          if (ipData.latitude && ipData.longitude) {
            handleSuccess(ipData.latitude, ipData.longitude, "Network Location 🌐");
          } else {
            setError("Location services are unavailable. Please select your district manually.");
            setUsingGps(false);
          }
        })
        .catch(() => {
          setError("Location services are unavailable. Please select your district manually.");
          setUsingGps(false);
        });
    }
  };

  const handleCustomSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = customSearch.trim();
    if (!query) return;

    setDistrictList((prev) => (prev.includes(query) ? prev : [query, ...prev]));
    setSelectedDistrict(query);
    setLocationSource("Manual Search 🔍");
    setCustomSearch("");
    setSuccessMsg(`📍 Weather advisory updated for ${query}`);
  };

  const current = weatherData?.data?.current;
  const daily = weatherData?.data?.daily;
  const weatherDesc = current ? getWeatherDescription(current.weather_code) : { text: "Loading...", icon: "🌤️" };

  // Farm Action Suitability Analysis
  const farmSignals = useMemo(() => {
    if (!current || !daily) return null;
    const rainToday = daily.precipitation_sum?.[0] ?? 0;
    const rainProbToday = daily.precipitation_probability_max?.[0] ?? 0;
    const windNow = current.wind_speed_10m;
    const tempNow = current.temperature_2m;

    const canSpray = windNow < 15 && rainProbToday < 35;
    const needIrrigation = rainToday < 5 && tempNow > 28;
    const goodForHarvest = rainProbToday < 25 && current.relative_humidity_2m < 75;

    return { canSpray, needIrrigation, goodForHarvest, rainToday, rainProbToday, windNow };
  }, [current, daily]);

  return (
    <DashboardLayout
      title={t("weather.title", "Agricultural Weather Advisory")}
      subtitle={t("weather.subtitle", "Micro-climate forecasts, agronomic alerts, and farm feasibility insights across Maharashtra")}
      navItems={FARMER_NAV}
    >
      <div className="space-y-6 pb-12 max-w-7xl mx-auto">
        {/* District Selector & Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-gray-200/80 bg-white p-4 sm:p-5 shadow-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
              <span>📍</span> {t("weather.selectDistrict", "Monitoring District")}:
            </span>
            <select
              value={selectedDistrict}
              onChange={(e) => {
                setSelectedDistrict(e.target.value);
                setLocationSource("Manual Selection");
                setSuccessMsg("");
              }}
              className="rounded-xl border border-gray-300 bg-gray-50 px-3.5 py-1.5 text-sm font-semibold text-gray-900 shadow-xs focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none cursor-pointer"
            >
              {districtList.map((dist) => (
                <option key={dist} value={dist}>
                  {dist}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleUseGps}
              disabled={usingGps}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-bold transition-all shadow-xs cursor-pointer ${
                usingGps
                  ? "bg-amber-50 border-amber-300 text-amber-800"
                  : "bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-50"
              }`}
            >
              <span>{usingGps ? "🛰️ Detecting Farm GPS..." : `🎯 ${t("location.useMyLocation", "Auto-Detect My Farm (GPS)")}`}</span>
            </button>

            {/* Custom Village / City / District Search */}
            <form onSubmit={handleCustomSearchSubmit} className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder={t("location.placeholder", "Or type any Indian city/taluka...")}
                value={customSearch}
                onChange={(e) => setCustomSearch(e.target.value)}
                className="rounded-xl border border-gray-300 bg-gray-50 px-3 py-1.5 text-xs text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none w-44 sm:w-52"
              />
              <button
                type="submit"
                className="rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 transition-colors shadow-2xs"
              >
                {t("common.search", "Search")}
              </button>
            </form>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold text-gray-500">
            <span className="rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
              {locationSource}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>IMD Agri-Station</span>
            </div>
          </div>
        </div>

        {/* Success message if location detected */}
        {successMsg && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800 flex items-center justify-between gap-2 shadow-2xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="text-base">✅</span>
              <span>{successMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessMsg("")}
              className="text-emerald-700 hover:text-emerald-900 font-bold px-2 py-0.5"
            >
              ✕
            </button>
          </div>
        )}

        {/* Error message if any */}
        {error && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs font-semibold text-amber-800 flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-base">📍</span>
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError("")}
              className="text-amber-700 hover:text-amber-900 font-bold px-2 py-0.5"
            >
              ✕
            </button>
          </div>
        )}

        {/* Severe Weather Alert Banners (T5.3 & T5.5) */}
        {alerts && alerts.length > 0 && (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-3xl border p-5 shadow-sm transition-all ${
                  alert.severity === "critical"
                    ? "border-red-300 bg-gradient-to-r from-red-50 to-amber-50 text-red-900"
                    : "border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-900"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/60 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">
                      {alert.alertType === "heavy_rain"
                        ? "⛈️"
                        : alert.alertType === "heatwave"
                        ? "🌡️"
                        : alert.alertType === "frost"
                        ? "❄️"
                        : "💨"}
                    </span>
                    <h3 className="text-base font-black tracking-tight">{alert.headline}</h3>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider ${
                      alert.severity === "critical" ? "bg-red-200 text-red-950" : "bg-amber-200 text-amber-950"
                    }`}
                  >
                    {alert.severity} ADVISORY
                  </span>
                </div>
                <p className="mt-3 text-xs leading-relaxed font-medium">{alert.message}</p>
                <div className="mt-3 rounded-2xl bg-white/80 p-3.5 border border-amber-200/50">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5 mb-1">
                    <span>🌾</span> Agronomic Action Plan:
                  </span>
                  <p className="text-xs text-gray-800 leading-relaxed font-semibold">{alert.advisory}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Current Meteorological Conditions Card */}
        {loading ? (
          <div className="h-64 rounded-3xl bg-gray-100 animate-pulse border border-gray-200" />
        ) : current ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Primary Current Card (2 cols) */}
            <div className="lg:col-span-2 rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-emerald-800 via-emerald-900 to-teal-950 text-white p-6 sm:p-8 shadow-md relative overflow-hidden">
              <div className="absolute -right-8 -bottom-8 opacity-10 text-9xl pointer-events-none select-none">
                {weatherDesc.icon}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-emerald-700/50 pb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                    Live Farm Atmosphere
                  </span>
                  <h2 className="text-2xl font-black">{selectedDistrict} Agrometeorological Zone</h2>
                </div>
                <div className="rounded-full bg-emerald-800/80 border border-emerald-600 px-3 py-1 text-xs font-bold text-emerald-200">
                  Updated Today
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <span className="text-6xl select-none">{weatherDesc.icon}</span>
                  <div>
                    <div className="text-5xl font-black tracking-tight">
                      {Math.round(current.temperature_2m)}°C
                    </div>
                    <p className="text-sm font-semibold text-emerald-200 mt-1">{weatherDesc.text}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 border-t lg:border-t-0 lg:border-l border-emerald-700/50 pt-4 lg:pt-0 lg:pl-6 text-center">
                  <div>
                    <span className="text-xs text-emerald-300 font-medium">{t("weather.humidity", "Humidity")}</span>
                    <p className="text-lg font-black">{current.relative_humidity_2m}%</p>
                  </div>
                  <div>
                    <span className="text-xs text-emerald-300 font-medium">{t("weather.precipitation", "Precipitation")}</span>
                    <p className="text-lg font-black">{current.precipitation} mm</p>
                  </div>
                  <div>
                    <span className="text-xs text-emerald-300 font-medium">{t("weather.windSpeed", "Wind Speed")}</span>
                    <p className="text-lg font-black">{Math.round(current.wind_speed_10m)} km/h</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Smart Farming Decisions Card (1 col) */}
            {farmSignals && (
              <div className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                    Agronomic Guidance
                  </span>
                  <h3 className="text-lg font-black text-gray-900 mt-0.5 mb-4">Daily Farm Activity Status</h3>

                  <div className="space-y-3 text-xs">
                    {/* Spraying Window */}
                    <div className="rounded-2xl border p-3 flex items-center justify-between gap-2 border-gray-100 bg-gray-50/70">
                      <div>
                        <p className="font-bold text-gray-800">Pesticide / Foliar Spray</p>
                        <p className="text-[11px] text-gray-500">
                          {farmSignals.windNow < 15 ? "Low wind drift" : "High wind drift risk"}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          farmSignals.canSpray
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {farmSignals.canSpray ? "✓ Favorable" : "⚠️ Postpone"}
                      </span>
                    </div>

                    {/* Irrigation Scheduling */}
                    <div className="rounded-2xl border p-3 flex items-center justify-between gap-2 border-gray-100 bg-gray-50/70">
                      <div>
                        <p className="font-bold text-gray-800">Irrigation Requirement</p>
                        <p className="text-[11px] text-gray-500">
                          {farmSignals.rainToday > 5 ? `${farmSignals.rainToday}mm rain recorded` : "Low soil moisture"}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          farmSignals.needIrrigation
                            ? "bg-blue-100 text-blue-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {farmSignals.needIrrigation ? "💧 Recommended" : "✓ Ample Rain"}
                      </span>
                    </div>

                    {/* Harvesting & Threshing */}
                    <div className="rounded-2xl border p-3 flex items-center justify-between gap-2 border-gray-100 bg-gray-50/70">
                      <div>
                        <p className="font-bold text-gray-800">Harvest & Sun-Drying</p>
                        <p className="text-[11px] text-gray-500">
                          {farmSignals.rainProbToday}% rain probability
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          farmSignals.goodForHarvest
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {farmSignals.goodForHarvest ? "✓ Safe Window" : "⚠️ Shelter Crops"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-400">
                  Advisory refreshed automatically via Open-Meteo & IMD
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* 7-Day Farm Weather Forecast */}
        {daily && daily.time && (
          <div className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                  7-Day Outlook
                </span>
                <h3 className="text-lg font-black text-gray-900">{t("weather.sevenDayForecast", "Weekly Meteorological Forecast")}</h3>
              </div>
              <span className="text-xs text-gray-400 font-medium">Daily min–max range</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 pt-2">
              {daily.time.slice(0, 7).map((dateStr: string, idx: number) => {
                const max = Math.round(daily.temperature_2m_max[idx]);
                const min = Math.round(daily.temperature_2m_min[idx]);
                const rain = daily.precipitation_sum?.[idx] ?? 0;
                const rainProb = daily.precipitation_probability_max?.[idx] ?? 0;
                const dayName = new Date(dateStr).toLocaleDateString("en-IN", {
                  weekday: "short",
                });
                const formattedDate = new Date(dateStr).toLocaleDateString("en-IN", {
                  month: "short",
                  day: "numeric",
                });

                return (
                  <div
                    key={dateStr}
                    className={`rounded-2xl border p-3.5 text-center flex flex-col justify-between transition-all hover:shadow-xs ${
                      idx === 0
                        ? "border-emerald-300 bg-emerald-50/50 shadow-xs"
                        : "border-gray-200 bg-gray-50/40"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-black text-gray-900">{idx === 0 ? "Today" : dayName}</div>
                      <div className="text-[10px] text-gray-400 font-medium">{formattedDate}</div>
                      <div className="text-2xl my-2">
                        {rain > 5 ? "🌧️" : rainProb > 40 ? "🌦️" : max > 35 ? "☀️" : "🌤️"}
                      </div>
                      <div className="text-sm font-black text-gray-900">
                        {max}° <span className="text-gray-400 font-normal text-xs">{min}°</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-gray-200/60 text-[10px] text-gray-500 font-medium">
                      <span>Rain: </span>
                      <strong className={rainProb > 40 ? "text-blue-600" : "text-gray-700"}>
                        {rainProb}%
                      </strong>
                      {rain > 0 && <span className="block text-[9px] text-blue-500">({rain} mm)</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Agricultural Extension Contact Information */}
        <div className="rounded-3xl border border-emerald-100 bg-emerald-50/50 p-5 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📞</span>
            <div>
              <p className="font-black text-gray-900">Need Immediate Agricultural Expert Guidance?</p>
              <p className="text-gray-600">
                Contact the National Kisan Call Centre or your local Krishi Vigyan Kendra (KVK).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="tel:18001801551"
              className="rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2 shadow-xs transition-all cursor-pointer"
            >
              Dial 1800-180-1551 (Toll Free)
            </a>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
