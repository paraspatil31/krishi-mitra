import { useState, useEffect, useRef } from "react";
import Button from "../common/Button";

interface OtpModalProps {
  isOpen: boolean;
  phone: string;
  purpose?: "signup" | "login" | "verify_phone";
  onClose: () => void;
  onVerified: (phone: string) => void;
  onSendOtp: (phone: string) => Promise<{ mockOtp?: string }>;
  onVerifyOtp: (phone: string, otp: string) => Promise<any>;
}

export default function OtpModal({
  isOpen,
  phone,
  purpose = "verify_phone",
  onClose,
  onVerified,
  onSendOtp,
  onVerifyOtp,
}: OtpModalProps) {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [mockCode, setMockCode] = useState("123456");
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isOpen) {
      setDigits(["", "", "", "", "", ""]);
      setError("");
      setResendTimer(30);
      inputsRef.current[0]?.focus();

      // Trigger initial send
      onSendOtp(phone)
        .then((res) => {
          if (res?.mockOtp) setMockCode(res.mockOtp);
        })
        .catch((err) => {
          setError(err?.message || "Failed to dispatch verification code");
        });
    }
  }, [isOpen, phone]);

  useEffect(() => {
    if (!isOpen || resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, resendTimer]);

  if (!isOpen) return null;

  function handleChange(idx: number, val: string) {
    const clean = val.replace(/\D/g, "");
    if (!clean) {
      const next = [...digits];
      next[idx] = "";
      setDigits(next);
      return;
    }

    // Single digit entry or pasted string
    if (clean.length > 1) {
      const chars = clean.slice(0, 6).split("");
      const next = [...digits];
      chars.forEach((c, i) => {
        if (i < 6) next[i] = c;
      });
      setDigits(next);
      const targetIdx = Math.min(chars.length, 5);
      inputsRef.current[targetIdx]?.focus();
      return;
    }

    const next = [...digits];
    next[idx] = clean;
    setDigits(next);

    // Auto-advance to next input box
    if (idx < 5) {
      inputsRef.current[idx + 1]?.focus();
    }
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
    }
  }

  async function handleVerify(otpToUse?: string) {
    const fullOtp = otpToUse || digits.join("");
    if (fullOtp.length !== 6) {
      setError("Please enter all 6 digits of the OTP code");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await onVerifyOtp(phone, fullOtp);
      onVerified(phone);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Invalid OTP code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendTimer > 0) return;
    setDigits(["", "", "", "", "", ""]);
    setError("");
    setResendTimer(30);
    try {
      const res = await onSendOtp(phone);
      if (res?.mockOtp) setMockCode(res.mockOtp);
      inputsRef.current[0]?.focus();
    } catch (err: any) {
      setError(err?.message || "Failed to resend code");
    }
  }

  function autoFillMock() {
    const chars = mockCode.split("");
    setDigits(chars);
    handleVerify(mockCode);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl border border-emerald-100 p-6 sm:p-8">
        {/* Header Icon */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl border border-emerald-200/60 shadow-sm text-emerald-700 mb-4">
          📲
        </div>

        <div className="text-center space-y-1.5">
          <h3
            className="text-xl font-bold text-gray-900 tracking-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Verify Mobile Number
          </h3>
          <p className="text-sm text-gray-600">
            We sent a 6-digit verification code to:
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
            <span>🇮🇳 +91-{phone.slice(-10)}</span>
          </div>
        </div>

        {/* Development Mock Helper Banner */}
        <div className="mt-4 p-3 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-amber-600 font-bold text-sm">⚡</span>
            <div>
              <span className="font-semibold text-amber-900">Dev Sandbox Mode:</span>
              <p className="text-amber-700">Code is <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold text-amber-900">{mockCode}</code></p>
            </div>
          </div>
          <button
            type="button"
            onClick={autoFillMock}
            className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-sm transition"
          >
            Auto-Fill
          </button>
        </div>

        {/* 6 Digit Input Boxes */}
        <div className="mt-6 flex justify-center gap-2 sm:gap-3">
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => { inputsRef.current[idx] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              className="h-12 w-11 sm:h-14 sm:w-12 rounded-xl border-2 border-gray-200 text-center text-xl font-bold text-gray-900 focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-600/10 transition"
            />
          ))}
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-2.5 text-xs text-red-700 font-medium text-center">
            ⚠️ {error}
          </div>
        )}

        {/* Submit Button */}
        <div className="mt-6 space-y-3">
          <Button
            type="button"
            onClick={() => handleVerify()}
            disabled={loading || digits.join("").length !== 6}
            className="w-full justify-center py-3 text-base shadow-md font-semibold"
          >
            {loading ? "Verifying Code..." : "Confirm & Verify Number"}
          </Button>

          {/* Resend & Cancel */}
          <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="font-medium text-gray-500 hover:text-gray-700 hover:underline"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={resendTimer > 0}
              onClick={handleResend}
              className={`font-semibold ${
                resendTimer > 0
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-emerald-700 hover:underline"
              }`}
            >
              {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Resend OTP"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
