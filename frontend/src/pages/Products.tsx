import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { productService } from "@/services/product.service";
import { useCart } from "@/context/CartContext";
import type { Product } from "@/types/product";
import Spinner from "@/components/common/Spinner";
import ErrorMessage from "@/components/common/ErrorMessage";
import QualityGradeBadge from "@/components/common/QualityGradeBadge";

const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  vegetables: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80",
  fruits: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600&auto=format&fit=crop&q=80",
  grains: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&auto=format&fit=crop&q=80",
  dairy: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80",
  herbs: "https://images.unsplash.com/photo-1509358271058-acd22cc93898?w=600&auto=format&fit=crop&q=80",
  other: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&auto=format&fit=crop&q=80",
};

export default function Products() {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("");
  const [sortBy, setSortBy] = useState<"featured" | "price_asc" | "price_desc" | "newest">("featured");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [maxPriceFilter, setMaxPriceFilter] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addedItemMap, setAddedItemMap] = useState<Record<string, boolean>>({});

  const { add } = useCart();

  const categories = useMemo(() => [
    { label: t("products.allHarvests", "All Harvests"), value: "", icon: "🌾" },
    { label: t("products.vegetables", "Vegetables"), value: "vegetables", icon: "🥦" },
    { label: t("products.fruits", "Fruits"), value: "fruits", icon: "🍎" },
    { label: t("products.grains", "Grains & Pulses"), value: "grains", icon: "🌾" },
    { label: t("products.dairy", "Dairy & Eggs"), value: "dairy", icon: "🥛" },
    { label: t("products.herbs", "Herbs & Spices"), value: "herbs", icon: "🌿" },
    { label: t("products.other", "Other Specialties"), value: "other", icon: "🧺" },
  ], [t]);

  const popularSearches = useMemo(() => [
    "Desi Tomatoes", "Alphonso Mango", "Organic Wheat", "Gir Cow Ghee", "Fresh Spinach", "Nashik Onions"
  ], []);

  const trustBadges = useMemo(() => [
    { icon: "🌱", label: t("products.farmDirect", "100% Farm Direct"), desc: t("products.farmDirectDesc", "No middleman markups") },
    { icon: "🚚", label: t("products.harvestToDoor", "24h Harvest-to-Door"), desc: t("products.harvestToDoorDesc", "Picked fresh daily") },
    { icon: "🔒", label: t("products.escrowProtected", "Escrow Protected"), desc: t("products.escrowProtectedDesc", "Pay once you inspect") },
    { icon: "⛓", label: t("products.blockchainVerified", "Blockchain Verified"), desc: t("products.blockchainVerifiedDesc", "Tamper-proof provenance") },
  ], [t]);

  useEffect(() => {
    setLoading(true);
    setError("");
    productService
      .getProducts({ search, category: selectedCat })
      .then((data) => {
        setProducts(data || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [search, selectedCat]);

  function handleQuickAdd(p: Product, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const id = p.id || (p as any)._id;
    add({ ...p, id }, 1);
    setAddedItemMap((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setAddedItemMap((prev) => ({ ...prev, [id]: false }));
    }, 1800);
  }

  // Client-side filtering & sorting
  const displayedProducts = useMemo(() => {
    let list = [...products];

    if (inStockOnly) {
      list = list.filter((p) => p.quantity > 0);
    }

    if (maxPriceFilter !== null) {
      list = list.filter((p) => p.price <= maxPriceFilter);
    }

    if (sortBy === "price_asc") {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price_desc") {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === "newest") {
      list.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    return list;
  }, [products, inStockOnly, maxPriceFilter, sortBy]);

  const activeFiltersCount = (selectedCat ? 1 : 0) + (inStockOnly ? 1 : 0) + (maxPriceFilter !== null ? 1 : 0) + (search ? 1 : 0);

  return (
    <div className="space-y-8 pb-20">
      {/* Dynamic Hero Header */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#071810] via-[#0f2e1e] to-[#071810] text-white py-12 sm:py-16">
        <div
          className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-30"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1600&auto=format&fit=crop&q=80')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#071810] via-transparent to-transparent opacity-90" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 border border-emerald-400/40 px-3 py-1 text-xs font-bold text-emerald-300 uppercase tracking-wider backdrop-blur-sm animate-float shadow-sm">
                <span>🌾</span> {t("products.heroBadge", "Bharat Farm Gate Marketplace")}
              </span>
              <span className="rounded-full bg-amber-400/20 border border-amber-400/30 px-3 py-1 text-xs font-bold text-amber-300 backdrop-blur-sm">
                ⚡ {t("products.directFairPrice", "Direct Fair Price")}
              </span>
            </div>

            <h1
              className="mt-3 text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight text-white"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {t("products.heroTitle", "Fresh Seasonal Produce, Straight From the Soil")}
            </h1>
            <p className="mt-3 text-sm sm:text-base text-emerald-100/80 leading-relaxed max-w-2xl">
              {t("products.heroSubtitle", "Connect with verified regional farmers across Maharashtra, Punjab, and Karnataka. Zero mandi intermediaries, guaranteed freshness, and escrow secured.")}
            </p>

            {/* Glassmorphic Search Bar inside Header */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  className="w-full rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md pl-11 pr-10 py-3.5 text-sm text-white placeholder:text-emerald-200/60 focus:border-emerald-400 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 transition-all shadow-xl"
                  placeholder={t("products.searchPlaceholder", "Search farm fresh produce, crops, fruits, or farmers…")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <span className="absolute left-4 top-4 text-base text-emerald-300">🔍</span>
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3.5 top-3.5 text-xs text-white/70 hover:text-white rounded-full bg-white/15 h-6 w-6 flex items-center justify-center transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Quick Search Suggestions */}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-emerald-200/80">
              <span className="font-semibold text-emerald-300">{t("products.popular", "Popular:")}</span>
              {popularSearches.map((term) => (
                <button
                  key={term}
                  onClick={() => setSearch(term)}
                  className="rounded-lg bg-white/10 hover:bg-white/25 px-2.5 py-1 text-white text-[11px] font-medium transition-all hover:scale-105 active:scale-95"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>

          {/* Value Props Strip */}
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3 pt-6 border-t border-white/10">
            {trustBadges.map((badge) => (
              <div key={badge.label} className="flex items-center gap-3 rounded-2xl bg-white/5 p-3 backdrop-blur-xs border border-white/10">
                <span className="text-2xl">{badge.icon}</span>
                <div>
                  <p className="text-xs font-bold text-white">{badge.label}</p>
                  <p className="text-[10px] text-emerald-200/70">{badge.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Category Selector Tabs */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
              {t("products.categories", "Categories")}
            </h2>
            {selectedCat && (
              <button
                onClick={() => setSelectedCat("")}
                className="text-xs font-bold text-emerald-700 hover:underline"
              >
                {t("products.clearCategory", "Clear Category Filter")}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((c) => {
              const isActive = selectedCat === c.value;
              return (
                <button
                  key={c.value}
                  onClick={() => setSelectedCat(c.value)}
                  className={`group inline-flex items-center gap-2 whitespace-nowrap rounded-2xl px-4 py-3 text-xs sm:text-sm font-bold transition-all shadow-xs ${
                    isActive
                      ? "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-700/20 scale-[1.03] ring-2 ring-emerald-500/30"
                      : "bg-white text-gray-700 hover:bg-emerald-50/80 hover:text-emerald-800 border border-gray-100 hover:border-emerald-200"
                  }`}
                >
                  <span className="text-base sm:text-lg group-hover:scale-110 transition-transform">
                    {c.icon}
                  </span>
                  <span>{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between rounded-3xl bg-white p-4 border border-gray-100 shadow-xs">
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 font-semibold w-full md:w-auto">
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl border border-emerald-100">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{t("products.listingsAvailable", { count: displayedProducts.length, defaultValue: `${displayedProducts.length} Listings Available` })}</span>
            </div>

            {/* Quick Price Range Chips */}
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">{t("products.budget", "Budget:")}</span>
              <button
                onClick={() => setMaxPriceFilter(maxPriceFilter === 50 ? null : 50)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                  maxPriceFilter === 50
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {t("products.under50", "Under ₹50")}
              </button>
              <button
                onClick={() => setMaxPriceFilter(maxPriceFilter === 150 ? null : 150)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                  maxPriceFilter === 150
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {t("products.under150", "Under ₹150")}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap w-full md:w-auto items-center justify-between md:justify-end gap-3">
            <label className="inline-flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer select-none bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-xl border border-gray-200/60 transition-colors">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              {t("products.inStockOnly", "In Stock Only")}
            </label>

            <select
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="featured">{t("products.sortFeatured", "✨ Sort: Featured Picks")}</option>
              <option value="newest">{t("products.sortNewest", "🌱 Sort: Fresh Harvest")}</option>
              <option value="price_asc">{t("products.sortPriceAsc", "📉 Price: Low to High")}</option>
              <option value="price_desc">{t("products.sortPriceDesc", "📈 Price: High to Low")}</option>
            </select>

            {activeFiltersCount > 0 && (
              <button
                onClick={() => {
                  setSearch("");
                  setSelectedCat("");
                  setInStockOnly(false);
                  setMaxPriceFilter(null);
                  setSortBy("featured");
                }}
                className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline px-2 py-1"
              >
                {t("products.resetFilters", "Reset")} ({activeFiltersCount})
              </button>
            )}
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24">
            <Spinner size="lg" />
            <p className="mt-4 text-xs font-bold text-emerald-800 tracking-wide">
              {t("products.fetchingHarvests", "Fetching verified farmer harvests…")}
            </p>
          </div>
        )}

        {error && <ErrorMessage message={error} />}

        {/* Empty State */}
        {!loading && !error && displayedProducts.length === 0 && (
          <div className="mt-10 rounded-3xl border border-gray-100 bg-white p-12 text-center shadow-xs">
            <span className="text-6xl">🌾</span>
            <h3 className="mt-4 text-xl font-bold text-gray-900">{t("products.noProduceTitle", "No Produce Matches Your Filter")}</h3>
            <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
              {t("products.noProduceDesc", "We couldn't find crops matching your current search parameters. Try changing your harvest keywords or resetting filters.")}
            </p>
            <button
              onClick={() => {
                setSearch("");
                setSelectedCat("");
                setInStockOnly(false);
                setMaxPriceFilter(null);
              }}
              className="mt-6 rounded-2xl bg-emerald-600 px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition-all hover:scale-105"
            >
              {t("products.resetViewAll", "Reset Filters & View All Produce")}
            </button>
          </div>
        )}

        {/* Dynamic Product Grid */}
        {!loading && !error && displayedProducts.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {displayedProducts.map((p) => {
              const productId = p.id || (p as any)._id;
              const isOutOfStock = p.quantity <= 0;
              const fallbackImg = CATEGORY_FALLBACK_IMAGES[p.category] || CATEGORY_FALLBACK_IMAGES.vegetables;
              const displayImg = p.images && p.images[0] ? p.images[0] : fallbackImg;
              const isAdded = addedItemMap[productId];
              const estimatedRetail = Math.round(p.price * 1.3);

              return (
                <Link
                  key={productId}
                  to={`/products/${productId}`}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xs card-hover-lift animate-fade-in-up hover:border-emerald-300"
                >
                  {/* Photo container */}
                  <div className="relative h-56 bg-gray-100 overflow-hidden">
                    <img
                      src={displayImg}
                      alt={p.name}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-108"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = fallbackImg;
                      }}
                    />

                    {/* Gradient shade */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-70 group-hover:opacity-50 transition-opacity" />

                    {/* Stock status badge */}
                    <span
                      className={`absolute top-3 right-3 rounded-full px-3 py-1 text-xs font-bold shadow-md backdrop-blur-md ${
                        isOutOfStock
                          ? "bg-red-500 text-white"
                          : p.quantity <= 5
                          ? "bg-amber-500 text-white"
                          : "bg-emerald-600/90 text-white"
                      }`}
                    >
                      {isOutOfStock
                        ? t("listing.soldOut", "Sold Out")
                        : p.quantity <= 5
                        ? t("products.onlyLeft", { count: p.quantity, unit: p.unit, defaultValue: `Only ${p.quantity} ${p.unit} left` })
                        : t("products.freshHarvestBadge", "✓ Fresh Harvest")}
                    </span>

                    {/* Verified Provenance Chip */}
                    <span className="absolute top-3 left-3 rounded-full bg-black/60 backdrop-blur-md border border-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white flex items-center gap-1 shadow-sm">
                      <span>⛓</span> {t("products.onChainProvenance", "On-Chain Provenance")}
                    </span>

                    {/* Farmer identity pill on photo */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                      <span className="rounded-xl bg-black/60 backdrop-blur-md px-2.5 py-1 text-[11px] font-bold text-white flex items-center gap-1.5 shadow-sm truncate max-w-[180px]">
                        <span>🧑‍🌾</span>
                        <span className="truncate">{p.farmerName || t("badges.verifiedFarmer", "Verified Grower")}</span>
                      </span>

                      <span className="rounded-xl bg-amber-400/90 backdrop-blur-md px-2 py-0.5 text-[11px] font-black text-amber-950 shadow-sm flex items-center gap-0.5">
                        <span>★</span> 4.9
                      </span>
                    </div>
                  </div>

                  {/* Info Block */}
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full text-[10px]">
                          {p.category}
                        </span>
                        <QualityGradeBadge grade={(p as any).qualityGrade || "A"} size="sm" showLabel={false} />
                      </div>
                      <span className="font-semibold text-gray-500 flex items-center gap-1">
                        <span>📍</span>
                        <span className="truncate max-w-[120px]">{p.location || "Farm Gate"}</span>
                      </span>
                    </div>

                    <h2 className="text-lg font-black text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-1">
                      {p.name}
                    </h2>

                    <p className="mt-1 text-xs text-gray-500 line-clamp-2 leading-relaxed flex-1">
                      {p.description}
                    </p>

                    {/* Price and 1-Click Action */}
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-black text-gray-900">
                            ₹{p.price.toFixed(2)}
                          </span>
                          <span className="text-xs font-semibold text-gray-500"> / {p.unit}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 font-medium">
                          {t("products.retail", "Retail:")} <span className="line-through">₹{estimatedRetail}</span>{" "}
                          <span className="text-emerald-600 font-bold">{t("products.savePercent", { percent: 23, defaultValue: "(Save 23%)" })}</span>
                        </p>
                      </div>

                      {!isOutOfStock ? (
                        <button
                          type="button"
                          onClick={(e) => handleQuickAdd(p, e)}
                          className={`rounded-2xl px-4 py-2.5 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 btn-spring ${
                            isAdded
                              ? "bg-emerald-700 text-white scale-95"
                              : "bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-md"
                          }`}
                        >
                          <span>{isAdded ? t("products.added", "✓ Added") : t("products.addBasket", "+ Basket")}</span>
                        </button>
                      ) : (
                        <span className="rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-400">
                          {t("listing.soldOut", "Sold Out")}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

