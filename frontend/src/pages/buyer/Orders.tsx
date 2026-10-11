import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { orderService } from "@/services/order.service";
import type { Order, OrderStatus } from "@/types/order";
import Spinner from "@/components/common/Spinner";
import ErrorMessage from "@/components/common/ErrorMessage";
import { downloadReceiptHtml, printReceipt } from "@/utils/receipt";

const STATUS_BADGES: Record<OrderStatus, { label: string; className: string; icon: string }> = {
  pending: { label: "Payment Pending", className: "bg-amber-50 text-amber-800 border-amber-200", icon: "⏳" },
  confirmed: { label: "Confirmed by Farmer", className: "bg-blue-50 text-blue-800 border-blue-200", icon: "✓" },
  processing: { label: "Packing Harvest", className: "bg-purple-50 text-purple-800 border-purple-200", icon: "🧺" },
  shipped: { label: "Out for Delivery", className: "bg-sky-50 text-sky-800 border-sky-200", icon: "🚚" },
  delivered: { label: "Delivered & Verified", className: "bg-emerald-50 text-emerald-800 border-emerald-200", icon: "🏡" },
  cancelled: { label: "Order Cancelled", className: "bg-red-50 text-red-800 border-red-200", icon: "✕" },
};

const STEP_INDEX_MAP: Record<OrderStatus, number> = {
  pending: 0,
  confirmed: 1,
  processing: 2,
  shipped: 3,
  delivered: 4,
  cancelled: -1,
};

const PROGRESS_STEPS = ["Placed", "Confirmed", "Packed", "Dispatched", "Delivered"];

