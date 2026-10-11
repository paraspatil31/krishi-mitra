import { useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useCart, type CartItem } from "@/context/CartContext";

export default function Cart() {
  const { t } = useTranslation();
  const {
    items,
    remove,
    increment,
    decrement,
    clear,
    clearFarmer,
    total,
    count,
    hasMultipleFarmers,
    farmerIds,
  } = useCart();
  const nav = useNavigate();

  // Group items by farmer
  const groupedByFarmer = useMemo(() => {
    const map = new Map<string, { farmerName: string; items: CartItem[]; subtotal: number }>();

    for (const item of items) {
      const fid = item.farmerId || "unknown";
      const existing = map.get(fid);
      const itemSubtotal = item.price * item.quantity;

      if (existing) {
        existing.items.push(item);
        existing.subtotal += itemSubtotal;
      } else {
        map.set(fid, {
          farmerName: item.farmerName || t("cart.localFarm", "Local Farm"),
          items: [item],
          subtotal: itemSubtotal,
        });
      }
    }

    return Array.from(map.entries());
  }, [items, t]);

  if (!items.length) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50 text-5xl">
          🛍
        </div>
        <h1 className="mt-6 text-3xl font-extrabold text-gray-900">{t("cart.emptyTitle")}</h1>
        <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
          {t("cart.emptyDescription")}
        </p>
        <Link
          to="/products"
          className="mt-8 inline-block rounded-2xl bg-emerald-600 px-8 py-3.5 text-sm font-bold text-white shadow hover:bg-emerald-700 transition-colors"
        >
          {t("cart.exploreProduce")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      {/* Title & Clear */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
            {t("cart.shoppingBasket")}
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            {count} {t("common.items", "items")} {t("common.selected", "selected")}
          </p>
        </div>

        <button
          onClick={clear}
          className="text-xs font-semibold text-gray-400 hover:text-red-600 transition-colors"
        >
          {t("cart.clearAllItems")}
        </button>
      </div>

      {/* Multi-Farmer Notice */}
      {hasMultipleFarmers && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-bold">{t("cart.multiFarmerTitle", { count: farmerIds.length })}</p>
              <p className="mt-0.5 text-xs text-amber-800 leading-relaxed">
                {t("cart.multiFarmerDescription")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="mt-8 grid gap-8 lg:grid-cols-12 items-start">
        {/* Items Column */}
        <div className="lg:col-span-8 space-y-6">
          {groupedByFarmer.map(([farmerId, group]) => (
            <div
              key={farmerId}
              className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🌾</span>
                  <span className="font-bold text-gray-900 text-sm sm:text-base">
                    {t("cart.farmLabel", { name: group.farmerName })}
                  </span>
                </div>

                {hasMultipleFarmers && (
                  <button
                    onClick={() => clearFarmer(farmerId)}
                    className="text-xs text-gray-400 hover:text-red-600"
                  >
                    {t("cart.removeFarmItems")}
                  </button>
                )}
              </div>

              {/* Items List for this Farmer */}
              <div className="divide-y divide-gray-100">
                {group.items.map((item) => (
                  <div key={item.id} className="py-4 flex gap-4 items-center">
                    {/* Thumbnail */}
                    <div className="h-20 w-20 rounded-2xl bg-gray-100 overflow-hidden shrink-0 border border-gray-100">
                      {item.images && item.images[0] ? (
                        <img
                          src={item.images[0]}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-3xl">
                          🌾
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/products/${item.id}`}
                        className="font-bold text-gray-900 text-sm sm:text-base hover:text-emerald-700 transition-colors line-clamp-1"
                      >
                        {item.name}
                      </Link>
                      <p className="text-xs text-gray-500 mt-0.5">
                        ₹{item.price.toFixed(2)} / {item.unit}
                      </p>

                      {/* Mobile Stepper */}
                      <div className="mt-3 flex items-center justify-between sm:hidden">
                        <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50">
                          <button
                            onClick={() => decrement(item.id)}
                            className="px-2.5 py-1 text-sm font-bold text-gray-600"
                          >
                            –
                          </button>
                          <span className="w-8 text-center text-xs font-bold text-gray-900">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => increment(item.id)}
                            className="px-2.5 py-1 text-sm font-bold text-gray-600"
                          >
                            +
                          </button>
                        </div>
                        <span className="font-extrabold text-sm text-gray-900">
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Desktop Stepper */}
                    <div className="hidden sm:flex items-center rounded-xl border border-gray-200 bg-gray-50">
                      <button
                        onClick={() => decrement(item.id)}
                        className="px-3 py-1.5 text-sm font-bold text-gray-600 hover:text-emerald-700"
                      >
                        –
                      </button>
                      <span className="w-8 text-center text-xs font-bold text-gray-900">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => increment(item.id)}
                        className="px-3 py-1.5 text-sm font-bold text-gray-600 hover:text-emerald-700"
                      >
                        +
                      </button>
                    </div>

                    {/* Desktop Subtotal & Remove */}
                    <div className="hidden sm:flex flex-col items-end w-28">
                      <span className="font-extrabold text-base text-gray-900">
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </span>
                      <button
                        onClick={() => remove(item.id)}
                        className="mt-1 text-xs text-red-500 hover:text-red-700"
                      >
                        {t("common.remove", "Remove")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Farmer Subtotal */}
              <div className="mt-3 border-t border-gray-100 pt-3 flex justify-between text-xs font-semibold text-gray-600">
                <span>{t("cart.subtotalForFarm")}</span>
                <span className="text-gray-900 font-bold">₹{group.subtotal.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-4 sticky top-6 space-y-4">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-extrabold text-gray-900 border-b border-gray-100 pb-3">
              {t("cart.orderSummary")}
            </h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>{t("cart.produceSubtotal")}</span>
                <span className="font-semibold text-gray-900">₹{total.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-gray-600">
                <span>{t("cart.farmToDooorDelivery")}</span>
                <span className="font-medium text-emerald-700">{t("cart.arrangedDirect")}</span>
              </div>

              <div className="flex justify-between text-gray-600">
                <span>{t("cart.escrowFee")}</span>
                <span className="font-medium text-emerald-700">{t("cart.escrowFeeFree")}</span>
              </div>

              <div className="border-t border-gray-100 pt-3 flex justify-between text-base font-extrabold text-gray-900">
                <span>{t("cart.totalAmount")}</span>
                <span className="text-emerald-700 text-xl font-extrabold">₹{total.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => nav("/checkout")}
              disabled={hasMultipleFarmers}
              className="mt-6 w-full rounded-2xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {hasMultipleFarmers ? t("cart.selectOneFarm") : t("cart.proceedToCheckout")}
            </button>

            {hasMultipleFarmers && (
              <p className="mt-2 text-center text-xs text-amber-700 font-medium">
                {t("cart.removeExtraFarm")}
              </p>
            )}

            <div className="mt-6 rounded-2xl bg-emerald-50/70 p-3.5 border border-emerald-100 text-xs text-emerald-900">
              <p className="font-bold flex items-center gap-1.5 mb-1">
                <span>🔒</span> {t("cart.safeEscrow")}
              </p>
              <p className="text-emerald-800 leading-relaxed">
                {t("cart.escrowDescription")}
              </p>
            </div>
          </div>

          <Link
            to="/products"
            className="block text-center text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            {t("cart.continueShopping")}
          </Link>
        </div>
      </div>
    </div>
  );
}
