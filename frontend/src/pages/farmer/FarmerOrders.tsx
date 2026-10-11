import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { orderService } from "@/services/order.service";
import type { Order, OrderStatus } from "@/types/order";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Spinner from "@/components/common/Spinner";
import ErrorMessage from "@/components/common/ErrorMessage";
import { FARMER_NAV } from "./navItems";
import { downloadReceiptHtml, printReceipt } from "@/utils/receipt";
import VerifiedBadge from "@/components/common/VerifiedBadge";

const STATUS_STYLES: Record<OrderStatus, { badge: string; label: string; icon: string }> = {
  pending: { badge: "bg-amber-50 text-amber-800 border-amber-300", label: "Payment Pending", icon: "⏳" },
  confirmed: { badge: "bg-blue-50 text-blue-800 border-blue-300", label: "Confirmed", icon: "✓" },
  processing: { badge: "bg-purple-50 text-purple-800 border-purple-300", label: "Packing Harvest", icon: "🧺" },
  shipped: { badge: "bg-sky-50 text-sky-800 border-sky-300", label: "Dispatched", icon: "🚚" },
  delivered: { badge: "bg-emerald-50 text-emerald-800 border-emerald-300", label: "Delivered & Settled", icon: "🏡" },
  cancelled: { badge: "bg-red-50 text-red-800 border-red-300", label: "Cancelled", icon: "✕" },
};

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "confirmed",
  confirmed: "processing",
  processing: "shipped",
  shipped: "delivered",
};

const NEXT_LABELS: Partial<Record<OrderStatus, string>> = {
  pending: "Confirm Order",
  confirmed: "Pack Produce",
  processing: "Mark Dispatched 🚚",
  shipped: "Mark Delivered ✓",
};

