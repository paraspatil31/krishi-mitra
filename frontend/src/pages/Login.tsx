import { useState, type FormEvent } from "react";
import { Link, useNavigate, useLocation, Navigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import ErrorMessage from "@/components/common/ErrorMessage";
import OtpModal from "@/components/auth/OtpModal";
import { api } from "@/services/api";

export default function Login() {
  const { t } = useTranslation();
  const { login, isAuthenticated, user, refreshUser, setSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: Location })?.from?.pathname;
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);

  if (isAuthenticated && user) {
    const destination =
      from ??
      (user.role === "farmer"
        ? "/farmer/dashboard"
        : user.role === "fpo"
        ? "/fpo/dashboard"
        : user.role === "admin"
        ? "/admin/dashboard"
        : "/buyer/dashboard");
    return <Navigate to={destination} replace />;
  }

  const cleanPhone = phone.trim().replace(/[\s\-()]/g, "").slice(-10);
  const isPhoneValid = /^[6-9]\d{9}$/.test(cleanPhone);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!isPhoneValid) {
      setError(t("auth.phoneRequired"));
      return;
    }
    if (!password) {
      setError(t("auth.passwordRequired"));
      return;
    }
    setLoading(true);
    try {
      await login({ phone: cleanPhone, password });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("auth.loginFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOtp(phoneNumber: string) {
    const res = await api.post<{ data: { mockOtp?: string } }>("/auth/otp/send", {
      phone: phoneNumber,
      purpose: "login",
    });
    return res.data || {};
  }

  async function handleVerifyOtp(phoneNumber: string, code: string) {
    const res = await api.post<{ data: any }>("/auth/otp/verify", {
      phone: phoneNumber,
      otp: code,
      purpose: "login",
    });

    if (res.data?.accessToken && res.data?.user) {
      setSession(res.data.user, res.data.accessToken);
    } else if (res.data?.accessToken) {
      await refreshUser();
    }
    return res;
  }

  return (
    <div className="min-h-[calc(100vh-4.5rem)] flex items-center justify-center p-4 sm:p-6 lg:p-10">
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xl grid grid-cols-1 lg:grid-cols-12">
        {/* Left Visual Column */}
        <div className="relative hidden lg:flex lg:col-span-6 flex-col justify-between p-10 bg-[#0d261a] text-white">
          <div
            className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-40"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1000&auto=format&fit=crop&q=80')",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d261a] via-[#0d261a]/60 to-transparent" />

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

          {/* Quote & Value Proposition */}
          <div className="relative z-10 space-y-4 my-auto py-8">
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
              {t("auth.welcomeBack")}
            </span>
            <h3
              className="text-2xl font-bold leading-snug text-white"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              &quot;{t("auth.loginQuote")}&quot;
            </h3>
            <p className="text-xs text-emerald-200">
              {t("auth.instantLogin")}
            </p>
          </div>

          {/* Bottom badge */}
          <div className="relative z-10 text-xs text-emerald-300 font-medium border-t border-emerald-900/60 pt-4">
            🔒 {t("auth.secureEncryption")}
          </div>
        </div>

        {/* Right Form Column */}
        <div className="lg:col-span-6 p-6 sm:p-10 lg:p-12 flex flex-col justify-center">
          <div className="mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              {t("auth.farmerBuyerPortal")}
            </span>
            <h2
              className="mt-1 text-2xl sm:text-3xl font-black text-gray-900"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {t("auth.signIn")}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-gray-500">
              {t("auth.loginSubtitle")}
            </p>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-4">
            {error && <ErrorMessage message={error} />}

            <div>
              <Input
                label={t("auth.mobileNumber")}
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t("auth.phonePlaceholder")}
                required
              />
              {phone && !isPhoneValid && (
                <p className="mt-1 text-[11px] text-red-500 font-medium">
                  {t("auth.phoneValidation")}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  {t("auth.password")}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (!isPhoneValid) {
                      setError(t("auth.otpPhoneRequired"));
                      return;
                    }
                    setError("");
                    setShowOtpModal(true);
                  }}
                  className="text-xs font-semibold text-emerald-700 hover:underline"
                >
                  {t("auth.signInViaOtp")}
                </button>
              </div>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <Button
              type="submit"
              loading={loading}
              size="lg"
              className="mt-2 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-[var(--primary)] py-3.5 text-sm font-bold text-white shadow-md hover:from-emerald-500 hover:to-emerald-700"
            >
              {loading ? t("auth.signingIn") : t("auth.signInWithPassword")}
            </Button>

            {/* Quick OTP Sign In Secondary Button */}
            <button
              type="button"
              onClick={() => {
                if (!isPhoneValid) {
                  setError(t("auth.otpPhoneRequired"));
                  return;
                }
                setError("");
                setShowOtpModal(true);
              }}
              className="w-full py-3 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-800 font-semibold text-xs transition flex items-center justify-center gap-2"
            >
              <span>📲</span>
              <span>{t("auth.fastOtpSignIn")}</span>
            </button>
          </form>

          <p className="mt-8 text-center text-xs sm:text-sm text-gray-600">
            {t("auth.noAccount")}{" "}
            <Link to="/signup" className="font-bold text-emerald-700 hover:underline">
              {t("auth.createAccount")}
            </Link>
          </p>
        </div>
      </div>

      {/* OTP Login Modal */}
      <OtpModal
        isOpen={showOtpModal}
        phone={cleanPhone}
        purpose="login"
        onClose={() => setShowOtpModal(false)}
        onVerified={() => {
          setShowOtpModal(false);
          refreshUser().then(() => {
            navigate(from ?? "/");
          });
        }}
        onSendOtp={handleSendOtp}
        onVerifyOtp={handleVerifyOtp}
      />
    </div>
  );
}
