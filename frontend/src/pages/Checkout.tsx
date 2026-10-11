import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { orderService } from "@/services/order.service";
import { paymentService, loadRazorpayScript } from "@/services/payment.service";
import LocationPicker, { type VerifiedLocation } from "@/components/common/LocationPicker";

export default function Checkout() {
  const { t } = useTranslation();
  const { items, total, clear } = useCart();
  const { user } = useAuth();
  const nav = useNavigate();

  // Structured delivery address fields
  const [fullName, setFullName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [street, setStreet] = useState("");
  const [district, setDistrict] = useState(user?.district || "");
  const [state, setState] = useState("Maharashtra");
  const [pincode, setPincode] = useState("");
  const [landmark, setLandmark] = useState("");
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [coordinates, setCoordinates] = useState<[number, number] | undefined>(undefined);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleLocationAutofill(loc: VerifiedLocation) {
    if (loc.district) setDistrict(loc.district);
    if (loc.state) setState(loc.state);
    if (loc.pincode) setPincode(loc.pincode);
    if (!street) setStreet(loc.displayName.split(",")[0]);
    setCoordinates(loc.coordinates);
    setShowLocationPicker(false);
  }

  function validateForm(): boolean {
    const errs: Record<string, string> = {};

    if (!fullName.trim() || fullName.trim().length < 2) {
      errs.fullName = "Recipient name is required (min 2 characters).";
    }

    const cleanPhone = phone.trim().replace(/[\s\-()]/g, "").slice(-10);
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      errs.phone = "Enter a valid 10-digit Indian mobile number starting with 6-9.";
    }

    if (!street.trim() || street.trim().length < 5) {
      errs.street = "Street / House / Building address is required (min 5 characters).";
    }

    if (!district.trim()) {
      errs.district = "City / District is required.";
    }

    if (!state.trim()) {
      errs.state = "State is required.";
    }

    const cleanPin = pincode.trim();
    if (!/^[1-9][0-9]{5}$/.test(cleanPin)) {
      errs.pincode = "Enter a valid 6-digit Indian postal PIN code (e.g. 422001).";
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function submit() {
    setError("");

    if (!items.length) {
      setError("Your cart is empty. Please add items to proceed.");
      return;
    }

    if (!validateForm()) {
      setError("Please fix the highlighted address fields before proceeding.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setLoading(true);
    try {
      const cleanPhone = phone.trim().replace(/[\s\-()]/g, "").slice(-10);
      const formattedAddress = `${fullName.trim()}, ${street.trim()}, ${landmark ? landmark.trim() + ", " : ""}${district.trim()}, ${state.trim()} - ${pincode.trim()} (Contact: +91-${cleanPhone})`;

      // 1. Create order on backend with server-side stock and price validation (Hard rules #1 & #2)
      const order = await orderService.createOrder({
        deliveryAddress: formattedAddress,
        items: items.map((i) => ({
          productId: i.id,
          productName: i.name,
          quantity: i.quantity,
          unit: i.unit,
          price: i.price,
        })),
      });

      const orderId = (order as any)._id || order.id;

      // 2. Initiate Razorpay payment session
      const paymentInit = await paymentService.initiate(orderId);

      // Dev mock mode: If Razorpay keys are not yet configured, complete mock checkout
      if (paymentInit.isMock) {
        await paymentService.verify({
          orderId,
          razorpayOrderId: paymentInit.razorpayOrderId,
          razorpayPaymentId: `pay_mock_${Date.now()}`,
          razorpaySignature: "mock_signature",
        });
        clear();
        nav(`/buyer/orders/${orderId}`);
        return;
      }

      // 3. Live/Test Razorpay flow with hosted modal
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        clear();
        nav(`/buyer/orders/${orderId}`);
        return;
      }

      const options = {
        key: paymentInit.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: paymentInit.amount,
        currency: paymentInit.currency,
        name: "Krishi Bazaar",
        description: `Produce Order #${orderId.slice(-6)}`,
        order_id: paymentInit.razorpayOrderId,
        handler: async (response: any) => {
          try {
            await paymentService.verify({
              orderId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            clear();
            nav(`/buyer/orders/${orderId}`);
          } catch (verifyErr: any) {
            setError(verifyErr?.message || "Payment verification failed.");
            clear();
            nav(`/buyer/orders/${orderId}`);
          }
        },
        modal: {
          ondismiss: () => {
            clear();
            nav(`/buyer/orders/${orderId}`);
          },
        },
        prefill: {
          name: fullName,
          contact: cleanPhone,
        },
        theme: {
          color: "#16a34a",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", (response: any) => {
        setError(response.error?.description || "Payment failed. Please try again.");
      });
      rzp.open();
    } catch (e: any) {
      setError(e instanceof Error ? e.message : "Checkout failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            {t("common.confirm", "Final Step")}
          </span>
          <h1
            className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {t("checkout.title", "Secure Checkout")}
          </h1>
        </div>
        <span className="rounded-full bg-emerald-100 border border-emerald-300 px-3 py-1 text-xs font-semibold text-emerald-800 shadow-xs">
          🛡️ {t("products.escrowProtected", "Escrow Protected")}
        </span>
      </div>

      {!items.length ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <p className="text-gray-600">{t("checkout.emptyBasket", "Your basket is currently empty.")}</p>
          <Link
            to="/products"
            className="mt-4 inline-block font-semibold text-emerald-600 hover:text-emerald-700"
          >
            {t("checkout.browseProduce", "Browse Fresh Produce →")}
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-medium">
              ⚠️ {error}
            </div>
          )}

          {/* Delivery Address Form Card */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{t("checkout.deliveryAddressDetails", "Delivery Address Details")}</h2>
                <p className="text-xs text-gray-500">
                  {t("checkout.deliveryAddressSubtitle", "Ensure accurate Indian address details for timely farm-to-door dispatch.")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLocationPicker(!showLocationPicker)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs transition"
              >
                <span>🛰️</span>
                <span>{showLocationPicker ? t("checkout.closeMap", "Close Map") : t("checkout.autofillGps", "Autofill via OpenStreetMap GPS")}</span>
              </button>
            </div>

            {/* Optional OpenStreetMap Location Picker Dropdown */}
            {showLocationPicker && (
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 animate-fade-in">
                <LocationPicker
                  onLocationSelected={handleLocationAutofill}
                  label={t("checkout.mapSearchLabel", "Search or Pinpoint Address via OpenStreetMap")}
                  placeholder={t("checkout.mapSearchPlaceholder", "Type city, town or area to autofill...")}
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {t("checkout.recipientFullName", "Recipient Full Name")} *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, fullName: "" }));
                  }}
                  placeholder={t("checkout.recipientNamePlaceholder", "e.g. Ramesh Patil")}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm transition ${
                    fieldErrors.fullName ? "border-red-500 bg-red-50/30" : "border-gray-300 focus:border-emerald-600"
                  }`}
                />
                {fieldErrors.fullName && (
                  <p className="mt-1 text-[11px] text-red-500">{fieldErrors.fullName}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {t("checkout.contactMobile", "Contact Mobile Number")} *
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, phone: "" }));
                  }}
                  placeholder={t("checkout.mobilePlaceholder", "10-digit number (e.g. 9876543210)")}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm transition ${
                    fieldErrors.phone ? "border-red-500 bg-red-50/30" : "border-gray-300 focus:border-emerald-600"
                  }`}
                />
                {fieldErrors.phone && (
                  <p className="mt-1 text-[11px] text-red-500">{fieldErrors.phone}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {t("checkout.streetAddress", "House / Flat / Building / Street Address")} *
              </label>
              <input
                type="text"
                value={street}
                onChange={(e) => {
                  setStreet(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, street: "" }));
                }}
                placeholder={t("checkout.streetPlaceholder", "e.g. Flat 302, Shanti Vihar, College Road")}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm transition ${
                  fieldErrors.street ? "border-red-500 bg-red-50/30" : "border-gray-300 focus:border-emerald-600"
                }`}
              />
              {fieldErrors.street && (
                <p className="mt-1 text-[11px] text-red-500">{fieldErrors.street}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {t("checkout.cityDistrict", "City / District")} *
                </label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => {
                    setDistrict(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, district: "" }));
                  }}
                  placeholder={t("checkout.cityPlaceholder", "e.g. Nashik")}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm transition ${
                    fieldErrors.district ? "border-red-500 bg-red-50/30" : "border-gray-300 focus:border-emerald-600"
                  }`}
                />
                {fieldErrors.district && (
                  <p className="mt-1 text-[11px] text-red-500">{fieldErrors.district}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {t("checkout.stateLabel", "State")} *
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => {
                    setState(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, state: "" }));
                  }}
                  placeholder={t("checkout.statePlaceholder", "e.g. Maharashtra")}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm transition ${
                    fieldErrors.state ? "border-red-500 bg-red-50/30" : "border-gray-300 focus:border-emerald-600"
                  }`}
                />
                {fieldErrors.state && (
                  <p className="mt-1 text-[11px] text-red-500">{fieldErrors.state}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {t("checkout.pincodeLabel", "Postal PIN Code")} *
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => {
                    setPincode(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, pincode: "" }));
                  }}
                  placeholder={t("checkout.pincodePlaceholder", "6 digits (e.g. 422001)")}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm transition ${
                    fieldErrors.pincode ? "border-red-500 bg-red-50/30" : "border-gray-300 focus:border-emerald-600"
                  }`}
                />
                {fieldErrors.pincode && (
                  <p className="mt-1 text-[11px] text-red-500">{fieldErrors.pincode}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {t("checkout.landmarkLabel", "Landmark / Delivery Instructions (Optional)")}
              </label>
              <input
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder={t("checkout.landmarkPlaceholder", "e.g. Near Big Banyan Tree, Ring bell on gate")}
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Order Summary */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">{t("checkout.orderItemsPricing", "Order Items & Pricing")}</h2>
            <div className="mt-3 divide-y divide-gray-100">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between py-2.5 text-sm">
                  <span className="text-gray-700 font-medium">
                    {item.name} × {item.quantity} {item.unit}
                  </span>
                  <span className="font-bold text-gray-900">
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 text-base font-bold">
              <span className="text-gray-900">{t("checkout.totalPayable", "Total Payable Amount")}</span>
              <span className="text-xl text-emerald-800">₹{total.toFixed(2)}</span>
            </div>
          </div>

          <div className="rounded-2xl bg-amber-50 p-4 text-xs text-amber-900 border border-amber-200/80 flex items-start gap-2.5 shadow-xs">
            <span className="text-base font-bold">🛡️</span>
            <div>
              <strong className="font-bold">{t("checkout.escrowGuaranteeTitle", "Indian Escrow Protection Guarantee:")}</strong>
              <p className="text-amber-800 mt-0.5">
                {t("checkout.escrowGuaranteeDesc", "Your payment is held safely in escrow and released to the farmer only after you inspect and confirm receipt of your fresh harvest.")}
              </p>
            </div>
          </div>

          <button
            disabled={loading}
            onClick={submit}
            className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-800 px-5 py-4 text-base font-bold text-white shadow-lg hover:from-emerald-500 hover:to-emerald-700 disabled:opacity-50 transition-all cursor-pointer"
          >
            {loading ? t("checkout.processingOrder", "Processing Order & Escrow…") : t("checkout.payAndConfirm", { amount: `₹${total.toFixed(2)}`, defaultValue: `Pay ₹${total.toFixed(2)} & Confirm Order` })}
          </button>
        </div>
      )}
    </div>
  );
}
