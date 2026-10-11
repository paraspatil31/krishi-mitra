import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { mandiService } from "@/services/mandi.service";
import type { MandiBenchmark } from "@/types/mandi";

interface MandiBenchmarkBadgeProps {
  cropName: string;
  district?: string;
  className?: string;
  showLink?: boolean;
}

export default function MandiBenchmarkBadge({
  cropName,
  district,
  className = "",
  showLink = true,
}: MandiBenchmarkBadgeProps) {
  const { t } = useTranslation();
  const [benchmark, setBenchmark] = useState<MandiBenchmark | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cropName) return;
    let isMounted = true;
    mandiService
      .getBenchmark(cropName, district)
      .then((data) => {
        if (isMounted) setBenchmark(data);
      })
      .catch(() => {
        if (isMounted) setBenchmark(null);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [cropName, district]);

  if (loading || !benchmark) return null;

  const content = (
    <div
      className={`inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50/80 px-2.5 py-1 text-xs text-amber-900 shadow-xs ${className}`}
      title={`Official Mandi benchmark from ${benchmark.marketName} on ${benchmark.priceDate}`}
    >
      <span className="text-sm">⚖️</span>
      <span className="font-semibold">
        {t("mandi.benchmark")}:{" "}
        <strong className="text-amber-950">
          ₹{benchmark.suggestedPricePerKg}
          {benchmark.modalPricePerQuintal ? "/kg" : `/${benchmark.unit}`}
        </strong>
      </span>
      <span className="text-[10px] text-amber-700/80">({benchmark.marketName.split(" ")[0]})</span>
    </div>
  );

  if (showLink) {
    return (
      <Link to="/mandi-prices" className="hover:opacity-80 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}
