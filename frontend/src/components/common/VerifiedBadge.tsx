import { useTranslation } from "react-i18next";

interface VerifiedBadgeProps {
  type?: "buyer" | "farmer" | "produce";
  className?: string;
  showText?: boolean;
}

export default function VerifiedBadge({
  type = "buyer",
  className = "",
  showText = true,
}: VerifiedBadgeProps) {
  const { t } = useTranslation();

  if (type === "buyer") {
    return (
      <span
        title="Admin-Verified Direct Buyer (Identity & Payment Trust Verified)"
        className={`inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs font-semibold text-blue-700 shadow-sm ${className}`}
      >
        <span className="text-blue-600 font-bold">🛡️</span>
        {showText && <span>{t("badges.verifiedBuyer")}</span>}
      </span>
    );
  }

  if (type === "farmer") {
    return (
      <span
        title="Verified Primary Agricultural Producer (Farm Gate Authentic)"
        className={`inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-semibold text-emerald-800 shadow-sm ${className}`}
      >
        <span className="text-emerald-600 font-bold">🌾</span>
        {showText && <span>{t("badges.verifiedFarmer")}</span>}
      </span>
    );
  }

  return (
    <span
      title="Cryptographic Ledger Verified Origin"
      className={`inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-800 shadow-sm ${className}`}
    >
      <span className="text-amber-600 font-bold">📜</span>
      {showText && <span>{t("badges.provenanceVerified")}</span>}
    </span>
  );
}
