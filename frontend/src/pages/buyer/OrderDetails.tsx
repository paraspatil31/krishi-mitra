import { useEffect, useState, useMemo } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { orderService } from "@/services/order.service";
import { paymentService } from "@/services/payment.service";
import type { Order, OrderStatus } from "@/types/order";
import type { PaymentRecord } from "@/types/payment";
import Spinner from "@/components/common/Spinner";
import { downloadReceiptHtml, printReceipt } from "@/utils/receipt";
import OrderReviewCard from "@/components/reviews/OrderReviewCard";

const STEP_ORDER: Record<OrderStatus, number> = {
  pending: 0,
  confirmed: 1,
  processing: 2,
  shipped: 3,
  delivered: 4,
  cancelled: -1,
};

export default function OrderDetails() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [payment, setPayment] = useState<PaymentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [error, setError] = useState("");

  const timelineSteps = useMemo<
    { key: OrderStatus; label: string; icon: string; desc: string }[]
  >(
    () => [
      {
        key: "pending",
        label: t("orders.stepOrderPlaced"),
        icon: "📝",
        desc: t("orders.stepOrderPlacedDesc"),
      },
      {
        key: "confirmed",
        label: t("orders.stepConfirmed"),
        icon: "✓",
        desc: t("orders.stepConfirmedDesc"),
      },
      {
        key: "processing",
        label: t("orders.stepHarvestPacking"),
        icon: "🧺",
        desc: t("orders.stepHarvestPackingDesc"),
      },
      {
        key: "shipped",
        label: t("orders.stepDispatched"),
        icon: "🚚",
        desc: t("orders.stepDispatchedDesc"),
      },
      {
        key: "delivered",
        label: t("orders.stepDelivered"),
        icon: "🏡",
        desc: t("orders.stepDeliveredDesc"),
      },
    ],
    [t]
  );

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      orderService.getOrderById(id),
      paymentService.getByOrderId(id),
    ])
      .then(([o, p]) => {
        setOrder(o);
        setPayment(p);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load order.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleConfirmDelivery() {
    if (!order || !id) return;
    setActionLoading(true);
    setActionMessage("");
    try {
      const updatedOrder = await orderService.updateOrderStatus(id, "delivered");
      setOrder(updatedOrder);

      if (payment && (payment.status === "captured" || payment.status === "held")) {
        const res = await paymentService.release(id);
        if (res.data?.payment) {
          setPayment(res.data.payment);
        }
      }
      setActionMessage(t("orders.deliveryConfirmedSuccess"));
    } catch (err: any) {
      setActionMessage(err?.message || "Failed to confirm delivery.");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-24 flex flex-col items-center justify-center">
        <Spinner size="lg" />
        <p className="mt-4 text-xs font-bold text-emerald-800">{t("common.loading")}</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <span className="text-5xl">🌾</span>
        <h2 className="mt-4 text-2xl font-bold text-gray-900">{t("orders.orderNotFound")}</h2>
        <p className="mt-2 text-sm text-gray-500">{error || t("orders.orderNotFoundDesc")}</p>
        <Link
          to="/buyer/orders"
          className="mt-6 inline-block rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-700 transition-all"
        >
          {t("orders.backToOrders")}
        </Link>
      </div>
    );
  }

  const orderId = (order as any)._id || order.id || id!;
  const currentStepIdx = STEP_ORDER[order.status] ?? 0;
  const isCancelled = order.status === "cancelled";
  const isDelivered = order.status === "delivered";

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/buyer/orders"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
        >
          <span>&larr;</span>
          <span>{t("orders.backToAll")}</span>
        </Link>

        {/* Download Receipt Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => printReceipt(order, payment)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-xs transition-all active:scale-95"
            title="Print or Save PDF Receipt"
          >
            <span>🖨</span>
            <span>{t("orders.printPdf")}</span>
          </button>
          <button
            onClick={() => downloadReceiptHtml(order, payment)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs hover:shadow transition-all active:scale-95"
            title="Download HTML Receipt"
          >
            <span>📄</span>
            <span>{t("orders.downloadReceipt")}</span>
          </button>
        </div>
      </div>

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#081e13] via-[#103a27] to-[#081e13] p-6 sm:p-8 text-white shadow-xl">
        <div
          className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-25 pointer-events-none"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=1200&auto=format&fit=crop&q=80')",
          }}
        />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="rounded-full bg-emerald-400/20 border border-emerald-400/30 px-3 py-0.5 text-xs font-bold text-emerald-300">
                Order #{orderId.slice(-8).toUpperCase()}
              </span>
              <span className="rounded-full bg-amber-400/20 border border-amber-400/30 px-3 py-0.5 text-xs font-bold text-amber-300">
                🔒 {t("orders.escrowSecured")}
              </span>
            </div>

            <h1
              className="text-2xl sm:text-3xl font-black tracking-tight text-white"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {t("orders.orderTrackingEscrow")}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-emerald-100/80">
              {t("orders.placedOn")}{" "}
              {new Date(order.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              &bull; {t("common.farmer")}:{" "}
              <span className="font-semibold text-white">
                {order.farmerName || t("orders.verifiedGrower")}
              </span>
            </p>
          </div>

          <div className="text-left md:text-right bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15">
            <span className="text-2xl sm:text-3xl font-black text-white">
              ₹{order.total.toFixed(2)}
            </span>
            <p className="text-[11px] text-emerald-200">
              {isDelivered ? t("orders.paymentReleased") : t("orders.fundsHeldInEscrow")}
            </p>
          </div>
        </div>
      </div>

      {actionMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900 shadow-xs flex items-center gap-2">
          <span>✓</span>
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Visual Status Progress Timeline */}
      <div className="rounded-3xl border border-gray-100 bg-white p-6 sm:p-8 shadow-xs">
        <h2 className="text-base font-black text-gray-900 mb-6 flex items-center gap-2">
          <span>🚚</span> {t("orders.realTimeStatus")}
        </h2>

        {isCancelled ? (
          <div className="rounded-2xl bg-red-50 p-6 text-sm font-semibold text-red-700 text-center">
            {t("orders.cancelledNotice")}
          </div>
        ) : (
          <div className="relative">
            {/* Desktop Stepper */}
            <div className="hidden sm:block">
              <div className="relative flex items-center justify-between">
                {/* Connecting track */}
                <div className="absolute left-6 right-6 top-6 h-1 bg-gray-100 z-0">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-700"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(0, (currentStepIdx / (timelineSteps.length - 1)) * 100)
                      )}%`,
                    }}
                  />
                </div>

                {timelineSteps.map((step, idx) => {
                  const isCompleted = idx <= currentStepIdx;
                  const isCurrent = idx === currentStepIdx;

                  return (
                    <div key={step.key} className="relative z-10 flex flex-col items-center">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl text-base font-bold transition-all shadow-sm ${
                          isCompleted
                            ? "bg-emerald-600 text-white ring-4 ring-emerald-100"
                            : "bg-white border-2 border-gray-200 text-gray-400"
                        } ${isCurrent ? "scale-110 shadow-lg ring-emerald-200 animate-pulse" : ""}`}
                      >
                        <span>{step.icon}</span>
                      </div>
                      <span
                        className={`mt-3 text-center text-xs font-black ${
                          isCompleted ? "text-gray-900" : "text-gray-400"
                        }`}
                      >
                        {step.label}
                      </span>
                      <span className="mt-0.5 text-center text-[10px] text-gray-400 max-w-[100px] leading-tight">
                        {step.desc}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mobile Vertical Stepper */}
            <div className="sm:hidden space-y-4">
              {timelineSteps.map((step, idx) => {
                const isCompleted = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;

                return (
                  <div key={step.key} className="flex items-start gap-3.5">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                        isCompleted ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {step.icon}
                    </div>
                    <div>
                      <p
                        className={`text-xs font-bold ${
                          isCompleted ? "text-gray-900" : "text-gray-400"
                        }`}
                      >
                        {step.label} {isCurrent && t("orders.currentStep")}
                      </p>
                      <p className="text-[11px] text-gray-500">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Escrow Status & Delivery Confirmation */}
      <div className="rounded-3xl border border-gray-100 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
              <span>🔒</span> {t("orders.escrowGuaranteeTitle")}
            </h2>
            <p className="text-xs text-gray-500 leading-relaxed max-w-xl">
              {payment?.status === "released" || isDelivered
                ? t("orders.escrowGuaranteeDelivered")
                : t("orders.escrowGuaranteePending")}
            </p>
          </div>

          {!isDelivered && !isCancelled && (
            <button
              onClick={handleConfirmDelivery}
              disabled={actionLoading}
              className="rounded-2xl bg-emerald-600 px-6 py-3.5 text-xs sm:text-sm font-black text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 transition-all hover:scale-105 active:scale-95 shrink-0"
            >
              {actionLoading ? t("orders.releasingEscrow") : t("orders.confirmDeliveryRelease")}
            </button>
          )}
        </div>

        {payment?.razorpayPaymentId && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between text-xs text-gray-500 gap-2">
            <span>{t("orders.paymentRefId")}</span>
            <span className="font-mono text-gray-800 font-semibold bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
              {payment.razorpayPaymentId}
            </span>
          </div>
        )}
      </div>

      {/* Verified Post-Delivery Rating Card (T10.2, T10.3, T10.5) */}
      <OrderReviewCard
        orderId={order.id}
        orderStatus={order.status}
        isBuyer={true}
        farmerName={order.farmerName}
        buyerName={order.buyerName}
      />

      {/* Order Items & Delivery Location */}
      <div className="grid gap-6 sm:grid-cols-12 items-start">
        {/* Items */}
        <div className="sm:col-span-8 rounded-3xl border border-gray-100 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
              <span>🧺</span> {t("orders.harvestItemsBreakdown")}
            </h2>
            <button
              onClick={() => downloadReceiptHtml(order, payment)}
              className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
            >
              <span>{t("orders.downloadInvoice")}</span>
              <span>&darr;</span>
            </button>
          </div>

          <div className="divide-y divide-gray-100">
            {order.items.map((i) => (
              <div key={i.productId} className="flex justify-between items-center py-3.5 text-sm">
                <div>
                  <p className="font-bold text-gray-900">{i.productName}</p>
                  <p className="text-xs text-gray-500">
                    {i.quantity} {i.unit} × ₹{i.price.toFixed(2)}
                  </p>
                </div>
                <span className="font-black text-gray-900 text-base">
                  ₹{(i.price * i.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-gray-100 pt-4 flex justify-between items-center text-base font-extrabold">
            <span className="text-gray-900">{t("orders.totalPaidEscrow")}</span>
            <span className="text-emerald-700 text-2xl font-black">
              ₹{order.total.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Address & Receipts card */}
        <div className="sm:col-span-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-black text-gray-900 mb-2 flex items-center gap-1.5">
              <span>📍</span> {t("orders.deliveryAddress")}
            </h2>
            <p className="text-xs text-gray-700 leading-relaxed bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
              {order.deliveryAddress}
            </p>
          </div>

          {/* Quick Invoice Download Box */}
          <div className="rounded-2xl bg-emerald-50/60 border border-emerald-100 p-4 space-y-2.5">
            <p className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
              <span>🧾</span> {t("orders.officialInvoice")}
            </p>
            <p className="text-[11px] text-emerald-800/80 leading-relaxed">
              {t("orders.invoiceSubtitle")}
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => printReceipt(order, payment)}
                className="flex-1 rounded-xl bg-white border border-emerald-200 py-1.5 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100/50 shadow-xs transition-colors"
              >
                {t("orders.printPdf")}
              </button>
              <button
                onClick={() => downloadReceiptHtml(order, payment)}
                className="flex-1 rounded-xl bg-emerald-600 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700 shadow-xs transition-colors"
              >
                {t("orders.downloadReceipt")}
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100 text-xs text-gray-500">
            <p className="font-bold text-gray-800">{t("orders.qualityGuaranteeTitle")}</p>
            <p className="mt-1 leading-normal">
              {t("orders.qualityGuaranteeDesc")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

