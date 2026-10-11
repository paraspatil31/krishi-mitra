import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { listingService } from "@/services/listing.service";
import { orderService } from "@/services/order.service";
import type { Listing } from "@/types/product";
import type { Order, OrderStatus } from "@/types/order";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Spinner from "@/components/common/Spinner";
import { FARMER_NAV } from "./navItems";
import { downloadReceiptHtml, printReceipt } from "@/utils/receipt";
import { api } from "@/services/api";

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "confirmed",
  confirmed: "processing",
  processing: "shipped",
};

const NEXT_LABELS: Partial<Record<OrderStatus, string>> = {
  pending: "Confirm Order",
  confirmed: "Pack Harvest",
  processing: "Mark Dispatched 🚚",
};

const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  vegetables: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80",
  fruits: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600&auto=format&fit=crop&q=80",
  grains: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&auto=format&fit=crop&q=80",
  dairy: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80",
  herbs: "https://images.unsplash.com/photo-1509358271058-acd22cc93898?w=600&auto=format&fit=crop&q=80",
  other: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&auto=format&fit=crop&q=80",
};

export default function FarmerDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Live Dashboard Search & Filters
  const [dashboardSearch, setDashboardSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<"all" | "pending" | "confirmed" | "processing">("all");
  const [activeWeatherAlert, setActiveWeatherAlert] = useState<{
    id: string;
    headline: string;
    advisory: string;
    severity: string;
    district: string;
  } | null>(null);

  useEffect(() => {
    const districtQuery = user?.district ? `?district=${encodeURIComponent(user.district)}` : "";
    api.get<{ data: any[] }>(`/weather/alerts${districtQuery}`)
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setActiveWeatherAlert(res.data[0]);
        }
      })
      .catch(() => {});
  }, [user?.district]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      listingService.getMyListings(user.id),
      orderService.getOrdersByFarmer(user.id),
    ])
      .then(([l, o]) => {
        setListings(l || []);
        setOrders(o || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  async function handleQuickStatusUpdate(orderId: string, nextStatus: OrderStatus) {
    setUpdatingOrderId(orderId);
    try {
      const updated = await orderService.updateOrderStatus(orderId, nextStatus);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === updated.id || (o as any)._id === (updated as any)._id ? updated : o
        )
      );
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setUpdatingOrderId(null);
    }
  }

  // Analytics Metrics
  const activeListings = listings.filter((l) => l.status === "active").length;
  const pendingOrders = orders.filter(
    (o) => o.status === "pending" || o.status === "confirmed" || o.status === "processing"
  );
  const completedOrders = orders.filter((o) => o.status === "delivered").length;
  const settledRevenue = orders
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + o.total, 0);
  const escrowLockedRevenue = pendingOrders.reduce((sum, o) => sum + o.total, 0);

  // Search filtered orders
  const filteredPendingOrders = useMemo(() => {
    const q = dashboardSearch.trim().toLowerCase();
    return pendingOrders.filter((order) => {
      const orderId = (order.id || (order as any)._id || "").toLowerCase();
      const buyerName = (order.buyerName || "").toLowerCase();
      const itemsMatch = order.items.some(
        (it) =>
          it.productName.toLowerCase().includes(q) ||
          (it.unit && it.unit.toLowerCase().includes(q))
      );

      const matchesSearch = !q || orderId.includes(q) || buyerName.includes(q) || itemsMatch;
      const matchesFilter = orderStatusFilter === "all" || order.status === orderStatusFilter;

      return matchesSearch && matchesFilter;
    });
  }, [pendingOrders, dashboardSearch, orderStatusFilter]);

  // Search filtered listings
  const filteredListings = useMemo(() => {
    const q = dashboardSearch.trim().toLowerCase();
    if (!q) return listings;
    return listings.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.category.toLowerCase().includes(q) ||
        (l.description && l.description.toLowerCase().includes(q)) ||
        (l.location && l.location.toLowerCase().includes(q))
    );
  }, [listings, dashboardSearch]);

  const stats = [
    {
      label: "Settled Farm Revenue",
      value: loading ? "—" : `₹${settledRevenue.toFixed(2)}`,
      icon: "💰",
      href: "/farmer/orders",
      trend: "Released from Escrow",
      color: "from-emerald-500/20 via-emerald-500/10 to-white text-emerald-800 border-emerald-200/80",
    },
    {
      label: "Pending Orders Dispatch",
      value: loading ? "—" : String(pendingOrders.length),
      icon: "⏳",
      href: "/farmer/orders",
      trend: `₹${escrowLockedRevenue.toFixed(0)} held in escrow`,
      color: "from-amber-500/20 via-amber-500/10 to-white text-amber-800 border-amber-200/80",
    },
    {
      label: "Active Produce in Store",
      value: loading ? "—" : String(activeListings),
      icon: "🌱",
      href: "/farmer/listings",
      trend: `${listings.length} total crop varieties`,
      color: "from-blue-500/20 via-blue-500/10 to-white text-blue-800 border-blue-200/80",
    },
    {
      label: "Delivered & Satisfied",
      value: loading ? "—" : String(completedOrders),
      icon: "🏡",
      href: "/farmer/orders",
      trend: "Verified direct buyers",
      color: "from-purple-500/20 via-purple-500/10 to-white text-purple-800 border-purple-200/80",
    },
  ];

  const quickActions = [
    { label: "B2B Bulk Demands", href: "/farmer/bulk-demands", icon: "🏢", primary: true, desc: "Quote on wholesale RFQs" },
    { label: "Add Harvest Listing", href: "/farmer/listings/new", icon: "➕", primary: false, desc: "List fresh crops for sale" },
    { label: "Orders Dispatch Hub", href: "/farmer/orders", icon: "📦", primary: false, desc: "Print manifests & pack" },
    { label: "IMD Weather Advisory", href: "/farmer/weather", icon: "🌤", primary: false, desc: "Rainfall & moisture alerts" },
  ];

  return (
    <DashboardLayout
      title={t("dashboard.farmerOverview", "Farmer Operations Hub")}
      subtitle={t("dashboard.welcomeBack", { name: user?.name || t("common.kisanProducer", "Kisan Producer") })}
      navItems={FARMER_NAV}
      actions={
        <Link
          to="/farmer/listings/new"
          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-5 py-2.5 text-sm font-extrabold text-white shadow-md shadow-emerald-800/20 hover:from-emerald-500 hover:to-emerald-600 transition-all btn-spring"
        >
          <span>+</span>
          <span>{t("dashboard.createNewListing", "+ Add Harvest Listing")}</span>
        </Link>
      }
    >
      <div className="space-y-8">
        {/* Agricultural Welcome & Weather Advisory Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#061e14] via-[#0d3422] to-[#081a12] p-6 sm:p-8 text-white shadow-xl border border-emerald-800/40">
          <div
            className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-30 pointer-events-none"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=1200&auto=format&fit=crop&q=80')",
            }}
          />
          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2.5 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-400/20 border border-emerald-400/40 px-3 py-1 text-xs font-extrabold text-emerald-300 animate-float shadow-xs">
                  🌾 Verified Krishi Producer
                </span>
                <span className="rounded-full bg-amber-400/20 border border-amber-400/40 px-3 py-1 text-xs font-extrabold text-amber-300">
                  ⚡ 0% Middleman Commission
                </span>
              </div>
              <h1
                className="text-2xl sm:text-4xl font-black tracking-tight text-white"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Namaste, {user?.name.split(" ")[0] || "Kisan"}! 🌿
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
                Your farm connects directly to conscious buyers across the state. Monitor incoming
                harvest orders, print packing manifests, and keep produce stock up to date.
              </p>
            </div>

            {/* Weather Advisory Card snippet */}
            <div className="rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 p-5 sm:max-w-xs shadow-lg shrink-0">
              <div className="flex items-center justify-between text-xs text-emerald-200 font-bold mb-1.5">
                <span className="flex items-center gap-1.5">
                  <span className="text-base">🌦</span>
                  <span>IMD Weather Station</span>
                </span>
                <Link to="/farmer/weather" className="text-amber-300 hover:text-amber-200 font-extrabold hover:underline">
                  Forecast &rarr;
                </Link>
              </div>
              <p className="text-lg font-black text-white">
                {user?.district ? `📍 ${user.district} Station` : "Local Agro Weather"}
              </p>
              <p className="text-[11px] text-emerald-100/80 mt-1 leading-relaxed">
                Favorable harvest conditions. Check 7-day spray feasibility, rainfall window, and moisture forecast.
              </p>
            </div>
          </div>
        </div>

        {/* B2B Commercial Demand Opportunity Alert */}
        <div className="rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-teal-50/60 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-2xl shrink-0 shadow-xs">
              🏢
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                  Wholesale Procurement
                </span>
                <span className="text-xs text-gray-500 font-medium">Verified Commercial Buyers</span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900 mt-0.5">
                Businesses & Restaurants are actively seeking bulk agricultural harvests
              </h3>
              <p className="text-xs text-gray-600 mt-0.5">
                Supply directly in bulk quintals/tonnes at your rates without middleman commissions.
              </p>
            </div>
          </div>
          <Link
            to="/farmer/bulk-demands"
            className="shrink-0 text-xs font-black px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition-all btn-spring flex items-center gap-1.5"
          >
            <span>Browse RFQs & Quote</span>
            <span>&rarr;</span>
          </Link>
        </div>

        {/* AI Crop Doctor & Quality Inspection Banner */}
        <div className="rounded-3xl border border-teal-200 bg-gradient-to-r from-teal-50/80 via-white to-emerald-50/50 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center text-2xl shrink-0 shadow-xs">
              🔬
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-700 text-white">
                  AI Plant Pathology & QC
                </span>
                <span className="text-xs text-teal-700 font-semibold">Instant Foliage & Harvest Scan</span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900 mt-0.5">
                Crop Doctor: Diagnose Leaf Diseases & Inspect Quality Grades
              </h3>
              <p className="text-xs text-gray-600 mt-0.5">
                Snap or upload plant photos to detect pathogens, review safe organic/chemical remedies, or pre-grade produce before listing.
              </p>
            </div>
          </div>
          <Link
            to="/crop-doctor"
            className="shrink-0 text-xs font-black px-4 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white shadow-xs transition-all btn-spring flex items-center gap-1.5"
          >
            <span>🌿 Open Crop Doctor</span>
            <span>&rarr;</span>
          </Link>
        </div>

        {/* Active Agronomic Weather Alert Banner */}
        {activeWeatherAlert && (
          <div
            className={`rounded-3xl border p-4 sm:p-5 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
              activeWeatherAlert.severity === "critical"
                ? "bg-red-50 border-red-300 text-red-900"
                : activeWeatherAlert.severity === "warning"
                ? "bg-amber-50 border-amber-300 text-amber-900"
                : "bg-blue-50 border-blue-300 text-blue-900"
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`p-2.5 rounded-2xl shrink-0 ${
                  activeWeatherAlert.severity === "critical"
                    ? "bg-red-200 text-red-800"
                    : activeWeatherAlert.severity === "warning"
                    ? "bg-amber-200 text-amber-800"
                    : "bg-blue-200 text-blue-800"
                }`}
              >
                <span className="text-xl">⚠️</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      activeWeatherAlert.severity === "critical"
                        ? "bg-red-600 text-white"
                        : "bg-amber-600 text-white"
                    }`}
                  >
                    {activeWeatherAlert.severity} alert • {activeWeatherAlert.district}
                  </span>
                </div>
                <h4 className="font-bold text-sm sm:text-base mt-1 text-gray-900">
                  {activeWeatherAlert.headline}
                </h4>
                <p className="text-xs text-gray-700 mt-0.5 line-clamp-2 max-w-2xl leading-relaxed">
                  {activeWeatherAlert.advisory}
                </p>
              </div>
            </div>
            <Link
              to="/farmer/weather"
              className={`shrink-0 text-xs font-bold px-4 py-2.5 rounded-xl border transition-all shadow-xs ${
                activeWeatherAlert.severity === "critical"
                  ? "bg-red-600 hover:bg-red-700 text-white border-red-700"
                  : "bg-amber-600 hover:bg-amber-700 text-white border-amber-700"
              }`}
            >
              View Full Advisory &rarr;
            </Link>
          </div>
        )}

        {/* Global Dashboard Live Search Bar */}
        <div className="relative rounded-3xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50/50 via-white to-emerald-50/30 p-4 shadow-xs">
          <div className="relative flex items-center">
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
              placeholder="Search active orders, buyer names, crop varieties, or inventory..."
              value={dashboardSearch}
              onChange={(e) => setDashboardSearch(e.target.value)}
              className="w-full pl-11 pr-10 py-3 text-sm rounded-2xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-inner"
            />
            {dashboardSearch && (
              <button
                type="button"
                onClick={() => setDashboardSearch("")}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                title="Clear search"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 text-xs font-bold text-gray-700">
                  ✕
                </span>
              </button>
            )}
          </div>

          {dashboardSearch && (
            <div className="mt-2.5 flex items-center justify-between text-xs text-gray-600 px-1">
              <span>
                Found <strong className="text-emerald-700">{filteredPendingOrders.length}</strong> matching orders and{" "}
                <strong className="text-emerald-700">{filteredListings.length}</strong> matching produce crops
              </span>
              <button
                type="button"
                onClick={() => setDashboardSearch("")}
                className="font-bold text-emerald-700 hover:underline"
              >
                Reset Search ✕
              </button>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <Link
              key={s.label}
              to={s.href}
              className={`group rounded-3xl border bg-gradient-to-br ${s.color} p-5 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 card-hover-lift flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-xs text-2xl group-hover:scale-110 transition-transform">
                  {s.icon}
                </span>
                <span className="text-[11px] font-bold text-gray-400 group-hover:text-emerald-700 transition-colors">
                  View &rarr;
                </span>
              </div>

              <div className="mt-5">
                <p className="text-2xl sm:text-3xl font-black text-gray-900 group-hover:text-emerald-800 transition-colors">
                  {s.value}
                </p>
                <p className="mt-1 text-xs font-bold text-gray-700">{s.label}</p>
                <p className="mt-0.5 text-[11px] font-semibold text-gray-400">{s.trend}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Action Shortcuts */}
        <div>
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
            <span>⚡</span> Quick Farm Workflows
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                to={action.href}
                className={`group flex items-center gap-3.5 rounded-3xl p-4.5 transition-all shadow-xs border card-hover-lift ${
                  action.primary
                    ? "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:from-emerald-500 hover:to-emerald-600 shadow-md shadow-emerald-800/20"
                    : "bg-white text-gray-800 hover:bg-emerald-50/40 border-gray-200/70 hover:border-emerald-300"
                }`}
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">{action.icon}</span>
                <div>
                  <p className="text-sm font-black">{action.label}</p>
                  <p className={`text-[11px] ${action.primary ? "text-emerald-100" : "text-gray-400"}`}>
                    {action.desc}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Urgent Pending Orders Section */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <span>📦</span> Orders Awaiting Farm Dispatch ({pendingOrders.length})
              </h2>
              <p className="text-xs text-gray-500">
                Confirm, pack, and prepare produce for buyer pickup or courier dispatch
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-2xl bg-gray-100 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setOrderStatusFilter("all")}
                  className={`rounded-xl px-2.5 py-1 font-bold transition-all ${
                    orderStatusFilter === "all" ? "bg-white text-emerald-800 shadow-xs" : "text-gray-600"
                  }`}
                >
                  All ({pendingOrders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setOrderStatusFilter("pending")}
                  className={`rounded-xl px-2.5 py-1 font-bold transition-all ${
                    orderStatusFilter === "pending" ? "bg-white text-amber-800 shadow-xs" : "text-gray-600"
                  }`}
                >
                  To Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setOrderStatusFilter("confirmed")}
                  className={`rounded-xl px-2.5 py-1 font-bold transition-all ${
                    orderStatusFilter === "confirmed" ? "bg-white text-blue-800 shadow-xs" : "text-gray-600"
                  }`}
                >
                  To Pack
                </button>
              </div>

              <Link
                to="/farmer/orders"
                className="text-xs font-extrabold text-emerald-700 hover:text-emerald-800 hover:underline shrink-0"
              >
                All Orders &rarr;
              </Link>
            </div>
          </div>

          {loading && (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          )}

          {!loading && filteredPendingOrders.length === 0 && (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-8 text-center shadow-xs">
              <span className="text-4xl">🌾</span>
              <p className="mt-2 text-sm font-extrabold text-gray-800">
                {dashboardSearch ? "No pending orders match your search" : "All orders are up to date!"}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {dashboardSearch
                  ? "Try searching for a different buyer name or crop item."
                  : "You have no urgent dispatches waiting right now."}
              </p>
            </div>
          )}

          {!loading && filteredPendingOrders.length > 0 && (
            <div className="space-y-3.5">
              {filteredPendingOrders.map((order) => {
                const orderId = order.id || (order as any)._id;
                const next = NEXT_STATUS[order.status];
                const nextLabel = NEXT_LABELS[order.status];
                const isUpdating = updatingOrderId === orderId;

                return (
                  <div
                    key={orderId}
                    className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-3xl border border-amber-200/90 bg-gradient-to-r from-amber-50/50 via-white to-amber-50/30 p-5 shadow-xs hover:shadow-md transition-all card-hover-lift"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black text-gray-900">
                          Order #{orderId.slice(-8).toUpperCase()}
                        </span>
                        <span className="rounded-full bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 text-[10px] font-black uppercase">
                          {order.status}
                        </span>
                        <span className="text-xs text-gray-600 font-bold">
                          Buyer: <strong className="text-gray-900">{order.buyerName}</strong>
                        </span>
                        <span className="text-xs text-gray-400">
                          • {new Date(order.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {order.items.map((item, idx) => (
                          <span
                            key={idx}
                            className="rounded-xl bg-white border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-800 shadow-xs"
                          >
                            {item.productName} × <strong className="text-emerald-700">{item.quantity} {item.unit}</strong>
                          </span>
                        ))}
                      </div>

                      {order.deliveryAddress && (
                        <p className="text-[11px] text-gray-500 truncate pt-0.5">
                          📍 Ship to: {order.deliveryAddress}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between lg:justify-end gap-3 border-t lg:border-t-0 pt-3 lg:pt-0 border-amber-200/70">
                      <div className="text-right">
                        <p className="text-lg font-black text-emerald-700">
                          ₹{order.total.toFixed(2)}
                        </p>
                        <p className="text-[10px] text-emerald-800/80 font-bold">Escrow Held 🔒</p>
                      </div>

                      {/* Manifest / Slip Action */}
                      <button
                        type="button"
                        onClick={() => downloadReceiptHtml(order)}
                        className="rounded-2xl bg-white border border-amber-300 px-3.5 py-2 text-xs font-black text-amber-900 hover:bg-amber-100 shadow-xs transition-all btn-spring flex items-center gap-1.5"
                        title="Download Packing Slip"
                      >
                        <span>🧾</span>
                        <span>Slip</span>
                      </button>

                      {/* Print Manifest Action */}
                      <button
                        type="button"
                        onClick={() => printReceipt(order)}
                        className="rounded-2xl bg-white border border-gray-300 px-3 py-2 text-xs font-black text-gray-700 hover:bg-gray-100 shadow-xs transition-all btn-spring"
                        title="Print Packing Manifest"
                      >
                        🖨️
                      </button>

                      {/* Next Status Advance */}
                      {next && nextLabel && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleQuickStatusUpdate(orderId, next)}
                          className="rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 px-4 py-2 text-xs font-black text-white shadow-md shadow-amber-700/20 hover:from-amber-500 hover:to-amber-600 transition-all btn-spring disabled:opacity-50 shrink-0"
                        >
                          {isUpdating ? "Updating…" : nextLabel}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Harvest Produce Listings Preview */}
        {!loading && listings.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                  <span>🌱</span> My Produce Listings ({listings.length})
                </h2>
                <p className="text-xs text-gray-500">Live harvests active on the marketplace</p>
              </div>
              <Link to="/farmer/listings" className="text-xs font-extrabold text-emerald-700 hover:underline">
                View All Crops &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5">
              {filteredListings.slice(0, 6).map((l) => {
                const listingId = l.id || (l as any)._id;
                const isLowStock = l.quantity > 0 && l.quantity <= 15;
                const isOutOfStock = l.quantity === 0;
                const fallbackImg = CATEGORY_FALLBACK_IMAGES[l.category?.toLowerCase()] || CATEGORY_FALLBACK_IMAGES.vegetables;
                const imageSrc = l.images && l.images[0] ? l.images[0] : fallbackImg;

                return (
                  <Link
                    key={listingId}
                    to={`/farmer/listings/${listingId}/edit`}
                    className="group flex flex-col rounded-3xl border border-gray-200/80 bg-white p-4 shadow-xs hover:border-emerald-400 hover:shadow-xl transition-all card-hover-lift"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="h-16 w-16 rounded-2xl overflow-hidden bg-gray-100 shrink-0 relative">
                        <img
                          src={imageSrc}
                          alt={l.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            {l.category}
                          </span>
                          <span
                            className={`text-[10px] rounded-full px-2 py-0.5 font-black capitalize ${
                              l.status === "active"
                                ? "bg-emerald-100 text-emerald-800"
                                : l.status === "draft"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {l.status}
                          </span>
                        </div>
                        <p className="text-sm font-black text-gray-900 group-hover:text-emerald-700 transition-colors truncate mt-1">
                          {l.name}
                        </p>
                        <p className="text-xs font-black text-gray-800 mt-0.5">
                          ₹{l.price.toFixed(2)}{" "}
                          <span className="text-gray-400 font-normal">/ {l.unit}</span>
                        </p>
                      </div>
                    </div>

                    {/* Stock status indicator bar */}
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                      <span
                        className={`font-bold ${
                          isOutOfStock ? "text-red-600" : isLowStock ? "text-amber-600" : "text-gray-600"
                        }`}
                      >
                        Stock: {l.quantity} {l.unit} {isOutOfStock ? "(Empty)" : isLowStock ? "⚠️" : ""}
                      </span>
                      <span className="text-xs font-black text-emerald-700 group-hover:translate-x-1 transition-transform">
                        Edit Harvest &rarr;
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
