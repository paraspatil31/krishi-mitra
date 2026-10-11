import { useState } from "react";
import ProvenanceModal from "@/components/listings/ProvenanceModal";

interface ProvenanceBadgeProps {
  listingId: string;
  cropName: string;
  qualityGrade?: string;
  variant?: "pill" | "card" | "banner";
  className?: string;
}

export default function ProvenanceBadge({
  listingId,
  cropName,
  qualityGrade = "A",
  variant = "pill",
  className = "",
}: ProvenanceBadgeProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (variant === "card") {
    return (
      <>
        <div
          onClick={() => setIsModalOpen(true)}
          className={`group relative overflow-hidden rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/60 via-teal-50/30 to-amber-50/30 p-4 shadow-xs transition-all hover:border-emerald-400 hover:shadow-md cursor-pointer ${className}`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs group-hover:scale-105 transition-transform">
                <span className="text-base">🔗</span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-900">
                    Blockchain Provenance
                  </span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.2 text-[10px] font-bold text-emerald-800">
                    Grade {qualityGrade}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500">
                  Immutable farm-gate harvest certificate &bull; Polygon Amoy
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-700 group-hover:translate-x-0.5 transition-transform">
              Verify ➜
            </span>
          </div>
        </div>

        <ProvenanceModal
          isOpen={isModalOpen}
          listingId={listingId}
          cropName={cropName}
          onClose={() => setIsModalOpen(false)}
        />
      </>
    );
  }

  // Default "pill" variant
  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50/80 px-3 py-1 text-xs font-bold text-emerald-900 shadow-xs hover:bg-emerald-100 hover:border-emerald-400 transition-all cursor-pointer ${className}`}
        title="View cryptographic farm-gate provenance certificate"
      >
        <span className="text-emerald-700">🔗</span>
        <span>Blockchain Verified</span>
        <span className="rounded-full bg-emerald-200/70 px-1.5 py-0.2 text-[10px] font-black text-emerald-900">
          Grade {qualityGrade}
        </span>
      </button>

      <ProvenanceModal
        isOpen={isModalOpen}
        listingId={listingId}
        cropName={cropName}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
