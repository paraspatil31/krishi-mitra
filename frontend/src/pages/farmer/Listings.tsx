import { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { listingService } from "@/services/listing.service";
import type { Listing } from "@/types/product";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ListingCard from "@/components/listings/ListingCard";
import Spinner from "@/components/common/Spinner";
import ErrorMessage from "@/components/common/ErrorMessage";
import { FARMER_NAV } from "./navItems";

const STATUS_FILTERS = [
  { value: "all", label: "All Statuses", icon: "🌾" },
  { value: "active", label: "Active in Shop", icon: "🟢" },
  { value: "draft", label: "Drafts", icon: "🟡" },
  { value: "sold_out", label: "Sold Out", icon: "🔴" },
  { value: "archived", label: "Archived", icon: "⚪" },
];

const CATEGORY_OPTIONS = [
  { value: "all", label: "🧺 All Categories" },
  { value: "vegetables", label: "🥦 Vegetables" },
  { value: "fruits", label: "🍎 Fruits" },
  { value: "grains", label: "🌾 Grains & Pulses" },
  { value: "dairy", label: "🥛 Dairy & Eggs" },
  { value: "herbs", label: "🌿 Herbs & Spices" },
  { value: "other", label: "📦 Other" },
];

export default function FarmerListings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [confirmDeleteListing, setConfirmDeleteListing] = useState<Listing | null>(null);

  // Filters & Controls
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState<"all" | "instock" | "low" | "out">("all");
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "price_desc" | "price_asc" | "stock_desc" | "stock_asc" | "name">("newest");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const fetchListings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const data = await listingService.getMyListings(user.id);
      setListings(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load listings.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  async function executeDelete(id: string) {
    setDeleteError("");
    setDeletingId(id);
    try {
      await listingService.deleteListing(id);
      setListings((prev) => prev.filter((l) => (l.id || (l as any)._id) !== id));
      setConfirmDeleteListing(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  }

  // Multi-field search & filtering
  const filteredListings = useMemo(() => {
    const q = search.trim().toLowerCase();

    return listings
      .filter((l) => {
        if (q) {
          const matchName = l.name?.toLowerCase().includes(q);
          const matchCategory = l.category?.toLowerCase().includes(q);
          const matchDesc = l.description?.toLowerCase().includes(q);
          const matchLoc = l.location?.toLowerCase().includes(q);
          const matchUnit = l.unit?.toLowerCase().includes(q);
          const matchPrice = String(l.price).includes(q);
          const matchStatus = l.status?.toLowerCase().includes(q);

          if (!matchName && !matchCategory && !matchDesc && !matchLoc && !matchUnit && !matchPrice && !matchStatus) {
            return false;
          }
        }

        if (categoryFilter !== "all" && l.category?.toLowerCase() !== categoryFilter) {
          return false;
        }

        if (statusFilter !== "all" && l.status !== statusFilter) {
          return false;
        }

        if (stockFilter === "instock" && l.quantity <= 0) return false;
        if (stockFilter === "low" && (l.quantity <= 0 || l.quantity > 15)) return false;
        if (stockFilter === "out" && l.quantity > 0) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "newest") {
          return new Date(b.createdAt || b.harvestDate || 0).getTime() - new Date(a.createdAt || a.harvestDate || 0).getTime();
        }
        if (sortBy === "price_desc") return b.price - a.price;
        if (sortBy === "price_asc") return a.price - b.price;
        if (sortBy === "stock_desc") return b.quantity - a.quantity;
        if (sortBy === "stock_asc") return a.quantity - b.quantity;
        if (sortBy === "name") return a.name.localeCompare(b.name);
        return 0;
      });
  }, [listings, search, categoryFilter, statusFilter, stockFilter, sortBy]);

  // Farm Inventory Summary Metrics
  const stats = useMemo(() => {
    const totalCrops = listings.length;
    const activeCrops = listings.filter((l) => l.status === "active").length;
    const totalUnits = listings.reduce((sum, l) => sum + (l.quantity || 0), 0);
    const totalInventoryValue = listings.reduce((sum, l) => sum + (l.price || 0) * (l.quantity || 0), 0);
    const lowStockCount = listings.filter((l) => l.quantity > 0 && l.quantity <= 15).length;
    const outOfStockCount = listings.filter((l) => l.quantity === 0).length;

    return { totalCrops, activeCrops, totalUnits, totalInventoryValue, lowStockCount, outOfStockCount };
  }, [listings]);

  const activeAdvancedFilterCount = (statusFilter !== "all" ? 1 : 0) + (stockFilter !== "all" ? 1 : 0);
  const hasActiveFilters = search || categoryFilter !== "all" || statusFilter !== "all" || stockFilter !== "all";

  function clearAllFilters() {
    setSearch("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setStockFilter("all");
  }

  return (
    <DashboardLayout
      title={t("nav.myListings", "Farm Harvests & Inventory")}
      subtitle={t("listing.pricingInventory", "Manage your crop stock, live prices, and farm listings")}
      navItems={FARMER_NAV}
      actions={
        <Link
          to="/farmer/listings/new"
          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-5 py-2.5 text-sm font-black text-white shadow-md shadow-emerald-800/20 hover:from-emerald-500 hover:to-emerald-600 transition-all btn-spring"
        >
          <span className="text-base leading-none font-black">+</span>
          <span>{t("listing.createListing", "Create Listing")}</span>
        </Link>
      }
    >
      <div className="space-y-6">
        {/* Inventory Analytics Header */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-white p-4.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-2xl">🌱</span>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-black text-gray-900">
              {stats.activeCrops}{" "}
              <span className="text-xs font-normal text-gray-400">/ {stats.totalCrops}</span>
            </p>
            <p className="text-xs font-bold text-gray-600 mt-0.5">Live Produce in Store</p>
          </div>

          <div className="rounded-3xl border border-blue-200/70 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-white p-4.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-2xl">⚖️</span>
              <span className="text-[11px] font-bold text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded-full">
                Volume
              </span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-black text-gray-900">
              {stats.totalUnits.toLocaleString()}{" "}
              <span className="text-xs font-normal text-gray-400">units</span>
            </p>
            <p className="text-xs font-bold text-gray-600 mt-0.5">Total Physical Volume</p>
          </div>

          <div className="rounded-3xl border border-amber-200/70 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white p-4.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-2xl">💰</span>
              <span className="text-[11px] font-bold text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded-full">
                Value
              </span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-black text-gray-900">
              ₹{stats.totalInventoryValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs font-bold text-gray-600 mt-0.5">Est. Stock Valuation</p>
          </div>

          <div className="rounded-3xl border border-red-200/70 bg-gradient-to-br from-red-500/10 via-red-500/5 to-white p-4.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-2xl">⚠️</span>
              <span className="text-[11px] font-bold text-red-700 bg-red-100/60 px-2 py-0.5 rounded-full">
                Alerts
              </span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-black text-gray-900">
              {stats.lowStockCount + stats.outOfStockCount}{" "}
              <span className="text-xs font-normal text-gray-400">crops</span>
            </p>
            <p className="text-xs font-bold text-gray-600 mt-0.5">Low or Empty Stock</p>
          </div>
        </div>

        {deleteError && <ErrorMessage message={deleteError} className="mb-2" />}

        {/* Clean Search & Control Bar (Separate Category & Filter Button) */}
        <div className="rounded-3xl border border-gray-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-700">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search crops, category, location, or price…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 text-sm rounded-2xl border border-gray-200 bg-gray-50/60 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  title="Clear search"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 text-xs font-bold text-gray-700">
                    ✕
                  </span>
                </button>
              )}
            </div>

            {/* Category Selector Dropdown & Filter Toggle Button */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Dropdown Button */}
              <div className="relative">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="appearance-none rounded-2xl border border-gray-200 bg-white py-2.5 pl-3.5 pr-8 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 hover:border-emerald-400 transition-all shadow-xs cursor-pointer"
                >
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-gray-400 text-xs">
                  ▼
                </div>
              </div>

              {/* Separate Filter Button */}
              <button
                type="button"
                onClick={() => setShowFilterDrawer((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 rounded-2xl border px-3.5 py-2.5 text-xs font-bold transition-all btn-spring shadow-xs ${
                  showFilterDrawer || activeAdvancedFilterCount > 0
                    ? "bg-emerald-700 text-white border-emerald-700 shadow-emerald-800/10"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-emerald-300"
                }`}
              >
                <span>🌪️ Filters</span>
                {activeAdvancedFilterCount > 0 && (
                  <span className="rounded-full bg-amber-400 text-amber-950 px-1.5 py-0.2 text-[10px] font-black">
                    {activeAdvancedFilterCount}
                  </span>
                )}
                <span className="text-[10px] ml-0.5">{showFilterDrawer ? "▲" : "▼"}</span>
              </button>

              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="appearance-none rounded-2xl border border-gray-200 bg-white py-2.5 pl-3.5 pr-8 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 hover:border-emerald-400 transition-all shadow-xs cursor-pointer"
                >
                  <option value="newest">📅 Newest Harvest</option>
                  <option value="price_desc">💰 Price: High to Low</option>
                  <option value="price_asc">🏷️ Price: Low to High</option>
                  <option value="stock_desc">📦 Stock: High to Low</option>
                  <option value="stock_asc">⚠️ Stock: Low to High</option>
                  <option value="name">🔤 Name: A to Z</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-gray-400 text-xs">
                  ▼
                </div>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center rounded-2xl border border-gray-200 bg-gray-100 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all ${
                    viewMode === "grid"
                      ? "bg-white text-emerald-800 shadow-xs"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                  title="Card Grid View"
                >
                  ▦ Grid
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all ${
                    viewMode === "table"
                      ? "bg-white text-emerald-800 shadow-xs"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                  title="Inventory Table View"
                >
                  ☰ Table
                </button>
              </div>
            </div>
          </div>

          {/* Collapsible Advanced Filter Drawer (Opens when Filter Button is clicked) */}
          {showFilterDrawer && (
            <div className="pt-3 border-t border-gray-100 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                {/* Status Filter */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-bold text-gray-400 mr-1">Status:</span>
                  {STATUS_FILTERS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setStatusFilter(f.value)}
                      className={`rounded-xl px-2.5 py-1 font-semibold transition-all ${
                        statusFilter === f.value
                          ? "bg-gray-900 text-white shadow-xs"
                          : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      <span className="mr-1">{f.icon}</span>
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Stock Level Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-gray-400">Stock:</span>
                  <button
                    onClick={() => setStockFilter("all")}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold ${
                      stockFilter === "all" ? "bg-gray-200 text-gray-800 font-bold" : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setStockFilter("instock")}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold ${
                      stockFilter === "instock" ? "bg-emerald-100 text-emerald-800 font-bold" : "text-gray-500 hover:text-emerald-700"
                    }`}
                  >
                    In Stock (&gt;0)
                  </button>
                  <button
                    onClick={() => setStockFilter("low")}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold ${
                      stockFilter === "low" ? "bg-amber-100 text-amber-800 font-bold" : "text-gray-500 hover:text-amber-700"
                    }`}
                  >
                    Low (≤15)
                  </button>
                  <button
                    onClick={() => setStockFilter("out")}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold ${
                      stockFilter === "out" ? "bg-red-100 text-red-800 font-bold" : "text-gray-500 hover:text-red-700"
                    }`}
                  >
                    Empty (0)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Active Filter Indicators */}
          <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-50">
            <p>
              Showing <strong className="text-gray-900">{filteredListings.length}</strong> of{" "}
              <strong>{listings.length}</strong> total harvest crops
              {categoryFilter !== "all" && (
                <span>
                  {" "}
                  in <strong className="text-emerald-800 capitalize">{categoryFilter}</strong>
                </span>
              )}
              {search && (
                <span>
                  {" "}
                  matching &ldquo;<span className="text-emerald-700 font-semibold">{search}</span>&rdquo;
                </span>
              )}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="font-bold text-emerald-700 hover:underline hover:text-emerald-800"
              >
                Reset All Filters ✕
              </button>
            )}
          </div>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        )}

        {!loading && error && <ErrorMessage message={error} className="max-w-md" />}

        {/* Empty State */}
        {!loading && !error && filteredListings.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-white py-16 px-4 text-center shadow-xs">
            <span className="text-5xl mb-3">🌾</span>
            <p className="text-lg font-extrabold text-gray-900">
              {hasActiveFilters ? "No crops match your search or filters" : "Your farm barn is empty"}
            </p>
            <p className="mt-1 text-sm text-gray-500 max-w-sm">
              {hasActiveFilters
                ? "Try searching for a different crop name, resetting category/status filters, or checking spelling."
                : "List your freshly harvested vegetables, grains, or fruits to begin receiving direct buyer orders."}
            </p>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearAllFilters}
                className="mt-5 rounded-2xl bg-gray-900 px-5 py-2.5 text-xs font-extrabold text-white hover:bg-gray-800 transition-all btn-spring"
              >
                Clear Search & Filters
              </button>
            ) : (
              <Link
                to="/farmer/listings/new"
                className="mt-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-3 text-sm font-black text-white hover:from-emerald-500 hover:to-emerald-600 shadow-md shadow-emerald-800/20 transition-all btn-spring"
              >
                + Create First Listing
              </Link>
            )}
          </div>
        )}

        {/* Grid Cards View */}
        {!loading && !error && filteredListings.length > 0 && viewMode === "grid" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredListings.map((listing) => {
              const id = listing.id || (listing as any)._id;
              return (
                <ListingCard
                  key={id}
                  listing={listing}
                  onDelete={() => setConfirmDeleteListing(listing)}
                  deleting={deletingId === id}
                />
              );
            })}
          </div>
        )}

        {/* Table View */}
        {!loading && !error && filteredListings.length > 0 && viewMode === "table" && (
          <div className="rounded-3xl border border-gray-200 bg-white overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 border-b border-gray-200 text-xs font-extrabold text-gray-700 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Crop Name</th>
                    <th className="px-4 py-3.5">Category</th>
                    <th className="px-4 py-3.5">Price</th>
                    <th className="px-4 py-3.5">Stock Left</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Harvest Date</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredListings.map((l) => {
                    const id = l.id || (l as any)._id;
                    const isLow = l.quantity > 0 && l.quantity <= 15;
                    const isOut = l.quantity === 0;

                    return (
                      <tr key={id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                              {l.images && l.images[0] ? (
                                <img src={l.images[0]} alt={l.name} className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-lg">🌾</div>
                              )}
                            </div>
                            <div>
                              <p className="font-extrabold text-gray-900 line-clamp-1">{l.name}</p>
                              <p className="text-xs text-gray-400 truncate max-w-xs">{l.location || "Farm Direct"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-800 capitalize">
                            {l.category}
                          </span>
                        </td>
                        <td className="px-4 py-4 font-black text-gray-900">
                          ₹{l.price.toFixed(2)} <span className="text-xs font-normal text-gray-400">/{l.unit}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`font-black ${
                              isOut ? "text-red-600" : isLow ? "text-amber-600" : "text-emerald-700"
                            }`}
                          >
                            {l.quantity} {l.unit}
                            {isOut && " (Empty)"}
                            {isLow && " ⚠️"}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${
                              l.status === "active"
                                ? "bg-emerald-100 text-emerald-800"
                                : l.status === "draft"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {l.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-xs text-gray-500">
                          {l.harvestDate
                            ? new Date(l.harvestDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "—"}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <Link
                              to={`/products/${id}`}
                              target="_blank"
                              className="rounded-lg border border-gray-200 p-1.5 text-xs text-gray-500 hover:text-emerald-700 hover:border-emerald-300"
                              title="Buyer Preview"
                            >
                              👁️
                            </Link>
                            <Link
                              to={`/farmer/listings/${id}/edit`}
                              className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                            >
                              Edit
                            </Link>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteListing(l)}
                              className="rounded-lg bg-red-50 border border-red-200 px-2 py-1 text-xs font-bold text-red-700 hover:bg-red-100"
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {confirmDeleteListing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in-up">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-gray-100 animate-scale-in">
              <div className="flex items-center gap-3 text-red-600 mb-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-100 text-xl font-bold">
                  ⚠️
                </span>
                <h3 className="text-lg font-extrabold text-gray-900">Confirm Harvest Removal</h3>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                Are you sure you want to delete{" "}
                <strong className="text-gray-900 font-bold">&ldquo;{confirmDeleteListing.name}&rdquo;</strong>?
                This crop will be permanently removed from the marketplace.
              </p>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={deletingId !== null}
                  onClick={() => setConfirmDeleteListing(null)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deletingId !== null}
                  onClick={() => executeDelete(confirmDeleteListing.id || (confirmDeleteListing as any)._id)}
                  className="rounded-xl bg-red-600 px-5 py-2 text-xs font-extrabold text-white hover:bg-red-700 shadow-md shadow-red-600/20 transition-all btn-spring disabled:opacity-50"
                >
                  {deletingId ? "Deleting…" : "Yes, Delete Listing"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
