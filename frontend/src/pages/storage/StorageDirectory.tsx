import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { storageService } from "@/services/storage.service";
import type { StorageFacility, StorageFacilityType } from "@/types/storage";
import Spinner from "@/components/common/Spinner";
import ErrorMessage from "@/components/common/ErrorMessage";

const DISTRICTS = ["All Districts", "Nashik", "Pune", "Nagpur", "Sangli"];

export default function StorageDirectory() {
  const { t } = useTranslation();
  const [facilities, setFacilities] = useState<StorageFacility[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("All Districts");
  const [inquiryFacility, setInquiryFacility] = useState<StorageFacility | null>(null);
  const [inquirySuccess, setInquirySuccess] = useState<boolean>(false);

  const facilityTypes = useMemo(
    () => [
      { key: "", label: t("storage.allFacilities"), icon: "🏬" },
      { key: "cold_storage", label: t("storage.coldStorage"), icon: "❄️" },
      { key: "dry_warehouse", label: t("storage.dryWarehouse"), icon: "🌾" },
      { key: "ripening_chamber", label: t("storage.ripeningChamber"), icon: "🍌" },
      { key: "silo", label: t("storage.silo"), icon: "🏭" },
    ],
    [t]
  );

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    storageService
      .getFacilities()
      .then((data) => {
        if (mounted) setFacilities(data);
      })
      .catch((err) => {
        if (mounted) setError(err.message || "Failed to load storage facilities.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredFacilities = useMemo(() => {
    return facilities.filter((f) => {
      if (selectedType && f.type !== selectedType) return false;
      if (selectedDistrict !== "All Districts" && f.district.toLowerCase() !== selectedDistrict.toLowerCase()) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = f.name.toLowerCase().includes(q);
        const matchesDistrict = f.district.toLowerCase().includes(q);
        const matchesAddress = f.address.toLowerCase().includes(q);
        const matchesAmenities = f.amenities.some((a) => a.toLowerCase().includes(q));
        if (!matchesName && !matchesDistrict && !matchesAddress && !matchesAmenities) return false;
      }
      return true;
    });
  }, [facilities, selectedType, selectedDistrict, search]);

  const totalCapacitySum = facilities.reduce((sum, f) => sum + f.totalCapacity, 0);
  const totalAvailableSum = facilities.reduce((sum, f) => sum + f.availableCapacity, 0);

  return (
    <div className="min-h-screen bg-[var(--background)] py-8 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950 p-6 sm:p-10 text-white shadow-xl">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-emerald-200 border border-white/10 mb-3 backdrop-blur-xs">
              <span>🏛️</span> {t("storage.wdraRegisteredGov")}
            </div>
            <h1
              className="text-2xl sm:text-4xl font-extrabold tracking-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {t("storage.heroTitle")}
            </h1>
            <p className="mt-2 text-sm sm:text-base text-emerald-100/85 leading-relaxed">
              {t("storage.heroSubtitle")}
            </p>

            {/* Quick Metrics */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-white/15">
              <div>
                <p className="text-[11px] font-medium text-emerald-200">{t("storage.verifiedWarehouses")}</p>
                <p className="text-xl font-black">{facilities.length} Hubs</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-emerald-200">{t("storage.totalNetworkSpace")}</p>
                <p className="text-xl font-black">{totalCapacitySum.toLocaleString("en-IN")} MT</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-emerald-200">{t("storage.availableSpaceNow")}</p>
                <p className="text-xl font-black text-amber-300">
                  {totalAvailableSum.toLocaleString("en-IN")} MT
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-emerald-200">{t("storage.securityGuarantee")}</p>
                <p className="text-xl font-black text-emerald-300">{t("storage.insured")}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="rounded-3xl border border-gray-200/90 bg-white p-6 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row items-center gap-4">
            {/* Search Box */}
            <div className="relative flex-1 w-full">
              <span className="absolute left-3.5 top-3 text-sm text-gray-400">🔍</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("storage.searchPlaceholderFull")}
                className="w-full rounded-2xl border border-gray-200 pl-10 pr-4 py-2.5 text-xs text-gray-800 placeholder:text-gray-400 focus:border-emerald-600 focus:outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* District Selector */}
            <div className="w-full md:w-56 shrink-0">
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 px-3.5 py-2.5 text-xs font-bold text-gray-700 bg-white focus:border-emerald-600 focus:outline-none"
              >
                {DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    📍 {d === "All Districts" ? t("storage.allFacilities", "All Districts") : d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Facility Type Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
            <span className="text-xs font-bold text-gray-500 mr-1">{t("storage.facilityType")}</span>
            {facilityTypes.map((tab) => {
              const active = selectedType === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedType(tab.key)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                    active
                      ? "bg-emerald-700 text-white shadow-xs scale-102"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading / Error States */}
        {loading && (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <Spinner size="lg" />
            <p className="text-xs font-bold text-gray-500">{t("storage.loadingFacilities")}</p>
          </div>
        )}

        <ErrorMessage message={error} />

        {/* Empty State */}
        {!loading && !error && filteredFacilities.length === 0 && (
          <div className="rounded-3xl border border-gray-200 bg-white p-12 text-center shadow-xs">
            <span className="text-5xl">🏬</span>
            <h3 className="mt-4 text-base font-bold text-gray-900">{t("storage.noFacilitiesFound")}</h3>
            <p className="mt-1 text-xs text-gray-500">
              {t("storage.noFacilitiesDesc")}
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSelectedType("");
                setSelectedDistrict("All Districts");
              }}
              className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
            >
              {t("storage.resetFilters")}
            </button>
          </div>
        )}

        {/* Facilities Grid */}
        {!loading && !error && filteredFacilities.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredFacilities.map((facility) => {
              const availablePct = Math.round(
                (facility.availableCapacity / facility.totalCapacity) * 100
              );
              const isLowCapacity = availablePct < 25;

              const typeIcons: Record<StorageFacilityType, string> = {
                cold_storage: `❄️ ${t("storage.coldStorage")}`,
                dry_warehouse: `🌾 ${t("storage.dryWarehouse")}`,
                silo: `🏭 ${t("storage.silo")}`,
                ripening_chamber: `🍌 ${t("storage.ripeningChamber")}`,
              };

              return (
                <div
                  key={facility.id}
                  className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Top Type & Accreditation Badges */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-800 border border-emerald-200">
                        {typeIcons[facility.type] || facility.type}
                      </span>
                      {facility.wdraRegistered && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200 flex items-center gap-1">
                          <span>🛡️</span> {t("storage.wdraRegistered")}
                        </span>
                      )}
                    </div>

                    {/* Facility Title */}
                    <div>
                      <h3
                        className="text-base font-black text-gray-900 line-clamp-2"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        {facility.name}
                      </h3>
                      <p className="mt-1 text-xs text-gray-500 line-clamp-1 flex items-center gap-1">
                        <span>📍</span> {facility.address}
                      </p>
                    </div>

                    {/* Capacity Indicator Gauge */}
                    <div className="rounded-2xl bg-gray-50 border border-gray-100 p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 font-medium">{t("storage.capacity")}:</span>
                        <span
                          className={`font-black ${
                            isLowCapacity ? "text-amber-700" : "text-emerald-700"
                          }`}
                        >
                          {facility.availableCapacity.toLocaleString("en-IN")} /{" "}
                          {facility.totalCapacity.toLocaleString("en-IN")} MT
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isLowCapacity ? "bg-amber-500" : "bg-emerald-600"
                          }`}
                          style={{ width: `${availablePct}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-gray-400">
                        <span>{t("storage.openStorage", { pct: availablePct })}</span>
                        <span>
                          {t("storage.asOf", {
                            date: new Date(facility.capacityUpdatedAt).toLocaleDateString("en-IN", {
                              month: "short",
                              day: "numeric",
                            }),
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Temperature & Storage Atmosphere */}
                    {facility.temperatureRange && (
                      <div className="text-xs text-gray-600 bg-emerald-50/50 rounded-xl p-2.5 border border-emerald-100/60">
                        <span className="font-bold text-emerald-900">{t("storage.atmosphere")} </span>
                        <span>{facility.temperatureRange}</span>
                      </div>
                    )}

                    {/* Amenities Tags */}
                    <div className="flex flex-wrap gap-1.5">
                      {facility.amenities.slice(0, 4).map((amenity, idx) => (
                        <span
                          key={idx}
                          className="rounded-lg bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600"
                        >
                          ✓ {amenity}
                        </span>
                      ))}
                      {facility.amenities.length > 4 && (
                        <span className="rounded-lg bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
                          +{facility.amenities.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Pricing & Contact Actions Footer */}
                  <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-gray-400">{t("storage.monthlyTariff")}</p>
                      <p className="text-base font-black text-gray-900">
                        ₹{facility.pricePerTonPerMonth}
                        <span className="text-xs font-normal text-gray-500"> {t("storage.perMtMonth")}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${facility.contactPhone}`}
                        className="rounded-xl border border-gray-200 bg-white p-2 text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs"
                        title={`Call warehouse manager: ${facility.contactPhone}`}
                      >
                        📞
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setInquiryFacility(facility);
                          setInquirySuccess(false);
                        }}
                        className="rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2 text-xs font-bold transition-all shadow-xs"
                      >
                        {t("storage.reserveSpace")}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Space Reservation / Booking Modal */}
        {inquiryFacility && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-6 sm:p-8 shadow-2xl relative">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <span className="text-[11px] font-black uppercase text-emerald-800 tracking-wider">
                    {t("storage.warehouseCoordination")}
                  </span>
                  <h3
                    className="text-lg font-black text-gray-900"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {t("storage.reserveStorageSpace")}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setInquiryFacility(null)}
                  className="rounded-full p-2 text-gray-400 hover:bg-gray-100 transition-colors"
                >
                  ✕
                </button>
              </div>

              {inquirySuccess ? (
                <div className="py-8 text-center space-y-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl mx-auto">
                    ✅
                  </div>
                  <h4 className="text-base font-bold text-gray-900">
                    {t("storage.inquiryForwarded")}
                  </h4>
                  <p className="text-xs text-gray-600 max-w-sm mx-auto">
                    {t("storage.inquiryForwardedDesc", { name: inquiryFacility.name })}
                  </p>
                  <p className="font-mono text-sm font-black text-emerald-800 bg-emerald-50 py-2 px-4 rounded-xl inline-block">
                    {inquiryFacility.contactPhone}
                  </p>
                  <div>
                    <button
                      type="button"
                      onClick={() => setInquiryFacility(null)}
                      className="mt-4 rounded-xl bg-emerald-700 px-6 py-2 text-xs font-bold text-white shadow-xs"
                    >
                      {t("common.confirm")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-4 space-y-4 text-xs text-gray-700">
                  <div className="rounded-2xl bg-emerald-50/60 p-4 border border-emerald-100 space-y-1">
                    <p className="font-bold text-gray-900">{inquiryFacility.name}</p>
                    <p className="text-[11px] text-gray-500">
                      📍 {inquiryFacility.address} &bull; Open: {inquiryFacility.operatingHours}
                    </p>
                    <p className="text-xs font-black text-emerald-800 pt-1">
                      Rate: ₹{inquiryFacility.pricePerTonPerMonth} {t("storage.perMtMonth")} &bull; Available:{" "}
                      {inquiryFacility.availableCapacity} MT
                    </p>
                  </div>

                  <p className="text-gray-600 leading-relaxed">
                    {t("storage.enwrPrompt")}
                  </p>

                  <div className="pt-2 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setInquiryFacility(null)}
                      className="rounded-xl px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100"
                    >
                      {t("common.cancel")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setInquirySuccess(true)}
                      className="rounded-xl bg-emerald-700 hover:bg-emerald-800 px-5 py-2.5 text-xs font-bold text-white shadow-xs"
                    >
                      {t("storage.confirmSpaceRequest")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

