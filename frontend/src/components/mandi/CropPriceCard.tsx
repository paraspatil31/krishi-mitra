import type { CropMarketSummary } from "@/types/mandi";

const CROP_ICONS: Record<string, string> = {
  Tomato: "🍅",
  Onion: "🧅",
  Potato: "🥔",
  Wheat: "🌾",
  Soybean: "🌱",
  Grapes: "🍇",
  "Alphonso Mango": "🥭",
  Pomegranate: "🍎",
  Cotton: "☁️",
  Ginger: "🫚",
};

interface CropPriceCardProps {
  crop: CropMarketSummary;
  isSelected?: boolean;
  onSelect: (cropName: string) => void;
}

export default function CropPriceCard({
  crop,
  isSelected = false,
  onSelect,
}: CropPriceCardProps) {
  const icon = CROP_ICONS[crop.cropName] || "🌿";
  const isPerQuintal = crop.unit.toLowerCase().includes("quintal");
  const perKg = isPerQuintal ? (crop.modalPrice / 100).toFixed(1) : null;

  return (
    <div
      onClick={() => onSelect(crop.cropName)}
      className={`group relative cursor-pointer overflow-hidden rounded-3xl border p-5 transition-all duration-200 card-hover-lift select-none ${
        isSelected
          ? "border-emerald-600 bg-gradient-to-br from-emerald-500/10 via-white to-emerald-500/5 shadow-md ring-2 ring-emerald-500"
          : "border-gray-200/80 bg-white hover:border-emerald-300 shadow-xs"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 border border-gray-100 text-2xl group-hover:scale-110 transition-transform">
            {icon}
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-base">{crop.cropName}</h4>
            <p className="text-xs text-gray-500 truncate max-w-[140px]" title={crop.topMarket}>
              📍 {crop.topMarket}
            </p>
          </div>
        </div>

        {isSelected && (
          <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-extrabold text-white">
            Active
          </span>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 flex items-baseline justify-between">
        <div>
          <span className="text-2xl font-black text-gray-900">
            ₹{crop.modalPrice.toLocaleString("en-IN")}
          </span>
          <span className="text-xs text-gray-500 ml-1">/{crop.unit}</span>
        </div>

        {perKg && (
          <div className="text-right">
            <span className="rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-bold text-emerald-800">
              ~₹{perKg}/kg
            </span>
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
        <span>Spread: ₹{crop.minPrice} – ₹{crop.maxPrice}</span>
        <span className="group-hover:text-emerald-700 font-semibold transition-colors">
          View Trend &rarr;
        </span>
      </div>
    </div>
  );
}
