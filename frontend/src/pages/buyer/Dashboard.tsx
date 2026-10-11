import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { orderService } from "@/services/order.service";
import type { Order, OrderStatus } from "@/types/order";
import Spinner from "@/components/common/Spinner";
import { downloadReceiptHtml } from "@/utils/receipt";
import VerifiedBadge from "@/components/common/VerifiedBadge";

const STATUS_CONFIG: Record<OrderStatus, { label: string; bg: string; text: string; icon: string }> = {
  pending: { label: "Payment Pending", bg: "bg-amber-50 border-amber-200", text: "text-amber-800", icon: "⏳" },
  confirmed: { label: "Confirmed by Farmer", bg: "bg-blue-50 border-blue-200", text: "text-blue-800", icon: "✓" },
  processing: { label: "Packing Harvest", bg: "bg-purple-50 border-purple-200", text: "text-purple-800", icon: "🧺" },
  shipped: { label: "Out for Delivery", bg: "bg-sky-50 border-sky-200", text: "text-sky-800", icon: "🚚" },
  delivered: { label: "Delivered & Verified", bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-800", icon: "🏡" },
  cancelled: { label: "Cancelled", bg: "bg-red-50 border-red-200", text: "text-red-800", icon: "✕" },
};

const IN_SEASON_PICKS = [
  {
    name: "Ratnagiri Alphonso Mango",
    category: "Fruits",
    price: "₹650",
    unit: "dozen",
    image: "https://images.unsplash.com/photo-1553279768-865429fa0078?w=500&auto=format&fit=crop&q=80",
    origin: "Ratnagiri, MH",
    tag: "Peak Season 🥭",
  },
  {
    name: "Organic Desi Tomatoes",
    category: "Vegetables",
    price: "₹38",
    unit: "kg",
    image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop&q=80",
    origin: "Nashik, MH",
    tag: "Farm Fresh 🍅",
  },
  {
    name: "Pure A2 Gir Cow Ghee",
    category: "Dairy",
    price: "₹850",
    unit: "500ml",
    image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&auto=format&fit=crop&q=80",
    origin: "Anand, GJ",
    tag: "Traditional Bilona 🧈",
  },
  {
    name: "Hydroponic Baby Spinach",
    category: "Vegetables",
    price: "₹45",
    unit: "bunch",
    image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=500&auto=format&fit=crop&q=80",
    origin: "Pune, MH",
    tag: "Pesticide Free 🥬",
  },
];

export default function BuyerDashboard() {
  const { t } = useTranslation();
  const { user, updateBuyerType } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  async function handleSwitchToBusiness() {
    if (
      !window.confirm(
        "Switch to Business / Bulk Buyer account? This unlocks APMC wholesale price intelligence, market finders, cold storage directories, and bulk RFQ procurement."
      )
    ) {
      return;
    }
    setSwitching(true);
    try {
      await updateBuyerType("business");
      window.location.href = "/business/dashboard";
    } catch (err) {
      console.error(err);
      setSwitching(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    orderService
      .getOrdersByBuyer()
      .then((data) => setOrders(data || []))
      .catch((err) => {
        console.error("Failed to load buyer orders:", err);
        setOrders([]);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const activeOrders = orders.filter((o) =>
    ["pending", "confirmed", "processing", "shipped"].includes(o.status)
  ).length;

  const completedOrders = orders.filter((o) => o.status === "delivered").length;

  const totalSpent = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + o.total, 0);

  const stats = [
    {
      label: t("orders.title", "Total Orders"),
      value: loading ? "—" : String(orders.length),
      icon: "📦",
      href: "/buyer/orders",
      trend: "Direct farm orders",
      color: "from-emerald-500/10 to-emerald-500/5 text-emerald-700 border-emerald-200/60",
    },
    {
      label: t("status.shipped", "Active In-Transit"),
      value: loading ? "—" : String(activeOrders),
      icon: "🚚",
      href: "/buyer/orders",
      trend: "Dispatch updates live",
      color: "from-amber-500/10 to-amber-500/5 text-amber-700 border-amber-200/60",
    },
    {
      label: t("status.delivered", "Delivered & Verified"),
      value: loading ? "—" : String(completedOrders),
      icon: "✅",
      href: "/buyer/orders",
      trend: "Escrow finalized",
      color: "from-blue-500/10 to-blue-500/5 text-blue-700 border-blue-200/60",
    },
    {
      label: t("dashboard.totalSales", "Total Spent"),
      value: loading ? "—" : `₹${totalSpent.toFixed(2)}`,
      icon: "💳",
      href: "/buyer/orders",
      trend: "~22% saved vs retail",
      color: "from-purple-500/10 to-purple-500/5 text-purple-700 border-purple-200/60",
    },
  ];

  const recentOrders = orders.slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      {/* Personalized Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0a2016] via-[#113a26] to-[#0a2016] p-6 sm:p-10 text-white shadow-xl">
        <div
          className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-30 pointer-events-none"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1400&auto=format&fit=crop&q=80')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/80 via-transparent to-emerald-950/80" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-400/20 border border-emerald-400/30 px-3 py-1 text-xs font-bold text-emerald-300 backdrop-blur-sm">
                🛒 {t("auth.householdBuyer", "Household Consumer")}
              </span>
              <span className="rounded-full bg-amber-400/20 border border-amber-400/30 px-3 py-1 text-xs font-bold text-amber-300 backdrop-blur-sm">
                🔒 100% {t("footer.escrowProtection", "Escrow Protection")}
              </span>
              {user?.isVerifiedBuyer ? (
                <VerifiedBadge type="buyer" className="bg-blue-950/80 border-blue-400/40 text-blue-200" />
              ) : (
                <span className="rounded-full bg-white/10 border border-white/20 px-2.5 py-0.5 text-[11px] font-medium text-gray-300">
                  {t("common.member", "Standard Buyer")}
                </span>
              )}
            </div>

            <h1
              className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight flex flex-wrap items-center gap-2"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              <span>{t("dashboard.welcomeBack", { name: user?.name ? user.name.split(" ")[0] : "Shopper" })}</span>
              {user?.isVerifiedBuyer && <VerifiedBadge type="buyer" className="text-xs" />}
            </h1>

            <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed">
              {t("dashboard.buyerOverview", "Experience authentic Indian agriculture. Every rupee you spend goes straight to verified smallholder farmers, protected in escrow until you inspect the fresh delivery.")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/products"
              className="rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-lg hover:from-emerald-400 hover:to-emerald-500 transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-95"
            >
              <span>🛒</span>
              <span>{t("nav.browse", "Shop Fresh Produce")}</span>
            </Link>
            <Link
              to="/buyer/orders"
              className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md px-4 py-3 text-xs sm:text-sm font-bold text-white hover:bg-white/20 transition-all flex items-center gap-1.5"
            >
              <span>📦</span>
              <span>{t("orders.trackOrder", "Track Orders")}</span>
            </Link>
            <button
              onClick={handleSwitchToBusiness}
              disabled={switching}
              className="rounded-2xl border border-emerald-400/40 bg-emerald-900/40 backdrop-blur-md px-4 py-3 text-xs sm:text-sm font-bold text-emerald-200 hover:bg-emerald-800/60 transition-all flex items-center gap-1.5"
            >
              <span>🏢</span>
              <span>Switch to Business / Bulk</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((s) => (
          <Link
            key={s.label}
            to={s.href}
            className={`group rounded-3xl border bg-gradient-to-br ${s.color} bg-white p-5 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between`}
          >
            <div className="flex items-center justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm text-2xl group-hover:scale-110 transition-transform">
                {s.icon}
              </span>
              <span className="text-[11px] font-bold text-gray-400 group-hover:text-emerald-700 transition-colors">
                View details &rarr;
              </span>
            </div>

            <div className="mt-5">
              <p className="text-2xl sm:text-3xl font-black text-gray-900 group-hover:text-emerald-900 transition-colors">
                {s.value}
              </p>
              <p className="mt-1 text-xs font-bold text-gray-700">{s.label}</p>
              <p className="mt-0.5 text-[11px] font-medium text-gray-400">{s.trend}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Active Delivery Progress Alert */}
      {!loading && activeOrders > 0 && (
        <div className="relative overflow-hidden rounded-3xl border border-amber-300/80 bg-gradient-to-r from-amber-50 via-orange-50/50 to-amber-50 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-2xl text-white shadow-md">
                🚚
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-gray-900">
                    {activeOrders} Harvest {activeOrders > 1 ? "Deliveries" : "Delivery"} In Progress!
                  </h3>
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                </div>
                <p className="text-xs text-gray-600 mt-1 max-w-xl leading-relaxed">
                  Your farmer is preparing and dispatching your crops. Payment stays in our smart escrow
                  vault until you inspect and approve the quality.
                </p>
              </div>
            </div>
            <Link
              to="/buyer/orders"
              className="shrink-0 rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-amber-700 transition-colors text-center shadow-md"
            >
              Track Live Delivery &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* Seasonal In-Season Harvest Recommendations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
              <span>🌱</span> In Peak Season This Week
            </h2>
            <p className="text-xs text-gray-500">Fresh harvests at their sweetest flavor and lowest price</p>
          </div>
          <Link to="/products" className="text-xs font-bold text-emerald-700 hover:underline">
            View All Harvests &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {IN_SEASON_PICKS.map((item) => (
            <Link
              key={item.name}
              to="/products"
              className="group overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all"
            >
              <div className="relative h-40 bg-gray-100 overflow-hidden">
                <img
                  src={item.image}
                  alt={item.name}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-2.5 left-2.5 rounded-full bg-black/60 backdrop-blur-sm px-2.5 py-0.5 text-[10px] font-bold text-white">
                  {item.tag}
                </span>
                <span className="absolute bottom-2.5 right-2.5 rounded-xl bg-emerald-600/90 backdrop-blur-sm px-2 py-0.5 text-[11px] font-bold text-white">
                  📍 {item.origin}
                </span>
              </div>
              <div className="p-4">
                <p className="text-sm font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                  {item.name}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-base font-black text-gray-900">
                    {item.price}{" "}
                    <span className="text-xs font-normal text-gray-500">/ {item.unit}</span>
                  </span>
                  <span className="text-xs font-bold text-emerald-700 group-hover:translate-x-1 transition-transform">
                    Shop &rarr;
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Orders Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
              <span>📦</span> Recent Harvest Orders
            </h2>
            <p className="text-xs text-gray-500">Your latest purchases direct from farmers</p>
          </div>
          {orders.length > 0 && (
            <Link
              to="/buyer/orders"
              className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
            >
              <span>View all ({orders.length})</span>
              <span>&rarr;</span>
            </Link>
          )}
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        )}

        {!loading && orders.length === 0 && (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-12 text-center shadow-xs">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-3xl">
              🛍
            </div>
            <h3 className="mt-4 text-lg font-bold text-gray-900">
              You haven&apos;t placed any orders yet
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-gray-500 max-w-sm mx-auto">
              Explore our marketplace to connect with verified local farmers and receive farm-fresh
              produce at your doorstep.
            </p>
            <Link
              to="/products"
              className="mt-5 inline-block rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-md transition-colors"
            >
              Browse Marketplace &rarr;
            </Link>
          </div>
        )}

        {!loading && recentOrders.length > 0 && (
          <div className="space-y-3.5">
            {recentOrders.map((order) => {
              const orderId = order.id || (order as any)._id;
              const statusCfg = STATUS_CONFIG[order.status] || {
                label: order.status,
                bg: "bg-gray-50 border-gray-200",
                text: "text-gray-700",
                icon: "📦",
              };

              return (
                <Link
                  key={orderId}
                  to={`/buyer/orders/${orderId}`}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-xs hover:border-emerald-300 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-2xl group-hover:scale-105 transition-transform">
                      {statusCfg.icon}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-gray-900 text-sm sm:text-base">
                          Order #{orderId.slice(-8)}
                        </span>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusCfg.bg} ${statusCfg.text}`}
                        >
                          {statusCfg.label}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        Placed on {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} &bull; Farmer:{" "}
                        <span className="font-semibold text-gray-700">{order.farmerName || "Verified Grower"}</span>
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {order.items.slice(0, 3).map((item, idx) => (
                          <span
                            key={idx}
                            className="rounded-lg bg-gray-50 border border-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600"
                          >
                            {item.productName} × {item.quantity} {item.unit}
                          </span>
                        ))}
                        {order.items.length > 3 && (
                          <span className="text-[11px] text-gray-400 self-center">
                            +{order.items.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:flex-col sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100">
                    <p className="text-lg font-black text-emerald-700">
                      ₹{order.total.toFixed(2)}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          downloadReceiptHtml(order);
                        }}
                        className="rounded-xl border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold text-gray-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 shadow-xs transition-all active:scale-95 flex items-center gap-1"
                        title="Download Receipt"
                      >
                        <span>🧾</span>
                        <span>Receipt</span>
                      </button>
                      <span className="text-xs font-bold text-gray-400 group-hover:text-emerald-700 group-hover:translate-x-1 transition-all">
                        Track &rarr;
                      </span>
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
