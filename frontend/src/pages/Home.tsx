import { useState, useEffect } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { productService } from "@/services/product.service";

type ShowcaseItem = {
  id?: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  image: string;
  farmerName: string;
  location: string;
  rating: string;
};

const DEFAULT_SHOWCASE: ShowcaseItem[] = [
  {
    name: "Farm Fresh Desi Tomatoes",
    category: "Vegetables",
    price: 40,
    unit: "kg",
    image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop&q=80",
    farmerName: "Ramesh Patil",
    location: "Nashik, MH",
    rating: "4.9 ★ (120+ orders)",
  },
  {
    name: "Ratnagiri Alphonso Mangoes",
    category: "Fruits",
    price: 650,
    unit: "dozen",
    image: "https://images.unsplash.com/photo-1553279768-865429fa0078?w=800&auto=format&fit=crop&q=80",
    farmerName: "Suresh Desai",
    location: "Ratnagiri, MH",
    rating: "5.0 ★ (85+ orders)",
  },
  {
    name: "Organic Sharbati Wheat",
    category: "Grains",
    price: 55,
    unit: "kg",
    image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&auto=format&fit=crop&q=80",
    farmerName: "Harpreet Singh",
    location: "Ludhiana, PB",
    rating: "4.8 ★ (240+ orders)",
  },
  {
    name: "Pure A2 Gir Cow Ghee",
    category: "Dairy",
    price: 1200,
    unit: "litre",
    image: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=800&auto=format&fit=crop&q=80",
    farmerName: "Govind Gaushala",
    location: "Karnal, HR",
    rating: "4.9 ★ (190+ orders)",
  },
  {
    name: "Salem Lakadong Turmeric",
    category: "Herbs",
    price: 180,
    unit: "kg",
    image: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=800&auto=format&fit=crop&q=80",
    farmerName: "Meenakshi Sundaram",
    location: "Salem, TN",
    rating: "5.0 ★ (110+ orders)",
  },
  {
    name: "Crisp Green Bell Peppers",
    category: "Vegetables",
    price: 60,
    unit: "kg",
    image: "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=800&auto=format&fit=crop&q=80",
    farmerName: "Anand Shinde",
    location: "Pune, MH",
    rating: "4.9 ★ (75+ orders)",
  },
];

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const { t } = useTranslation();
  const [showcaseIndex, setShowcaseIndex] = useState(0);
  const [showcaseProducts, setShowcaseProducts] = useState<ShowcaseItem[]>(DEFAULT_SHOWCASE);
  const [isPaused, setIsPaused] = useState(false);

  const stats = [
    { label: t("home.verifiedFarmers"), value: t("home.verifiedFarmersCount"), sub: t("home.verifiedFarmersSub") },
    { label: t("home.mandiMarkupSaved"), value: t("home.mandiMarkupSavedCount"), sub: t("home.mandiMarkupSavedSub") },
    { label: t("home.freshOrdersDelivered"), value: t("home.freshOrdersDeliveredCount"), sub: t("home.freshOrdersDeliveredSub") },
    { label: t("home.escrowProtection"), value: t("home.escrowProtectionCount"), sub: t("home.escrowProtectionSub") },
  ];

  const categories = [
    { name: t("home.freshVegetables"), count: t("home.varieties120"), href: "/products?category=vegetables", image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80", tag: t("home.harvestedDaily") },
    { name: t("home.orchardFruits"), count: t("home.varieties45"), href: "/products?category=fruits", image: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600&auto=format&fit=crop&q=80", tag: t("home.treeRipened") },
    { name: t("home.grainsPulses"), count: t("home.varieties80"), href: "/products?category=grains", image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&auto=format&fit=crop&q=80", tag: t("home.directMill") },
    { name: t("home.pureDairyGhee"), count: t("home.varieties25"), href: "/products?category=dairy", image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80", tag: t("home.a2DesiFarm") },
    { name: t("home.herbsSpices"), count: t("home.varieties60"), href: "/products?category=herbs", image: "https://images.unsplash.com/photo-1509358271058-acd22cc93898?w=600&auto=format&fit=crop&q=80", tag: t("home.sunDried") },
    { name: t("home.honeyColdOils"), count: t("home.varieties30"), href: "/products?category=other", image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&auto=format&fit=crop&q=80", tag: t("home.unprocessed") },
  ];

  const comparisons = [
    { factor: t("home.middlemanMarkups"), mandi: t("home.mandiMiddleman"), krishi: t("home.krishiMiddleman") },
    { factor: t("home.harvestToKitchen"), mandi: t("home.mandiHarvest"), krishi: t("home.krishiHarvest") },
    { factor: t("home.paymentSecurity"), mandi: t("home.mandiPayment"), krishi: t("home.krishiPayment") },
    { factor: t("home.originTransparency"), mandi: t("home.mandiOrigin"), krishi: t("home.krishiOrigin") },
  ];

  // Fetch live products to include real inventory in the hero showcase
  useEffect(() => {
    productService
      .getProducts()
      .then((prods) => {
        if (prods && prods.length > 0) {
          const liveItems: ShowcaseItem[] = prods.slice(0, 8).map((p) => ({
            id: p.id || (p as any)._id,
            name: p.name,
            category: p.category,
            price: p.price,
            unit: p.unit,
            image:
              p.images && p.images[0]
                ? p.images[0]
                : DEFAULT_SHOWCASE[0].image,
            farmerName: p.farmerName || t("home.verifiedLocalGrower"),
            location: p.location || t("home.localDistrict"),
            rating: "4.9 ★ (Verified)",
          }));
          setShowcaseProducts(liveItems);
        }
      })
      .catch(() => {
        // keep DEFAULT_SHOWCASE
      });
  }, []);

  // Continuous auto-sliding every 3.2 seconds
  useEffect(() => {
    if (isPaused || showcaseProducts.length <= 1) return;
    const interval = setInterval(() => {
      setShowcaseIndex((prev) => (prev + 1) % showcaseProducts.length);
    }, 3200);
    return () => clearInterval(interval);
  }, [isPaused, showcaseProducts.length]);

  const currentItem = showcaseProducts[showcaseIndex] || DEFAULT_SHOWCASE[0];

  function handlePrev() {
    setShowcaseIndex((prev) => (prev - 1 + showcaseProducts.length) % showcaseProducts.length);
  }

  function handleNext() {
    setShowcaseIndex((prev) => (prev + 1) % showcaseProducts.length);
  }

  return (
    <div className="space-y-16 sm:space-y-24">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#0d261a] text-white">
        {/* Background Image with Gradient Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-30"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1600&auto=format&fit=crop&q=80')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0d261a]/60 to-[#0d261a]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Copy */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-emerald-300 animate-float shadow-sm">
                <span>🌾</span>
                <span>{t("home.heroBadge")}</span>
              </div>

              <h1
                className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.15]"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {t("home.heroTitle1")}{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-emerald-400 to-amber-300">
                  {t("home.heroTitle2")}
                </span>
              </h1>

              <p className="text-base sm:text-lg text-emerald-100/80 max-w-xl leading-relaxed">
                {t("home.heroDescription")}
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3.5">
                <Link
                  to="/products"
                  className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-7 py-3.5 text-sm sm:text-base font-bold text-white shadow-lg shadow-emerald-900/30 hover:from-emerald-400 hover:to-emerald-500 hover:shadow-xl transition-all btn-spring animate-pulse-glow"
                >
                  {t("home.browseHarvests")}
                </Link>

                {!isAuthenticated ? (
                  <Link
                    to="/signup"
                    className="inline-flex items-center justify-center rounded-xl border border-emerald-400/30 bg-white/5 backdrop-blur-sm px-6 py-3.5 text-sm sm:text-base font-semibold text-white hover:bg-white/10 transition-all btn-spring"
                  >
                    {t("home.sellAsFarmer")}
                  </Link>
                ) : user?.role === "farmer" ? (
                  <Link
                    to="/farmer/dashboard"
                    className="inline-flex items-center justify-center rounded-xl border border-emerald-400/30 bg-white/5 backdrop-blur-sm px-6 py-3.5 text-sm sm:text-base font-semibold text-white hover:bg-white/10 transition-all btn-spring"
                  >
                    {t("home.goToFarmerDashboard")}
                  </Link>
                ) : (
                  <Link
                    to="/buyer/orders"
                    className="inline-flex items-center justify-center rounded-xl border border-emerald-400/30 bg-white/5 backdrop-blur-sm px-6 py-3.5 text-sm sm:text-base font-semibold text-white hover:bg-white/10 transition-all btn-spring"
                  >
                    {t("home.viewMyOrders")}
                  </Link>
                )}
              </div>

              {/* Mini Trust Checklist */}
              <div className="pt-4 flex flex-wrap gap-y-2 gap-x-6 text-xs text-emerald-200/70 font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="text-emerald-400">✓</span> {t("home.escrowRelease")}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-emerald-400">✓</span> {t("home.zeroBrokerage")}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-emerald-400">✓</span> {t("home.harvestedWithin24h")}
                </span>
              </div>
            </div>

            {/* Right Visual Feature Card with Continuous Sliding Products */}
            <div className="lg:col-span-5">
              <div
                className="relative mx-auto max-w-md rounded-3xl border border-emerald-500/20 bg-emerald-950/40 p-4 sm:p-6 backdrop-blur-md shadow-2xl transition-all animate-float-slow"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
              >
                {/* Hero Showcase Image with continuous slide */}
                <div className="relative h-64 sm:h-72 overflow-hidden rounded-2xl bg-emerald-900 shadow-inner group">
                  <img
                    key={currentItem.name}
                    src={currentItem.image}
                    alt={currentItem.name}
                    className="h-full w-full object-cover transition-all duration-700 ease-out transform scale-100 hover:scale-105 animate-in fade-in"
                  />

                  {/* Gradient shade over image for high readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent pointer-events-none" />

                  {/* Top Left Live Status Pill */}
                  <div className="absolute top-3 left-3 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-xs font-semibold text-white flex items-center gap-1.5 shadow-sm">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{t("home.liveHarvest")} &bull; {currentItem.location}</span>
                  </div>

                  {/* Top Right Category Badge */}
                  <div className="absolute top-3 right-3 rounded-full bg-emerald-800/80 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-bold text-emerald-200 shadow-sm uppercase tracking-wider">
                    {currentItem.category}
                  </div>

                  {/* Bottom Right Price Pill */}
                  <div className="absolute bottom-3 right-3 rounded-xl bg-white/95 backdrop-blur-md px-3.5 py-1.5 text-xs font-bold text-emerald-900 shadow-lg">
                    ₹{currentItem.price} / {currentItem.unit}
                  </div>

                  {/* Navigation Arrows (visible on hover or mobile) */}
                  <button
                    onClick={handlePrev}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/70 backdrop-blur-sm transition-all text-sm font-bold opacity-70 group-hover:opacity-100"
                    aria-label="Previous produce item"
                  >
                    &#8249;
                  </button>

                  <button
                    onClick={handleNext}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/70 backdrop-blur-sm transition-all text-sm font-bold opacity-70 group-hover:opacity-100"
                    aria-label="Next produce item"
                  >
                    &#8250;
                  </button>

                  {/* Slide Indicators / Dots */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
                    {showcaseProducts.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setShowcaseIndex(idx)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          idx === showcaseIndex
                            ? "w-6 bg-emerald-400 shadow-sm"
                            : "w-2 bg-white/40 hover:bg-white/70"
                        }`}
                        aria-label={`Go to slide ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Card Info Snippet */}
                <div className="mt-4 flex items-center justify-between text-xs text-emerald-200/90 border-t border-emerald-800/60 pt-3">
                  <div className="min-w-0 flex-1 pr-3">
                    <p className="font-bold text-white text-sm sm:text-base truncate">
                      {currentItem.name}
                    </p>
                    <p className="text-gray-400 text-xs mt-0.5 truncate">
                      By {currentItem.farmerName} &bull; {currentItem.rating}
                    </p>
                  </div>
                  <Link
                    to={currentItem.id ? `/products/${currentItem.id}` : "/products"}
                    className="shrink-0 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:from-emerald-400 hover:to-emerald-500 transition-all"
                  >
                    {t("home.orderNow")}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Impact Stats */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-[var(--border)] bg-white p-6 sm:p-10 shadow-xs">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
            {stats.map((s, i) => (
              <div key={s.label} className={`text-center ${i !== 0 ? "pt-4 sm:pt-0 sm:pl-4" : ""}`}>
                <p
                  className="text-3xl sm:text-4xl font-black text-[var(--primary)]"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {s.value}
                </p>
                <p className="mt-1 text-sm font-bold text-gray-900">{s.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Category Grid with Real Photography */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              {t("home.farmFreshCatalog")}
            </span>
            <h2
              className="mt-1 text-2xl sm:text-3xl font-extrabold text-gray-900"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {t("home.exploreByCat")}
            </h2>
          </div>
          <Link
            to="/products"
            className="text-sm font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
          >
            {t("home.viewAllCategories")}
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-5">
          {categories.map((cat) => (
            <Link
              key={cat.name}
              to={cat.href}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xs hover:border-emerald-300 card-hover-lift"
            >
              <div className="relative h-36 w-full overflow-hidden bg-gray-100">
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                <span className="absolute top-2 left-2 rounded-md bg-white/90 backdrop-blur-sm px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  {cat.tag}
                </span>
              </div>
              <div className="p-3">
                <h3 className="text-sm font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                  {cat.name}
                </h3>
                <p className="text-[11px] text-gray-500">{cat.count}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Why KrishiBazaar Comparison Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 to-[#0d261a] p-6 sm:p-12 text-white shadow-xl">
          <div className="max-w-2xl text-center sm:text-left">
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-300">
              {t("home.krishiDifference")}
            </span>
            <h2
              className="mt-3 text-2xl sm:text-4xl font-extrabold"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {t("home.whyDirectMatters")}
            </h2>
            <p className="mt-2 text-sm sm:text-base text-emerald-100/80">
              {t("home.whyDirectDesc")}
            </p>
          </div>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-emerald-800 text-xs font-bold uppercase tracking-wider text-emerald-300">
                  <th className="py-3.5 pr-4">{t("home.dimension")}</th>
                  <th className="py-3.5 px-4 text-gray-400">{t("home.traditionalMandi")}</th>
                  <th className="py-3.5 pl-4 text-emerald-300 bg-emerald-900/30 rounded-t-xl">
                    {t("home.krishiDirect")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/50">
                {comparisons.map((c, i) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 pr-4 font-bold text-white text-xs sm:text-sm">
                      {c.factor}
                    </td>
                    <td className="py-4 px-4 text-gray-300 text-xs sm:text-sm">{c.mandi}</td>
                    <td className="py-4 pl-4 text-emerald-200 font-semibold bg-emerald-900/30 text-xs sm:text-sm">
                      ✓ {c.krishi}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            {t("home.simple3Step")}
          </span>
          <h2
            className="mt-1 text-2xl sm:text-3xl font-extrabold text-gray-900"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {t("home.howItWorks")}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {t("home.howItWorksDesc")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="relative rounded-3xl border border-gray-100 bg-white p-7 shadow-xs">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-xl font-black text-emerald-800 mb-5">
              1
            </span>
            <h3 className="text-lg font-bold text-gray-900">{t("home.step1Title")}</h3>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              {t("home.step1Desc")}
            </p>
          </div>

          <div className="relative rounded-3xl border border-gray-100 bg-white p-7 shadow-xs">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-xl font-black text-amber-800 mb-5">
              2
            </span>
            <h3 className="text-lg font-bold text-gray-900">{t("home.step2Title")}</h3>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              {t("home.step2Desc")}
            </p>
          </div>

          <div className="relative rounded-3xl border border-gray-100 bg-white p-7 shadow-xs">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-xl font-black text-emerald-800 mb-5">
              3
            </span>
            <h3 className="text-lg font-bold text-gray-900">{t("home.step3Title")}</h3>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              {t("home.step3Desc")}
            </p>
          </div>
        </div>
      </section>

      {/* Farmer Spotlight Story */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-gray-100 bg-emerald-50/60 p-6 sm:p-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-4">
              <div className="overflow-hidden rounded-2xl shadow-md h-64 sm:h-72">
                <img
                  src="https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=600&auto=format&fit=crop&q=80"
                  alt="Farmer smiling in organic field"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
            <div className="md:col-span-8 space-y-4">
              <span className="rounded-full bg-emerald-200/70 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-900">
                {t("home.farmerSpotlight")}
              </span>
              <h3
                className="text-2xl sm:text-3xl font-extrabold text-gray-900"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {t("home.spotlightQuote")}
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {t("home.spotlightStory")}
              </p>
              <div>
                <p className="font-bold text-gray-900 text-base">{t("home.spotlightName")}</p>
                <p className="text-xs text-gray-500">{t("home.spotlightLocation")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      {!isAuthenticated && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12">
          <div className="rounded-3xl bg-gradient-to-r from-emerald-600 via-[var(--primary)] to-emerald-800 p-8 sm:p-14 text-center text-white shadow-xl">
            <h2
              className="text-3xl sm:text-4xl font-extrabold"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {t("home.joinRevolution")}
            </h2>
            <p className="mt-3 text-emerald-100 max-w-md mx-auto text-sm sm:text-base">
              {t("home.joinRevolutionDesc")}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                to="/signup"
                className="rounded-xl bg-white px-8 py-3.5 text-sm sm:text-base font-bold text-emerald-900 shadow-md hover:bg-emerald-50 transition-all"
              >
                {t("home.createFreeAccount")}
              </Link>
              <Link
                to="/products"
                className="rounded-xl border border-white/40 bg-white/10 px-8 py-3.5 text-sm sm:text-base font-bold text-white hover:bg-white/20 transition-all"
              >
                {t("home.shopMarketplace")}
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
