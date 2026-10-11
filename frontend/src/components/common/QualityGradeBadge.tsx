import { useTranslation } from "react-i18next";

interface QualityGradeBadgeProps {
  grade?: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export default function QualityGradeBadge({
  grade = "A",
  size = "md",
  showLabel = true,
}: QualityGradeBadgeProps) {
  const { t } = useTranslation();
  const normalized = (grade || "A").toUpperCase();

  let config = {
    color: "bg-emerald-100 text-emerald-800 border-emerald-300",
    icon: "🌟",
    title: t("badges.gradeA"),
    desc: t("badges.gradeATooltip"),
    tag: t("badges.gradeAPremium"),
  };

  if (normalized === "B") {
    config = {
      color: "bg-sky-100 text-sky-800 border-sky-300",
      icon: "🌿",
      title: t("badges.gradeB"),
      desc: t("badges.gradeBTooltip"),
      tag: t("badges.gradeBStandard"),
    };
  } else if (normalized === "C") {
    config = {
      color: "bg-amber-100 text-amber-800 border-amber-300",
      icon: "🌾",
      title: t("badges.gradeC"),
      desc: t("badges.gradeCTooltip"),
      tag: t("badges.gradeCProcessing"),
    };
  }

  const sizeClasses = {
    sm: "text-[10px] px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5",
    lg: "text-sm px-3.5 py-1.5 gap-2",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-bold border shadow-2xs ${config.color} ${sizeClasses[size]} transition-transform hover:scale-102 select-none`}
      title={`${config.title}: ${config.desc}`}
    >
      <span>{config.icon}</span>
      <span>{config.title}</span>
      {showLabel && size !== "sm" && (
        <span className="opacity-75 font-medium hidden sm:inline">
          ({config.tag})
        </span>
      )}
    </span>
  );
}
