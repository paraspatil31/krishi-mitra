import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { fpoService, FPOOrder } from "@/services/fpo.service";
import Spinner from "@/components/common/Spinner";
import ErrorMessage from "@/components/common/ErrorMessage";

export default function FPOOrders() {
  const [orders, setOrders] = useState<FPOOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      setLoading(true);
      setError(null);
      const data = await fpoService.getOrders();
      setOrders(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load aggregated orders");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdvanceStatus(orderId: string, nextStatus: string) {
    try {
      setUpdatingId(orderId);
      setError(null);
      await fpoService.updateOrderStatus(orderId, nextStatus);
      await loadOrders();
    } catch (err: any) {
      setError(err?.message || `Failed to update status to ${nextStatus}`);
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === "all") return true;
    return o.status === statusFilter;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Link to="/fpo/dashboard" className="text-xs text-gray-500 hover:text-emerald-700">
              ← FPO Dashboard
            </Link>
          </div>
          <h1
            className="text-2xl font-bold text-gray-900 mt-1"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            FPO Orders & Dispatch Manifest
          </h1>
          <p className="text-xs text-gray-500">
            Fulfill and track collective dispatch across all member farm harvest lots.
          </p>
        </div>

        <Link
          to="/fpo/lots"
          className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-xs"
        >
          <span>📦</span>
          <span>View Lots</span>
        </Link>
      </div>

      {error && <ErrorMessage message={error} />}

      {/* Filter Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-gray-200 pb-3 mb-6">
        {[
          { key: "all", label: `All Orders (${orders.length})` },
          { key: "pending", label: "Pending" },
          { key: "confirmed", label: "Confirmed" },
          { key: "processing", label: "Processing / Packed" },
          { key: "shipped", label: "In Transit / Shipped" },
          { key: "delivered", label: "Delivered & Released" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`rounded-xl px-4 py-2 text-xs font-bold whitespace-nowrap transition-all ${
              statusFilter === tab.key
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : filteredOrders.length > 0 ? (
        <div className="space-y-4">
          {filteredOrders.map((o) => {
            return (
              <div
                key={o.id}
                className="rounded-3xl border border-gray-100 bg-white p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-2 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-gray-900">
                      Order #{o.id.slice(-6).toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">
                      Producer Lot: <strong className="text-gray-800">{o.farmerName}</strong>
                    </span>
                    <span
                      className={`ml-auto sm:ml-2 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                        o.status === "pending"
                          ? "bg-amber-100 text-amber-800"
                          : o.status === "confirmed"
                          ? "bg-blue-100 text-blue-800"
                          : o.status === "processing"
                          ? "bg-purple-100 text-purple-800"
                          : o.status === "shipped"
                          ? "bg-indigo-100 text-indigo-800"
                          : o.status === "delivered"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {o.status}
                    </span>
                  </div>

                  {/* Items breakdown */}
                  <div className="rounded-2xl bg-gray-50/80 p-3 text-xs space-y-1">
                    {o.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between font-medium">
                        <span>
                          🌾 {item.productName} ({item.quantity} {item.unit})
                        </span>
                        <span className="text-gray-700">₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  {/* Buyer and destination */}
                  <div className="text-xs text-gray-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span>
                      Buyer: <strong className="text-gray-900">{o.buyerName}</strong>
                    </span>
                    <span>📍 Destination: {o.deliveryAddress}</span>
                  </div>
                </div>

                {/* Right Side: Total Amount & Status Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center md:flex-col md:items-end gap-3 border-t sm:border-t-0 md:border-l border-gray-100 sm:pt-0 pt-4 md:pl-6 shrink-0">
                  <div className="text-left md:text-right">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Total Realization</span>
                    <span className="text-xl font-bold text-emerald-800">
                      ₹{o.total.toLocaleString("en-IN")}
                    </span>
                    <span className="block text-[10px] text-gray-400">Escrow Protected</span>
                  </div>

                  {/* Step Status Advancer */}
                  <div className="flex flex-wrap gap-2">
                    {o.status === "pending" && (
                      <button
                        onClick={() => handleAdvanceStatus(o.id, "confirmed")}
                        disabled={updatingId === o.id}
                        className="rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 shadow-xs"
                      >
                        {updatingId === o.id ? "Updating..." : "Confirm Order"}
                      </button>
                    )}

                    {o.status === "confirmed" && (
                      <button
                        onClick={() => handleAdvanceStatus(o.id, "processing")}
                        disabled={updatingId === o.id}
                        className="rounded-xl bg-purple-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-purple-700 shadow-xs"
                      >
                        {updatingId === o.id ? "Updating..." : "Mark Packed (Processing)"}
                      </button>
                    )}

                    {o.status === "processing" && (
                      <button
                        onClick={() => handleAdvanceStatus(o.id, "shipped")}
                        disabled={updatingId === o.id}
                        className="rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-xs"
                      >
                        {updatingId === o.id ? "Updating..." : "Dispatch / Mark Shipped"}
                      </button>
                    )}

                    {o.status === "shipped" && (
                      <span className="text-xs text-indigo-700 font-semibold bg-indigo-50 px-3 py-1 rounded-xl">
                        🚚 In Transit (Awaiting Buyer Delivery Confirmation)
                      </span>
                    )}

                    {o.status === "delivered" && (
                      <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-3 py-1 rounded-xl">
                        ✅ Escrow Released to Producer
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-gray-200 p-12 text-center bg-gray-50/50">
          <span className="text-4xl block mb-2">📋</span>
          <h3 className="text-sm font-bold text-gray-900 mb-1">No orders found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            When buyers place orders on your collective crop lots, they will show up here for packing and dispatch.
          </p>
        </div>
      )}
    </div>
  );
}
