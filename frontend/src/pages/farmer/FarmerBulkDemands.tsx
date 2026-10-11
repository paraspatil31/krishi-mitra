import { useState, useEffect } from "react";
import { Link } from "react-router";
import { BulkRequirement } from "@/types/bulkRequirement";
import bulkRequirementService from "@/services/bulkRequirement.service";
import FarmerQuotationModal from "@/components/farmer/FarmerQuotationModal";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";

const MAHARASHTRA_DISTRICTS = [
  "All Districts",
  "Ahmednagar",
  "Akola",
  "Amravati",
  "Chhatrapati Sambhajinagar",
  "Kolhapur",
  "Mumbai",
  "Nagpur",
  "Nashik",
  "Pune",
  "Sangli",
  "Satara",
  "Solapur",
  "Thane",
];

export default function FarmerBulkDemands() {
  const [requirements, setRequirements] = useState<BulkRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("All Districts");
  const [selectedReqForQuote, setSelectedReqForQuote] = useState<BulkRequirement | null>(null);

  useEffect(() => {
    loadOpenRequirements();
  }, []);

  async function loadOpenRequirements() {
    setLoading(true);
    try {
      const data = await bulkRequirementService.getOpenRequirements();
      setRequirements(data || []);
    } catch (err) {
      console.error("Failed to load open bulk requirements", err);
    } finally {
      setLoading(false);
    }
  }

  const filteredRequirements = requirements.filter((req) => {
    const matchesSearch =
      !search.trim() ||
      req.product.toLowerCase().includes(search.toLowerCase()) ||
      req.deliveryLocation.district.toLowerCase().includes(search.toLowerCase());

    const matchesDistrict =
      selectedDistrict === "All Districts" ||
      req.deliveryLocation.district.toLowerCase() === selectedDistrict.toLowerCase();

    return matchesSearch && matchesDistrict;
  });

  return (
    <DashboardLayout
      title="Commercial Bulk Demands & RFQs"
      subtitle="Browse verified wholesale demands and submit quotes directly"
    >
      <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0d261a] via-[#143d2b] to-[#0d261a] p-6 sm:p-10 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-400/30">
                🌾 Direct Commercial Procurement
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-medium text-amber-300">
                0% Middleman Fees
              </span>
            </div>
            <h1
              className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Commercial Bulk Demands & RFQs
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/80 max-w-2xl">
              Browse verified wholesale demands from hotels, restaurants, retail chains, and food processors. Submit direct quotations and negotiate harvest supply contracts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/farmer/dashboard"
              className="rounded-xl border border-emerald-400/40 px-4 py-2.5 text-xs font-bold text-emerald-100 hover:bg-emerald-800/40 transition-colors"
            >
              ← Back to Farmer Hub
            </Link>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by produce name (e.g. Onion, Tomato, Wheat) or district..."
          />
        </div>
        <div className="w-full sm:w-64">
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-emerald-600 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
          >
            {MAHARASHTRA_DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <Button
          onClick={loadOpenRequirements}
          variant="outline"
          className="shrink-0 text-xs px-4 py-2.5 rounded-xl border-gray-300 hover:bg-gray-50"
        >
          🔄 Refresh
        </Button>
      </div>

      {/* Demands Grid */}
      {loading ? (
        <div className="py-20 text-center text-gray-400">Loading open commercial bulk demands...</div>
      ) : filteredRequirements.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-gray-200 rounded-3xl space-y-3">
          <span className="text-4xl">📋</span>
          <h3 className="text-base font-bold text-gray-800">No matching bulk demands right now</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Try clearing search filters or check back shortly as business buyers broadcast new wholesale RFQs daily.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRequirements.map((req) => {
            const buyer = typeof req.buyerId === "object" ? req.buyerId : null;
            const businessName = buyer?.businessProfile?.businessName || buyer?.name || "Commercial Buyer";
            const businessType = buyer?.businessProfile?.businessType || "B2B Enterprise";

            return (
              <div
                key={req.id}
                className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs hover:border-emerald-400 hover:shadow-lg transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Buyer & Type Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {businessType}
                      </span>
                      <h4 className="text-sm font-black text-gray-900 mt-1">{businessName}</h4>
                    </div>
                    <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                      Verified Buyer
                    </span>
                  </div>

                  {/* Produce & Quantity */}
                  <div>
                    <h3 className="text-lg font-black text-gray-900">{req.product}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-base font-black text-emerald-700">
                        {req.quantity} {req.unit.toUpperCase()}
                      </span>
                      {req.targetPricePerUnit && (
                        <span className="text-xs text-gray-500 font-medium">
                          (Target: ₹{req.targetPricePerUnit.toLocaleString()} / {req.unit})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Details Strip */}
                  <div className="rounded-xl bg-gray-50 p-3 text-[11px] text-gray-600 space-y-1.5">
                    <p className="flex items-center justify-between">
                      <span>Required By:</span>
                      <strong className="text-gray-900">{req.requiredByDate}</strong>
                    </p>
                    <p className="flex items-center justify-between">
                      <span>Delivery Hub:</span>
                      <strong className="text-gray-900">{req.deliveryLocation.district}, {req.deliveryLocation.state}</strong>
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">
                      📍 {req.deliveryLocation.address}
                    </p>
                  </div>

                  {/* Notes / Specs */}
                  {req.notes && (
                    <div className="text-xs text-gray-600 italic bg-amber-50/60 border border-amber-100 rounded-xl p-2.5">
                      "{req.notes}"
                    </div>
                  )}

                  <div className="text-[11px] text-gray-500 font-medium">
                    🌾 Quotes Received: <strong>{req.quotationsCount || 0}</strong>
                  </div>
                </div>

                {/* Submit Quotation Action */}
                <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
                  <Button
                    onClick={() => setSelectedReqForQuote(req)}
                    className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl py-2.5 text-xs shadow-xs"
                  >
                    📝 Submit Quotation
                  </Button>
                  {buyer?.phone && (
                    <a
                      href={`tel:${buyer.phone}`}
                      className="p-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-emerald-700 text-xs font-bold shrink-0 transition-colors"
                      title="Call Buyer"
                    >
                      📞
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Farmer Quotation Modal */}
      <FarmerQuotationModal
        isOpen={!!selectedReqForQuote}
        requirement={selectedReqForQuote}
        onClose={() => setSelectedReqForQuote(null)}
        onQuoted={loadOpenRequirements}
      />
      </div>
    </DashboardLayout>
  );
}