export default function FarmerOrders() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "processing" | "shipped" | "delivered">("all");
  const [viewMode, setViewMode] = useState<"stack" | "list">("stack");
  const [expandedStackIds, setExpandedStackIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user) return;
    orderService
      .getOrdersByFarmer(user.id)
      .then(setOrders)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load orders."))
      .finally(() => setLoading(false));
  }, [user]);

  async function handleStatusUpdate(orderId: string, newStatus: OrderStatus) {
    setUpdatingId(orderId);
    try {
      const updated = await orderService.updateOrderStatus(orderId, newStatus);
      setOrders((prev) =>
        prev.map((o) =>
          (o.id || (o as any)._id) === (updated.id || (updated as any)._id) ? updated : o
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setUpdatingId(null);
    }
  }

  function toggleStackCard(id: string) {
    setExpandedStackIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const pendingCount = orders.filter((o) => o.status === "pending" || o.status === "confirmed").length;
  const processingCount = orders.filter((o) => o.status === "processing").length;
  const shippedCount = orders.filter((o) => o.status === "shipped").length;
  const deliveredCount = orders.filter((o) => o.status === "delivered").length;

  const totalDeliveredRevenue = orders
    .filter((o) => o.status === "delivered")
    .reduce((acc, o) => acc + o.total, 0);

  // Sort newest first
  const sortedOrders = useMemo(() => {
    const list = orders.filter((order) => {
      if (activeTab === "pending") return order.status === "pending" || order.status === "confirmed";
      if (activeTab === "processing") return order.status === "processing";
      if (activeTab === "shipped") return order.status === "shipped";
      if (activeTab === "delivered") return order.status === "delivered";
      return true;
    });

    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [orders, activeTab]);

  const latestOrder = sortedOrders[0];
  const previousOrders = sortedOrders.slice(1);

  return (
    <DashboardLayout
      title={t("nav.ordersDispatch", "Orders & Dispatch")}
      subtitle={t("orders.title", "Fulfill harvest orders")}
      navItems={FARMER_NAV}
    >
      <div className="space-y-6">
        {/* Top Header Card */}
        <div className="rounded-3xl bg-gradient-to-r from-[#071a11] via-[#103a27] to-[#071a11] p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="rounded-full bg-emerald-400/20 border border-emerald-400/30 px-3 py-0.5 text-xs font-bold text-emerald-300 animate-float shadow-sm">
                📦 Fulfillment Center
              </span>
              <span className="rounded-full bg-amber-400/20 border border-amber-400/30 px-3 py-0.5 text-xs font-bold text-amber-300">
                🔒 Escrow Secured
              </span>
            </div>
            <h1
              className="text-2xl sm:text-3xl font-black tracking-tight text-white"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Customer Harvest Orders
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-emerald-100/80 max-w-xl">
              Track buyer requests, pack fresh crops, print shipping manifests, and manage your fulfillment stack.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div>
              <p className="text-xs text-emerald-200">Delivered Revenue</p>
              <p className="text-2xl font-black text-white">₹{totalDeliveredRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Filter Tabs & Stack View Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {[
              { label: "All Orders", value: "all" as const, count: orders.length },
              { label: "New & Confirmed", value: "pending" as const, count: pendingCount },
              { label: "Packing", value: "processing" as const, count: processingCount },
              { label: "Dispatched", value: "shipped" as const, count: shippedCount },
              { label: "Delivered", value: "delivered" as const, count: deliveredCount },
            ].map((tab) => {
              const isActive = activeTab === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap shadow-xs btn-spring ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500/20"
                      : "bg-white text-gray-700 hover:bg-emerald-50 border border-gray-100"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                      isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-2xl bg-white border border-gray-200 p-1 shadow-xs self-start sm:self-auto">
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
              <span>Stack View</span>
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
              <span>List View</span>
            </button>
          </div>
        </div>

        {error && <ErrorMessage message={error} className="mb-4" />}

        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Spinner size="lg" />
            <p className="mt-4 text-xs font-bold text-emerald-800">Loading incoming orders…</p>
          </div>
        )}

        {!loading && !error && sortedOrders.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-white py-16 px-6 text-center shadow-xs">
            <span className="text-5xl mb-3">📦</span>
            <p className="text-base font-bold text-gray-800">No Orders in this Status</p>
            <p className="mt-1 text-xs text-gray-500 max-w-sm">
              {orders.length === 0
                ? "Incoming buyer orders will appear here as soon as consumers checkout from your listings."
                : "No orders match this specific filter tab."}
            </p>
          </div>
        )}

        {/* Orders Layout with Latest Hero + Previous Stack */}
        {!loading && sortedOrders.length > 0 && (
          <div className="space-y-8">
            {/* 🌟 LATEST INCOMING ORDER (Featured Hero) */}
            {latestOrder && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <h2 className="text-base font-black text-gray-900">
                      🌟 Latest Incoming Customer Order
                    </h2>
                    <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                      Priority Dispatch
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => printReceipt(latestOrder)}
                      className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-xs transition-all btn-spring"
                      title="Print Packing Slip"
                    >
                      <span>🖨</span>
                      <span>Print Slip</span>
                    </button>
                    <button
                      onClick={() => downloadReceiptHtml(latestOrder)}
                      className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs transition-all btn-spring"
                      title="Download Manifest"
                    >
                      <span>📄</span>
                      <span>Manifest</span>
                    </button>
                  </div>
                </div>

                {/* Latest Order Hero Card */}
                {(() => {
                  const orderId = latestOrder.id || (latestOrder as any)._id;
                  const cfg = STATUS_STYLES[latestOrder.status] || {
                    badge: "bg-gray-50 text-gray-700 border-gray-200",
                    label: latestOrder.status,
                    icon: "📦",
                  };
                  const nextStatus = NEXT_STATUS[latestOrder.status];
                  const nextLabel = NEXT_LABELS[latestOrder.status];
                  const isUpdating = updatingId === orderId;

                  return (
                    <div className="overflow-hidden rounded-3xl border-2 border-emerald-500/30 bg-white shadow-lg shadow-emerald-950/5 animate-scale-in">
                      {/* Top bar */}
                      <div className="flex flex-wrap items-center justify-between gap-4 bg-emerald-50/50 px-6 py-4 border-b border-emerald-100">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-base font-black text-gray-900">
                            Order #{orderId.slice(-8).toUpperCase()}
                          </span>
                          <span
                            className={`rounded-full border px-3 py-0.5 text-xs font-bold flex items-center gap-1 ${cfg.badge}`}
                          >
                            <span>{cfg.icon}</span>
                            <span>{cfg.label}</span>
                          </span>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                            <span>Customer: {latestOrder.buyerName}</span>
                            <VerifiedBadge type="buyer" showText={false} />
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-2xl font-black text-emerald-800">
                            ₹{latestOrder.total.toFixed(2)}
                          </span>
                          <p className="text-[10px] text-gray-500 font-semibold">
                            {latestOrder.status === "delivered" ? "Payment Released" : "Held in Escrow"}
                          </p>
                        </div>
                      </div>

                      <div className="p-6 space-y-6">
                        {/* Order Metadata */}
                        <div className="flex flex-wrap items-center justify-between text-xs text-gray-500 gap-2">
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
                          <span className="text-gray-700 font-medium">
                            📍 Delivery: {latestOrder.deliveryAddress}
                          </span>
                        </div>

                        {/* Items breakdown */}
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                            Produce to Pack ({latestOrder.items.length})
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                            {latestOrder.items.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between rounded-2xl bg-gray-50/90 border border-gray-100 p-3"
                              >
                                <div>
                                  <p className="text-xs font-bold text-gray-900">
                                    {item.productName}
                                  </p>
                                  <p className="text-[11px] text-gray-500">
                                    {item.quantity} {item.unit} &bull; ₹{item.price}/{item.unit}
                                  </p>
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
                          <p className="text-xs text-gray-500">
                            {latestOrder.status === "delivered" ? (
                              <span className="text-emerald-700 font-semibold">
                                ✓ Order completed. Escrow funds transferred.
                              </span>
                            ) : (
                              <span className="text-amber-700 font-semibold">
                                🔒 Escrow guaranteed. Advance status upon dispatch.
                              </span>
                            )}
                          </p>

                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => downloadReceiptHtml(latestOrder)}
                              className="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-xs transition-all btn-spring flex items-center gap-1.5"
                            >
                              <span>🧾</span>
                              <span>Packing Slip</span>
                            </button>

                            {nextStatus && nextLabel && (
                              <button
                                onClick={() => handleStatusUpdate(orderId, nextStatus)}
                                disabled={isUpdating}
                                className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 px-6 py-2.5 text-xs font-black text-white shadow-md hover:shadow-lg transition-all btn-spring disabled:opacity-50"
                              >
                                {isUpdating ? "Updating Status…" : nextLabel}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 📚 PREVIOUS HARVEST ORDERS STACK */}
            {previousOrders.length > 0 && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                    <span>📚</span> Previous Orders Stack ({previousOrders.length})
                  </h2>
                  <span className="text-xs text-gray-500">
                    (Past harvest customer dispatches in stack format)
                  </span>
                </div>

                <div className={viewMode === "stack" ? "space-y-3" : "space-y-4"}>
                  {previousOrders.map((order, idx) => {
                    const orderId = order.id || (order as any)._id;
                    const isExpanded = !!expandedStackIds[orderId] || viewMode === "list";
                    const cfg = STATUS_STYLES[order.status] || {
                      badge: "bg-gray-50 text-gray-700 border-gray-200",
                      label: order.status,
                      icon: "📦",
                    };
                    const nextStatus = NEXT_STATUS[order.status];
                    const nextLabel = NEXT_LABELS[order.status];
                    const isUpdating = updatingId === orderId;

                    return (
                      <div
                        key={orderId}
                        className={`rounded-3xl border transition-all duration-300 bg-white shadow-xs card-hover-lift ${
                          viewMode === "stack" && !isExpanded
                            ? "border-gray-200/80 hover:border-emerald-300"
                            : "border-gray-200"
                        }`}
                      >
                        {/* Stack Header Bar */}
                        <div
                          onClick={() => toggleStackCard(orderId)}
                          className="flex flex-wrap items-center justify-between gap-4 p-5 cursor-pointer select-none bg-gray-50/60 hover:bg-emerald-50/30 transition-colors rounded-3xl"
                        >
                          <div className="flex items-center gap-3">
                            <span className="rounded-xl bg-gray-200/80 px-2.5 py-1 text-[11px] font-black text-gray-700">
                              #{idx + 2} in Stack
                            </span>

                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-extrabold text-gray-900">
                                  Order #{orderId.slice(-8).toUpperCase()}
                                </span>
                                <span
                                  className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${cfg.badge}`}
                                >
                                  {cfg.label}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1.5">
                                <span>Customer: <strong className="text-gray-700">{order.buyerName}</strong></span>
                                <VerifiedBadge type="buyer" showText={false} />
                                <span>&bull;</span>
                                <span>
                                  {new Date(order.createdAt).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </span>
                                <span>&bull;</span>
                                <span>{order.items.length} item{order.items.length !== 1 ? "s" : ""}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-base font-black text-emerald-800">
                              ₹{order.total.toFixed(2)}
                            </span>

                            {/* Manifest slip download */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadReceiptHtml(order);
                              }}
                              className="rounded-xl bg-white border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 shadow-xs transition-all btn-spring flex items-center gap-1"
                              title="Download Packing Slip"
                            >
                              <span>🧾</span>
                              <span className="hidden sm:inline">Slip</span>
                            </button>

                            <span className="text-gray-400 text-xs font-bold pl-1">
                              {isExpanded ? "▲" : "▼"}
                            </span>
                          </div>
                        </div>

                        {/* Expandable Content */}
                        {isExpanded && (
                          <div className="p-6 pt-2 space-y-4 border-t border-gray-100 animate-fade-in-up">
                            <p className="text-xs text-gray-600">
                              📍 <strong>Delivery Address:</strong> {order.deliveryAddress}
                            </p>

                            {/* Items breakdown */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
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

                            {/* Status and Action Buttons */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-gray-100">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => printReceipt(order)}
                                  className="rounded-xl border border-gray-200 bg-white px-3 py-1 text-xs font-bold text-gray-600 hover:bg-gray-50 btn-spring"
                                >
                                  🖨 Print Slip
                                </button>
                                <button
                                  onClick={() => downloadReceiptHtml(order)}
                                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 btn-spring"
                                >
                                  📄 Download HTML Manifest
                                </button>
                              </div>

                              {nextStatus && nextLabel && (
                                <button
                                  onClick={() => handleStatusUpdate(orderId, nextStatus)}
                                  disabled={isUpdating}
                                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-xs transition-all btn-spring disabled:opacity-50"
                                >
                                  {isUpdating ? "Updating Status…" : nextLabel}
                                </button>
                              )}
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
    </DashboardLayout>
  );
}
