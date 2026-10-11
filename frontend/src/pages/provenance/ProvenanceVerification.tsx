import { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ledgerService } from "@/services/ledger.service";
import type { ProvenanceDetails } from "@/types/ledger";

export default function ProvenanceVerification() {
  const { listingId } = useParams<{ listingId: string }>();
  const { t } = useTranslation();

  const [provenance, setProvenance] = useState<ProvenanceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!listingId) {
      setError("No listing ID specified in URL");
      setLoading(false);
      return;
    }

    async function loadProvenance() {
      try {
        setLoading(true);
        setError(null);
        const data = await ledgerService.getProvenance(listingId!);
        setProvenance(data);
      } catch (err: any) {
        console.error("Failed to load blockchain provenance:", err);
        setError(
          err.response?.data?.message ||
            "Unable to verify cryptographic provenance record for this produce batch."
        );
      } finally {
        setLoading(false);
      }
    }

    loadProvenance();
  }, [listingId]);

  const copyHash = () => {
    if (provenance?.txHash) {
      navigator.clipboard.writeText(provenance.txHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const printCertificate = () => {
    window.print();
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    window.location.href
  )}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="rounded-3xl bg-white p-8 shadow-xl border border-gray-200 text-center max-w-sm w-full space-y-4">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-emerald-50 text-3xl animate-bounce">
            🔗
          </div>
          <h2 className="text-lg font-black text-gray-900">
            Querying Provenance Ledger...
          </h2>
          <p className="text-xs text-gray-500">
            Verifying cryptographic harvest records on Polygon Amoy PoS network.
          </p>
          <div className="h-1.5 w-full bg-emerald-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-600 rounded-full animate-pulse w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !provenance) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="rounded-3xl bg-white p-8 shadow-xl border border-red-200 text-center max-w-md w-full space-y-4">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-red-50 text-3xl">
            ⚠️
          </div>
          <h2 className="text-xl font-black text-gray-900">
            Verification Notice
          </h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            {error || "Provenance certificate could not be resolved."}
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
            <Link
              to="/products"
              className="rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 transition"
            >
              Browse Verified Marketplace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const daysSinceHarvest = Math.max(
    0,
    Math.floor(
      (new Date().getTime() - new Date(provenance.harvestDate).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 print:bg-white print:p-0">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Verification Status Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-emerald-900 text-white p-4 shadow-lg print:hidden">
          <div className="flex items-center gap-2.5">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
            <span className="text-xs font-bold tracking-wide uppercase text-emerald-200">
              Polygon Amoy PoS &bull; Ledger Verified
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={printCertificate}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-semibold text-white border border-white/20 transition cursor-pointer"
            >
              <span>🖨️</span>
              <span>Print Certificate</span>
            </button>
            <Link
              to={`/products/${provenance.listingId}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 text-xs font-bold text-emerald-950 transition"
            >
              <span>Marketplace</span>
              <span>➜</span>
            </Link>
          </div>
        </div>

        {/* Certificate Container (Printable Paper Style) */}
        <div className="relative overflow-hidden rounded-3xl bg-white p-6 sm:p-10 shadow-2xl border border-amber-200/90 print:border-none print:shadow-none">
          {/* Certificate Guilloche Decorative Header Line */}
          <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-emerald-700 via-amber-500 to-emerald-700" />

          {/* Certificate Seal & Title Header */}
          <div className="text-center space-y-2 border-b border-amber-100 pb-6">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-emerald-100 border border-amber-300 shadow-sm text-3xl mb-1">
              📜
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="h-px w-10 bg-amber-300" />
              <span className="text-[11px] font-black uppercase tracking-widest text-amber-800">
                KrishiBazaar Trust Ledger
              </span>
              <span className="h-px w-10 bg-amber-300" />
            </div>
            <h1
              className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Produce Provenance Certificate
            </h1>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Cryptographic harvest origin certification issued directly at the farm gate.
              Tamper-proof on-chain verification for buyers and consumers.
            </p>
          </div>

          {/* Main Certificate Grid */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Left QR Code Container */}
            <div className="md:col-span-4 flex flex-col items-center justify-center p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-3">
              <div className="bg-white p-2.5 rounded-xl shadow-sm border border-gray-200">
                <img
                  src={qrCodeUrl}
                  alt="Farm Gate QR Code"
                  className="h-36 w-36 object-contain"
                />
              </div>
              <div className="text-center">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-900 border border-emerald-300">
                  ✓ Verified Farm Gate
                </span>
                <p className="text-[10px] text-gray-400 mt-1">
                  Scan to verify on any mobile device
                </p>
              </div>
            </div>

            {/* Right Crop & Farmer Details */}
            <div className="md:col-span-8 space-y-4">
              <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    Certified Commodity
                  </span>
                  <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                    <span>{provenance.cropName}</span>
                    <span className="text-xs font-semibold text-gray-500">
                      ({provenance.category})
                    </span>
                  </h2>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-900 border border-emerald-300 shadow-xs">
                  {provenance.qualityTag}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-400 font-medium">Certified Farmer:</span>
                  <p className="font-bold text-gray-900 text-sm mt-0.5">
                    {provenance.farmerName}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400 font-medium">Farm Origin:</span>
                  <p className="font-bold text-gray-900 text-sm mt-0.5">
                    📍 {provenance.district || "Maharashtra, India"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400 font-medium">Harvest Date:</span>
                  <p className="font-bold text-gray-900 text-sm mt-0.5">
                    📅 {new Date(provenance.harvestDate).toLocaleDateString("en-IN", {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400 font-medium">Batch Freshness:</span>
                  <p className="font-bold text-emerald-700 text-sm mt-0.5">
                    🌱 {daysSinceHarvest === 0 ? "Harvested Today!" : `${daysSinceHarvest} day${daysSinceHarvest > 1 ? "s" : ""} fresh`}
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3 flex justify-between text-xs text-gray-500">
                <span>Lot Volume: <strong>{provenance.quantity} {provenance.unit}</strong></span>
                <span>Audit Batch: <strong className="font-mono">{provenance.listingId.slice(-8).toUpperCase()}</strong></span>
              </div>
            </div>
          </div>

          {/* Cryptographic Proof Card */}
          <div className="mt-8 rounded-2xl bg-slate-900 text-white p-5 space-y-3 shadow-inner">
            <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
              <span className="font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <span>⚡</span> Cryptographic Provenance Ledger Proof
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Block #{provenance.blockNumber}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Transaction Hash (SHA-256):</span>
                <button
                  onClick={copyHash}
                  className="text-emerald-400 hover:text-emerald-300 font-bold transition cursor-pointer"
                >
                  {copied ? "✓ Copied!" : "Copy Hash"}
                </button>
              </div>
              <div className="rounded-xl bg-black/50 p-2.5 font-mono text-[11px] text-emerald-300 break-all select-all border border-slate-800">
                {provenance.txHash}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-400">
              <span>Network: <strong className="text-slate-200">{provenance.network}</strong></span>
              <span>Timestamp: <strong className="text-slate-200">{new Date(provenance.verifiedAt).toLocaleString("en-IN")}</strong></span>
              <a
                href={provenance.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:underline flex items-center gap-1 print:hidden"
              >
                <span>View on PolygonScan</span>
                <span>↗</span>
              </a>
            </div>
          </div>

          {/* Guarantee & Watermark */}
          <div className="mt-8 border-t border-amber-100 pt-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
            <p className="text-center sm:text-left leading-relaxed max-w-md">
              🛡️ <strong>Immutable Verification Guarantee:</strong> This record was signed cryptographically when the produce was registered. Harvest date and origin can never be modified retroactively.
            </p>
            <div className="text-right font-serif text-amber-900/60 italic font-bold">
              KrishiBazaar Digital Seal
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center print:hidden">
          <Link
            to={`/products/${provenance.listingId}`}
            className="text-xs font-bold text-gray-500 hover:text-emerald-700 transition"
          >
            ← Back to Produce Listing
          </Link>
        </div>
      </div>
    </div>
  );
}
