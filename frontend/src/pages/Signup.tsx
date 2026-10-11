import { useState, type FormEvent } from "react";
import { Link, useNavigate, Navigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import ErrorMessage from "@/components/common/ErrorMessage";
import OtpModal from "@/components/auth/OtpModal";
import { api } from "@/services/api";

export default function Signup() {
  const { t } = useTranslation();
  const { signup, isAuthenticated, user } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"farmer" | "buyer" | "fpo">("farmer");
  const [buyerType, setBuyerType] = useState<"household" | "business">("household");
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);

  if (isAuthenticated && user) {
    const destination =
      user.role === "farmer"
        ? "/farmer/dashboard"
        : user.role === "fpo"
        ? "/fpo/dashboard"
        : user.role === "admin"
        ? "/admin/dashboard"
        : user.buyerType === "business"
        ? "/business/dashboard"
        : "/products";
    return <Navigate to={destination} replace />;
  }

  // Canonical Indian 10-digit phone validator
  const cleanPhone = phone.trim().replace(/[\s\-()]/g, "").slice(-10);
  const isPhoneValid = /^[6-9]\d{9}$/.test(cleanPhone);
  const isPasswordValid = password.length >= 8;

  async function handleSendOtp(phoneNumber: string) {
    const res = await api.post<{ data: { mockOtp?: string } }>("/auth/otp/send", {
      phone: phoneNumber,
      purpose: "signup",
    });
    return res.data || {};
  }

  async function handleVerifyOtp(phoneNumber: string, code: string) {
    return api.post("/auth/otp/verify", {
      phone: phoneNumber,
      otp: code,
      purpose: "signup",
    });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError(t("auth.nameRequired"));
      return;
    }
    if (!isPhoneValid) {
      setError(t("auth.phoneRequiredFull"));
      return;
    }
    if (!isPasswordValid) {
      setError(t("auth.passwordLength"));
      return;
    }

    // Require OTP phone verification step before final registration
    if (!isPhoneVerified) {
      setShowOtpModal(true);
      return;
    }

    await completeRegistration();
  }

  async function completeRegistration() {
    setLoading(true);
    setError("");
    try {
      await signup({
        name: name.trim(),
        phone: cleanPhone,
        email: email.trim() || undefined,
        password,
        role,
        buyerType: role === "buyer" ? buyerType : undefined,
        fpoProfile: role === "fpo" ? { orgName: orgName.trim() || name.trim() } : undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("auth.signupFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4.5rem)] flex items-center justify-center p-4 sm:p-6 lg:p-10">
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xl grid grid-cols-1 lg:grid-cols-12">
        {/* Left Visual Column */}
        <div className="relative hidden lg:flex lg:col-span-5 flex-col justify-between p-10 bg-[#0d261a] text-white">
          <div
            className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-30"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1000&auto=format&fit=crop&q=80')",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d261a] via-[#0d261a]/70 to-transparent" />

          {/* Brand header */}
          <div className="relative z-10">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-xl">
                🌾
              </div>
              <span
                className="text-2xl font-bold text-white tracking-tight"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                KrishiBazaar
              </span>
            </Link>
          </div>

          {/* Value props */}
          <div className="relative z-10 space-y-6 my-auto py-6">
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
              {t("auth.whyJoin")}
            </span>
            <div className="space-y-4 text-xs sm:text-sm text-emerald-100">
              <div className="flex items-start gap-3">
                <span className="text-emerald-400 font-bold text-base">✓</span>
                <p><strong>{t("auth.zeroCommission")}</strong> {t("auth.zeroCommissionDesc")}</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-emerald-400 font-bold text-base">✓</span>
                <p><strong>{t("auth.escrowSecurity")}</strong> {t("auth.escrowSecurityDesc")}</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-emerald-400 font-bold text-base">✓</span>
                <p><strong>{t("auth.otpVerifiedTitle")}</strong> {t("auth.otpVerifiedDesc")}</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-emerald-400 font-bold text-base">✓</span>
                <p><strong>{t("auth.traceableOrigins")}</strong> {t("auth.traceableOriginsDesc")}</p>
              </div>
            </div>
          </div>

          {/* Bottom badge */}
          <div className="relative z-10 text-xs text-emerald-300 font-medium border-t border-emerald-900/60 pt-4">
            🇮🇳 {t("auth.connectingFarmers")}
          </div>
        </div>

        {/* Right Form Column */}
        <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-center">
          <div className="mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              {t("auth.verifiedMarketplace")}
            </span>
            <h2
              className="mt-1 text-2xl sm:text-3xl font-black text-gray-900"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {t("auth.createYourAccount")}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-gray-500">
              {t("auth.signupSubtitle")}
            </p>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-4">
            {error && <ErrorMessage message={error} />}

            {/* Role Switcher Cards */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                {t("auth.iWantTo")}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setRole("farmer")}
                  className={`flex flex-col items-center sm:items-start p-3 rounded-2xl border text-left transition-all ${
                    role === "farmer"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span className="text-xl mb-1">🌾</span>
                  <span className="text-xs font-bold">{t("auth.sellAsFarmer")}</span>
                  <span className="text-[10px] text-gray-500 hidden sm:inline">
                    Individual farm producer
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole("fpo")}
                  className={`flex flex-col items-center sm:items-start p-3 rounded-2xl border text-left transition-all ${
                    role === "fpo"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span className="text-xl mb-1">🏢</span>
                  <span className="text-xs font-bold">FPO / Cooperative</span>
                  <span className="text-[10px] text-gray-500 hidden sm:inline">
                    Aggregate multi-farmer lots
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole("buyer")}
                  className={`flex flex-col items-center sm:items-start p-3 rounded-2xl border text-left transition-all ${
                    role === "buyer"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span className="text-xl mb-1">🧺</span>
                  <span className="text-xs font-bold">{t("auth.buyAsConsumer")}</span>
                  <span className="text-[10px] text-gray-500 hidden sm:inline">
                    Household or B2B buyer
                  </span>
                </button>
              </div>
            </div>

            {/* FPO Org Name (Only visible when role === 'fpo') */}
            {role === "fpo" && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 transition-all animate-fadeIn">
                <label className="block text-xs font-bold text-emerald-900 uppercase tracking-wider mb-1">
                  FPO / Cooperative Society Name *
                </label>
                <input
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Sahyadri Farmers Producer Co. Ltd"
                  className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-hidden"
                />
                <p className="text-[11px] text-emerald-700 mt-1">
                  You can onboard individual member farmers and pool lots under this organization.
                </p>
              </div>
            )}

            {/* Buyer Type Selection (Only visible when role === 'buyer') */}
            {role === "buyer" && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 transition-all animate-fadeIn">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-emerald-900">
                    {t("auth.whatTypeOfBuyer") || "What type of buyer are you?"}
                  </label>
                  <span className="text-[11px] text-emerald-700 font-medium">
                    {buyerType === "business" ? "🏢 B2B Procurement" : "🛒 Retail / Family"}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBuyerType("household")}
                    className={`flex flex-col p-3 rounded-xl border text-left transition-all ${
                      buyerType === "household"
                        ? "border-emerald-600 bg-white text-emerald-900 ring-2 ring-emerald-500/30 shadow-sm"
                        : "border-gray-200 bg-white/70 text-gray-600 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">🛒</span>
                      <span className="text-sm font-bold text-gray-900">
                        {t("auth.householdBuyer") || "Household Buyer"}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-tight">
                      {t("auth.householdBuyerDesc") || "Buying agricultural produce for personal or family consumption."}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBuyerType("business")}
                    className={`flex flex-col p-3 rounded-xl border text-left transition-all ${
                      buyerType === "business"
                        ? "border-emerald-600 bg-white text-emerald-900 ring-2 ring-emerald-500/30 shadow-sm"
                        : "border-gray-200 bg-white/70 text-gray-600 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">🏢</span>
                      <span className="text-sm font-bold text-gray-900">
                        {t("auth.businessBuyer") || "Business / Bulk Buyer"}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-tight">
                      {t("auth.businessBuyerDesc") || "Buying for a restaurant, hotel, retailer, catering, or wholesale."}
                    </p>
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Input
                  label={t("auth.fullName")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("auth.namePlaceholder")}
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                    {t("auth.mobileNumber")}
                  </label>
                  {isPhoneVerified && (
                    <span className="text-[11px] font-bold text-emerald-700">
                      {t("auth.otpVerified")}
                    </span>
                  )}
                </div>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setIsPhoneVerified(false);
                  }}
                  placeholder={t("auth.phonePlaceholder")}
                  required
                />
                {phone && !isPhoneValid && (
                  <p className="mt-1 text-[11px] text-red-500 font-medium">
                    {t("auth.phoneValidation")}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Input
                label={t("auth.emailOptional")}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth.emailPlaceholder")}
              />
            </div>

            <div>
              <Input
                label={t("auth.password")}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                hint={t("auth.passwordHint")}
                required
              />
              {password && (
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1 flex-1 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        password.length < 8
                          ? "w-1/3 bg-red-500"
                          : password.length < 12
                          ? "w-2/3 bg-amber-500"
                          : "w-full bg-emerald-500"
                      }`}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 font-medium">
                    {password.length < 8 ? t("auth.passwordWeak") : password.length < 12 ? t("auth.passwordGood") : t("auth.passwordStrong")}
                  </span>
                </div>
              )}
            </div>

            <Button
              type="submit"
              loading={loading}
              size="lg"
              className="mt-2 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-[var(--primary)] py-3.5 text-sm font-bold text-white shadow-md hover:from-emerald-500 hover:to-emerald-700"
            >
              {loading
                ? t("auth.creatingAccount")
                : isPhoneVerified
                ? t("auth.completeRegistration")
                : t("auth.verifyPhoneOtp")}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs sm:text-sm text-gray-600">
            {t("auth.alreadyHaveAccount")}{" "}
            <Link to="/login" className="font-bold text-emerald-700 hover:underline">
              {t("auth.signInLink")}
            </Link>
          </p>
        </div>
      </div>

      {/* OTP Verification Modal */}
      <OtpModal
        isOpen={showOtpModal}
        phone={cleanPhone}
        purpose="signup"
        onClose={() => setShowOtpModal(false)}
        onVerified={() => {
          setIsPhoneVerified(true);
          setShowOtpModal(false);
          completeRegistration();
        }}
        onSendOtp={handleSendOtp}
        onVerifyOtp={handleVerifyOtp}
      />
    </div>
  );
}
