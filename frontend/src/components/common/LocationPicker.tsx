import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/services/api";

export interface VerifiedLocation {
  displayName: string;
  district: string;
  state: string;
  pincode?: string;
  coordinates: [number, number]; // [lng, lat]
}

interface LocationPickerProps {
  initialLocation?: string;
  onLocationSelected: (loc: VerifiedLocation) => void;
  label?: string;
  placeholder?: string;
}

export default function LocationPicker({
  initialLocation = "",
  onLocationSelected,
  label,
  placeholder,
}: LocationPickerProps) {
  const { t } = useTranslation();
  const displayLabel = label || t("location.defaultLabel");
  const displayPlaceholder = placeholder || t("location.placeholder");

  const [query, setQuery] = useState(initialLocation);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [verifiedLoc, setVerifiedLoc] = useState<VerifiedLocation | null>(null);
  const [error, setError] = useState("");
  const [showMap, setShowMap] = useState(false);

  // Search places via backend OpenStreetMap search
  async function handleSearch(searchTerm: string) {
    setQuery(searchTerm);
    if (searchTerm.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const res = await api.get<{ data: any[] }>(`/location/search?q=${encodeURIComponent(searchTerm)}`);
      setSuggestions(res.data || []);
      setError("");
    } catch (err: any) {
      console.warn("Location search error:", err);
    }
  }

  // Detect live GPS location
  function handleDetectGps() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setLoading(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const res = await api.get<{ data: any }>(`/location/reverse?lat=${lat}&lng=${lng}`);
          const item = res.data;

          const loc: VerifiedLocation = {
            displayName: item.displayName,
            district: item.district,
            state: item.state,
            pincode: item.pincode,
            coordinates: [lng, lat],
          };

          setVerifiedLoc(loc);
          setQuery(item.displayName);
          setSuggestions([]);
          setShowMap(true);
          onLocationSelected(loc);
        } catch (err: any) {
          setError("Failed to resolve GPS address from OpenStreetMap");
        } finally {
          setLoading(false);
        }
      },
      (geoErr) => {
        setLoading(false);
        setError(`GPS Error: ${geoErr.message}. You can search your town or district manually above.`);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  }

  // Select place from suggestion dropdown
  function selectSuggestion(item: any) {
    const loc: VerifiedLocation = {
      displayName: item.displayName,
      district: item.district,
      state: item.state,
      pincode: item.pincode,
      coordinates: [item.longitude, item.latitude],
    };

    setVerifiedLoc(loc);
    setQuery(item.displayName);
    setSuggestions([]);
    setShowMap(true);
    onLocationSelected(loc);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs sm:text-sm font-semibold text-gray-800">
          {displayLabel}
        </label>
        {verifiedLoc && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            ✓ {t("location.verifiedLocation")}
          </span>
        )}
      </div>

      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-base">
              📍
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={displayPlaceholder}
              className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 text-sm text-gray-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 transition"
            />
          </div>

          <button
            type="button"
            onClick={handleDetectGps}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs shadow-sm transition whitespace-nowrap"
            title="Detect GPS coordinates using device location"
          >
            <span>🛰️</span>
            <span>{loading ? t("location.locating") : t("location.useGps")}</span>
          </button>
        </div>

        {/* Search Suggestions Dropdown */}
        {suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 z-30 max-h-56 overflow-y-auto rounded-2xl bg-white shadow-xl border border-emerald-100 divide-y divide-gray-100">
            {suggestions.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => selectSuggestion(item)}
                className="w-full text-left p-3 hover:bg-emerald-50/60 transition flex items-start gap-2.5"
              >
                <span className="text-emerald-600 mt-0.5">🌾</span>
                <div className="text-xs">
                  <p className="font-semibold text-gray-900 line-clamp-1">{item.displayName}</p>
                  <p className="text-gray-500">
                    {t("location.district")}: <strong className="text-emerald-700">{item.district}</strong>, {item.state} {item.pincode ? `(${item.pincode})` : ""}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600 font-medium">{error}</p>
      )}

      {/* Verified Details Card & Map Toggle */}
      {verifiedLoc && (
        <div className="rounded-2xl bg-emerald-50/60 border border-emerald-200/80 p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-xs">
                ✓
              </span>
              <span className="font-semibold text-emerald-950">
                {t("location.osmGeocoded")}: {verifiedLoc.district}, {verifiedLoc.state}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowMap(!showMap)}
              className="text-emerald-700 hover:underline font-semibold text-xs"
            >
              {showMap ? t("location.hideMap") : t("location.viewMap")}
            </button>
          </div>

          <p className="text-gray-600 line-clamp-1 text-xs">
            {t("location.coordinates")}: <span className="font-mono">{verifiedLoc.coordinates[1].toFixed(4)}° N, {verifiedLoc.coordinates[0].toFixed(4)}° E</span>
            {verifiedLoc.pincode ? ` • PIN: ${verifiedLoc.pincode}` : ""}
          </p>

          {/* Embedded Interactive OpenStreetMap iframe Preview */}
          {showMap && (
            <div className="mt-2 h-44 w-full overflow-hidden rounded-xl border border-emerald-300 shadow-inner">
              <iframe
                title="OpenStreetMap Location"
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="no"
                marginHeight={0}
                marginWidth={0}
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${verifiedLoc.coordinates[0] - 0.05}%2C${verifiedLoc.coordinates[1] - 0.05}%2C${verifiedLoc.coordinates[0] + 0.05}%2C${verifiedLoc.coordinates[1] + 0.05}&layer=mapnik&marker=${verifiedLoc.coordinates[1]}%2C${verifiedLoc.coordinates[0]}`}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