export default function Orders() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "in_progress" | "delivered" | "cancelled">("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"stack" | "list">("stack");
  const [expandedStackIds, setExpandedStackIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setLoading(true);
    orderService
      .getOrdersByBuyer()
      .then((data) => setOrders(data || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const inProgressCount = orders.filter((o) =>
    ["pending", "confirmed", "processing", "shipped"].includes(o.status)
  ).length;

  const deliveredCount = orders.filter((o) => o.status === "delivered").length;
  const cancelledCount = orders.filter((o) => o.status === "cancelled").length;

  const totalSpent = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + o.total, 0);

  const statusTabs = [
    { label: t("common.all", "All Orders"), value: "all" as const, count: orders.length },
    { label: t("status.processing", "In Progress"), value: "in_progress" as const, count: inProgressCount },
    { label: t("status.delivered", "Delivered"), value: "delivered" as const, count: deliveredCount },
    { label: t("status.cancelled", "Cancelled"), value: "cancelled" as const, count: cancelledCount },
  ];

  // Filter and sort newest first
  const sortedOrders = useMemo(() => {
    const list = orders.filter((order) => {
      // Tab filter
      if (activeTab === "in_progress") {
        if (!["pending", "confirmed", "processing", "shipped"].includes(order.status)) return false;
      } else if (activeTab === "delivered") {
        if (order.status !== "delivered") return false;
      } else if (activeTab === "cancelled") {
        if (order.status !== "cancelled") return false;
      }

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const orderId = (order.id || (order as any)._id || "").toLowerCase();
        const farmerName = (order.farmerName || "").toLowerCase();
        const itemsMatch = order.items.some((i) => i.productName.toLowerCase().includes(q));
        if (!orderId.includes(q) && !farmerName.includes(q) && !itemsMatch) return false;
      }

      return true;
    });

    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [orders, activeTab, search]);

  const latestOrder = sortedOrders[0];
  const previousOrders = sortedOrders.slice(1);

  function toggleStackCard(id: string) {
    setExpandedStackIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0a2016] via-[#103a27] to-[#0a2016] p-6 sm:p-8 text-white shadow-xl">
        <div
          className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-25 pointer-events-none"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=1200&auto=format&fit=crop&q=80')",
          }}
        />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="rounded-full bg-emerald-400/20 border border-emerald-400/30 px-3 py-0.5 text-xs font-bold text-emerald-300">
                🔒 {t("footer.escrowProtection", "Escrow Protected")}
              </span>
              <span className="rounded-full bg-amber-400/20 border border-amber-400/30 px-3 py-0.5 text-xs font-bold text-amber-300">
                ⚡ {t("footer.directSourcing", "Direct Farm Orders")}
              </span>
            </div>
            <h1
              className="text-2xl sm:text-4xl font-black tracking-tight text-white"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {t("orders.title", "My Harvest Orders")}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-emerald-100/80 max-w-xl">
              {t("orders.orderHistory", "Track real-time harvest dispatch, download official tax receipts, and release escrow funds only when you physically inspect your produce.")}
            </p>
          </div>

          <Link
            to="/products"
            className="self-start md:self-auto rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-lg hover:from-emerald-400 hover:to-emerald-500 transition-all flex items-center gap-2"
          >
            <span>🌾</span>
            <span>{t("products.browseProduce", "Shop More Fresh Produce")}</span>
          </Link>
        </div>

        {/* Quick KPI stats strip */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 border-t border-white/10 text-xs">
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10 backdrop-blur-xs">
            <p className="text-gray-300 text-[11px]">Total Purchases</p>
            <p className="text-lg font-black text-white">{orders.length}</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10 backdrop-blur-xs">
            <p className="text-amber-300 text-[11px]">In Transit / Packing</p>
            <p className="text-lg font-black text-amber-300">{inProgressCount}</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10 backdrop-blur-xs">
            <p className="text-emerald-300 text-[11px]">Completed &amp; Released</p>
            <p className="text-lg font-black text-emerald-300">{deliveredCount}</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10 backdrop-blur-xs">
            <p className="text-gray-300 text-[11px]">Total Value</p>
            <p className="text-lg font-black text-white">₹{totalSpent.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search & Stack View Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Tabs with counter badges */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {statusTabs.map((tab) => {
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`group flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap shadow-xs ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500/20"
                    : "bg-white text-gray-700 hover:bg-emerald-50 border border-gray-100"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                    isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600 group-hover:bg-emerald-100"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* View mode toggle (Stack vs List) */}
          <div className="flex items-center rounded-2xl bg-white border border-gray-200 p-1 shadow-xs">
            <button
              onClick={() => setViewMode("stack")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === "stack"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              title="Stacked Deck View"
            >
              <span>🎴</span>
              <span className="hidden sm:inline">Stack View</span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === "list"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              title="Standard List View"
            >
              <span>📋</span>
              <span className="hidden sm:inline">List View</span>
            </button>
          </div>

          {/* Search */}
          <div className="relative flex-1 md:w-64">
            <input
              type="text"
              placeholder="Search order #, crop, or farmer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-xs font-medium focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-xs"
            />
            <span className="absolute left-3 top-2.5 text-gray-400 text-xs">🔍</span>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-2 text-xs text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Spinner size="lg" />
          <p className="mt-4 text-xs font-bold text-emerald-800">Loading your harvest orders…</p>
        </div>
      )}

      {error && <ErrorMessage message={error} />}

      {/* Empty State */}
      {!loading && !error && sortedOrders.length === 0 && (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-14 text-center shadow-xs">
          <span className="text-5xl">📦</span>
          <h3 className="mt-4 text-lg font-bold text-gray-900">No Orders Found</h3>
          <p className="mt-1 text-xs sm:text-sm text-gray-500 max-w-sm mx-auto">
            {orders.length === 0
              ? "You haven't placed any orders yet. Experience the difference of direct farm produce!"
              : "No orders match your selected search or filter category."}
          </p>
          <Link
            to="/products"
            className="mt-6 inline-block rounded-2xl bg-emerald-600 px-6 py-3 text-xs font-bold text-white hover:bg-emerald-700 shadow-md transition-all"
          >
            Browse Marketplace &rarr;
          </Link>
        </div>
      )}

      {/* Order Views */}
      {!loading && !error && sortedOrders.length > 0 && (
        <div className="space-y-8">
          {/* SECTION 1: LATEST ORDER HERO CARD (Highlighting the newly placed order) */}
          {latestOrder && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <h2 className="text-base sm:text-lg font-black text-gray-900">
                    🌟 Latest Placed Order
                  </h2>
                  <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                    Most Recent
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => printReceipt(latestOrder)}
                    className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-xs transition-all active:scale-95"
                    title="Print Receipt"
                  >
                    <span>🖨</span>
                    <span className="hidden sm:inline">Print</span>
                  </button>
                  <button
                    onClick={() => downloadReceiptHtml(latestOrder)}
                    className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs transition-all active:scale-95"
                    title="Download Official Receipt"
                  >
                    <span>📄</span>
                    <span>Download Receipt</span>
                  </button>
                </div>
              </div>

              {/* Render Full Card for Latest Order */}
              {(() => {
                const orderId = latestOrder.id || (latestOrder as any)._id;
                const badge = STATUS_BADGES[latestOrder.status] || {
                  label: latestOrder.status,
                  className: "bg-gray-100 text-gray-800 border-gray-200",
                  icon: "📦",
                };
                const currentStepIdx = STEP_INDEX_MAP[latestOrder.status] ?? 0;
                const isDelivered = latestOrder.status === "delivered";
                const isCancelled = latestOrder.status === "cancelled";

                return (
                  <div className="overflow-hidden rounded-3xl border-2 border-emerald-500/30 bg-white shadow-lg shadow-emerald-950/5 transition-all duration-300 animate-scale-in">
                    {/* Order Top Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-4 bg-emerald-50/50 px-6 py-4 border-b border-emerald-100">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-base font-black text-gray-900">
                          Order #{orderId.slice(-8).toUpperCase()}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-3 py-0.5 text-xs font-bold ${badge.className}`}
                        >
                          <span>{badge.icon}</span>
                          <span>{badge.label}</span>
                        </span>
                        <span className="rounded-full bg-emerald-100/70 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-900 flex items-center gap-1">
                          <span>🔒</span> Escrow Secured
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-2xl font-black text-emerald-800">
                            ₹{latestOrder.total.toFixed(2)}
                          </span>
                          <p className="text-[10px] text-gray-500 font-semibold">Total Paid</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 space-y-6">
                      {/* Order Context Details */}
                      <div className="flex flex-wrap items-center justify-between text-xs text-gray-500 gap-2">
                        <div className="flex items-center gap-2">
                          <span>
                            📅 Placed on{" "}
                            {new Date(latestOrder.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span>&bull;</span>
                          <span className="font-semibold text-gray-700 flex items-center gap-1">
                            <span>🧑‍🌾</span> Grower: {latestOrder.farmerName || "Verified Farm"}
                          </span>
                        </div>

                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg">
                          📍 Direct Farm Gate Dispatch
                        </span>
                      </div>

                      {/* Visual 5-Step Order Progress Stepper */}
                      {!isCancelled && (
                        <div className="rounded-2xl bg-gray-50/80 p-4 border border-gray-100">
                          <div className="relative flex items-center justify-between">
                            {/* Connecting track */}
                            <div className="absolute top-3.5 left-6 right-6 h-1 bg-gray-200 -z-0">
                              <div
                                className="h-full bg-emerald-500 transition-all duration-500"
                                style={{
                                  width: `${(Math.min(currentStepIdx, 4) / 4) * 100}%`,
                                }}
                              />
                            </div>

                            {PROGRESS_STEPS.map((stepLabel, idx) => {
                              const isDone = idx <= currentStepIdx;
                              const isCurrent = idx === currentStepIdx;

                              return (
                                <div key={stepLabel} className="relative z-10 flex flex-col items-center">
                                  <div
                                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                                      isDone
                                        ? "bg-emerald-600 text-white ring-4 ring-emerald-100"
                                        : "bg-white text-gray-400 border-2 border-gray-300"
                                    } ${isCurrent ? "scale-110 shadow-md ring-emerald-200 animate-pulse" : ""}`}
                                  >
                                    {isDone ? "✓" : idx + 1}
                                  </div>
                                  <span
                                    className={`mt-2 text-[11px] font-bold ${
                                      isCurrent
                                        ? "text-emerald-800"
                                        : isDone
                                        ? "text-gray-800"
                                        : "text-gray-400"
                                    }`}
                                  >
                                    {stepLabel}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Items List */}
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                          Harvest Items ({latestOrder.items.length})
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                          {latestOrder.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between rounded-2xl bg-gray-50/90 border border-gray-100 p-3"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-xs text-base">
                                  🥦
                                </span>
                                <div>
                                  <p className="text-xs font-bold text-gray-900 line-clamp-1">
                                    {item.productName}
                                  </p>
                                  <p className="text-[11px] text-gray-500">
                                    {item.quantity} {item.unit} &bull; ₹{item.price}/{item.unit}
                                  </p>
                                </div>
                              </div>
                              <span className="text-xs font-extrabold text-gray-900">
                                ₹{(item.price * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Action Footer */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-gray-100">
                        <div className="text-xs text-gray-500">
                          {isDelivered ? (
                            <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                              <span>✅</span> Escrow funds released to farmer. Delivery finalized.
                            </span>
                          ) : (
                            <span className="text-amber-700 font-semibold flex items-center gap-1.5">
                              <span>🔒</span> Payment safely held in Escrow. You hold full approval.
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => downloadReceiptHtml(latestOrder)}
                            className="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
                          >
                            <span>🧾</span>
                            <span>Download Receipt</span>
                          </button>
                          <Link
                            to={`/buyer/orders/${orderId}`}
                            className="rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition-all hover:scale-105 flex items-center gap-1.5"
                          >
                            <span>{isDelivered ? "View Receipt" : "Track & Confirm"}</span>
                            <span>&rarr;</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* SECTION 2: PREVIOUS ORDERS IN STACK FORMAT */}
          {previousOrders.length > 0 && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
                    <span>📚</span> Previous Orders Stack ({previousOrders.length})
                  </h2>
                  <span className="text-xs text-gray-500 font-medium">
                    (Past harvest purchases archived in stack format)
                  </span>
                </div>
              </div>

              {/* STACKED DECK PRESENTATION */}
              <div className={viewMode === "stack" ? "relative space-y-3" : "space-y-4"}>
                {previousOrders.map((order, idx) => {
                  const orderId = order.id || (order as any)._id;
                  const isExpanded = !!expandedStackIds[orderId] || viewMode === "list";
                  const badge = STATUS_BADGES[order.status] || {
                    label: order.status,
                    className: "bg-gray-100 text-gray-800 border-gray-200",
                    icon: "📦",
                  };
                  const currentStepIdx = STEP_INDEX_MAP[order.status] ?? 0;
                  const isDelivered = order.status === "delivered";

                  return (
                    <div
                      key={orderId}
                      className={`rounded-3xl border transition-all duration-300 bg-white shadow-xs card-hover-lift ${
                        viewMode === "stack" && !isExpanded
                          ? "border-gray-200/80 hover:border-emerald-300"
                          : "border-gray-200"
                      }`}
                    >
                      {/* Stack Card Header / Bar */}
                      <div
                        onClick={() => toggleStackCard(orderId)}
                        className="flex flex-wrap items-center justify-between gap-4 p-5 cursor-pointer select-none bg-gray-50/60 hover:bg-emerald-50/30 transition-colors rounded-3xl"
                      >
                        <div className="flex items-center gap-3">
                          {/* Stack Layer Badge */}
                          <span className="rounded-xl bg-gray-200/80 px-2.5 py-1 text-[11px] font-black text-gray-700">
                            #{idx + 2} in Stack
                          </span>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-extrabold text-gray-900">
                                Order #{orderId.slice(-8).toUpperCase()}
                              </span>
                              <span
                                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${badge.className}`}
                              >
                                {badge.label}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              {new Date(order.createdAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}{" "}
                              &bull; Farmer: {order.farmerName || "Verified Farm"} &bull;{" "}
                              {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-base font-black text-emerald-800">
                            ₹{order.total.toFixed(2)}
                          </span>

                          {/* Quick receipt download */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadReceiptHtml(order);
                            }}
                            className="rounded-xl bg-white border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 shadow-xs transition-all btn-spring flex items-center gap-1"
                            title="Download Receipt"
                          >
                            <span>🧾</span>
                            <span className="hidden sm:inline">Receipt</span>
                          </button>

                          <span className="text-gray-400 text-xs font-bold pl-1">
                            {isExpanded ? "▲" : "▼"}
                          </span>
                        </div>
                      </div>

                      {/* Expandable Body */}
                      {isExpanded && (
                        <div className="p-6 pt-2 space-y-4 border-t border-gray-100 animate-fade-in-up">
                          {/* Items pills */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2">
                            {order.items.map((item, iIdx) => (
                              <div
                                key={iIdx}
                                className="flex items-center justify-between rounded-xl bg-gray-50 p-2.5 border border-gray-100 text-xs"
                              >
                                <span className="font-medium text-gray-800">
                                  {item.productName} × {item.quantity} {item.unit}
                                </span>
                                <span className="font-bold text-gray-900">
                                  ₹{(item.price * item.quantity).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Delivery Progress line */}
                          {order.status !== "cancelled" && (
                            <div className="rounded-xl bg-gray-50 p-3 border border-gray-100 text-xs flex items-center justify-between">
                              <span className="text-gray-500 font-medium">Status Progress:</span>
                              <div className="flex items-center gap-1">
                                {PROGRESS_STEPS.map((step, sIdx) => (
                                  <span
                                    key={step}
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                      sIdx <= currentStepIdx
                                        ? "bg-emerald-600 text-white"
                                        : "bg-gray-200 text-gray-400"
                                    }`}
                                  >
                                    {step}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Action links */}
                          <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => printReceipt(order)}
                                className="rounded-xl border border-gray-200 bg-white px-3 py-1 text-xs font-bold text-gray-600 hover:bg-gray-50"
                              >
                                🖨 Print PDF
                              </button>
                              <button
                                onClick={() => downloadReceiptHtml(order)}
                                className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                              >
                                📄 Download HTML Receipt
                              </button>
                            </div>

                            <Link
                              to={`/buyer/orders/${orderId}`}
                              className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
                            >
                              <span>{isDelivered ? "View Details" : "Track Order"}</span>
                              <span>&rarr;</span>
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
