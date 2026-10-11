import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "@/context/AuthContext";
import { BulkRequirement, BulkRequirementStatus } from "@/types/bulkRequirement";
import bulkRequirementService from "@/services/bulkRequirement.service";
import BusinessProfileModal from "@/components/business/BusinessProfileModal";
import CreateBulkRequirementModal from "@/components/business/CreateBulkRequirementModal";
import Button from "@/components/common/Button";

export default function BusinessDashboard() {
  const { user, updateBuyerType } = useAuth();
  const navigate = useNavigate();

  const [requirements, setRequirements] = useState<BulkRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<BulkRequirementStatus | "all">("all");
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showRfqModal, setShowRfqModal] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(false);

  useEffect(() => {
    loadRequirements();
  }, [statusFilter]);

  async function loadRequirements() {
    setLoading(true);
    try {
      const data = await bulkRequirementService.getMyRequirements(
        statusFilter === "all" ? undefined : statusFilter
      );
      setRequirements(data);
    } catch (err) {
      console.error("Failed to load RFQs", err);
    } finally {
      setLoading(false);
    }
  }

  const [expandedQuotes, setExpandedQuotes] = useState<Record<string, boolean>>({});

  function handleOpenRfqModal() {
    if (!user?.businessProfile?.businessName?.trim() || !user?.businessProfile?.businessAddress?.trim()) {
      setShowProfileModal(true);
      return;
    }
    setShowRfqModal(true);
  }

  function toggleQuotes(reqId: string) {
    setExpandedQuotes((prev) => ({ ...prev, [reqId]: !prev[reqId] }));
  }

  async function handleStatusChange(id: string, newStatus: BulkRequirementStatus) {
    try {
      await bulkRequirementService.updateStatus(id, newStatus);
      loadRequirements();
    } catch (err) {
      console.error("Failed to update status", err);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to delete this procurement requirement?")) return;
    try {
      await bulkRequirementService.deleteRequirement(id);
      loadRequirements();
    } catch (err) {
      console.error("Failed to delete requirement", err);
    }
  }

  async function handleSwitchToHousehold() {
    if (
      !window.confirm(
        "Switch to Household Buyer mode? You can switch back anytime. Your bulk RFQ data will be safely preserved."
      )
    ) {
      return;
    }

    setSwitchingRole(true);
    try {
      await updateBuyerType("household");
      navigate("/buyer/dashboard");
    } catch (err) {
      console.error("Failed to switch buyer type", err);
      setSwitchingRole(false);
    }
  }

  const openCount = requirements.filter((r) => r.status === "open").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0d261a] via-[#123826] to-[#0d261a] p-6 sm:p-10 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-400/30">
                🏢 Business / Bulk Procurement Desk
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-medium text-amber-300">
                B2B Wholesale
              </span>
            </div>
            <h1
              className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {user?.businessProfile?.businessName || user?.name}
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/80 max-w-2xl">
              Procure farm-fresh crops in bulk volumes directly from certified farmers. Leverage APMC wholesale market intelligence, nearby haats, and cold storage networks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleOpenRfqModal}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg px-5 py-2.5 text-sm"
            >
              + Post Bulk RFQ
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowProfileModal(true)}
              className="border-emerald-400/40 text-emerald-100 hover:bg-emerald-800/40 rounded-xl px-4 py-2.5 text-sm"
            >
              ⚙️ {user?.businessProfile?.businessName ? "Edit Business Profile" : "Setup Business Profile"}
            </Button>
            <button
              onClick={handleSwitchToHousehold}
              disabled={switchingRole}
              className="text-xs text-emerald-300/80 hover:text-emerald-200 underline font-medium px-2 py-1"
            >
              Switch to Household Mode
            </button>
          </div>
        </div>
      </div>

      {/* Mandatory Business Profile Incompletion Warning */}
      {(!user?.businessProfile?.businessName || !user?.businessProfile?.businessAddress) && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-fadeIn">
          <div className="flex items-start sm:items-center gap-3.5">
            <span className="text-3xl">⚠️</span>
            <div>
              <h4 className="text-sm font-bold text-amber-950">Business Profile Incomplete</h4>
              <p className="text-xs text-amber-800 mt-0.5">
                Please complete your Business Name and Warehouse/Delivery Address before posting commercial RFQ demands.
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowProfileModal(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shrink-0 shadow-xs"
          >
            Complete Business Profile Now →
          </Button>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Active RFQs</p>
            <p className="mt-1 text-2xl font-black text-gray-900">{openCount}</p>
            <p className="text-[11px] text-emerald-600 font-medium">Open for producer quotes</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-2xl text-emerald-700">
            📋
          </div>
        </div>

        <Link
          to="/mandi-prices"
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all flex items-center justify-between group"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Mandi Price Index</p>
            <p className="mt-1 text-base font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
              Agmarknet Rates →
            </p>
            <p className="text-[11px] text-gray-500">14-day APMC trend intelligence</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-2xl text-amber-700">
            📊
          </div>
        </Link>

        <Link
          to="/markets/nearby"
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all flex items-center justify-between group"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Nearby Mandis</p>
            <p className="mt-1 text-base font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
              APMC & Haats Map →
            </p>
            <p className="text-[11px] text-gray-500">Interactive distance & e-NAM finder</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-700">
            📍
          </div>
        </Link>

        <Link
          to="/storage-facilities"
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all flex items-center justify-between group"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Cold Storage Units</p>
            <p className="mt-1 text-base font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
              Storage Directory →
            </p>
            <p className="text-[11px] text-gray-500">Certified dry & cold warehouses</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-2xl text-cyan-700">
            ❄️
          </div>
        </Link>
      </div>

      {/* RFQ Management Section */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2
              className="text-xl sm:text-2xl font-black text-gray-900"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              My Bulk Procurement Requests (RFQs)
            </h2>
            <p className="text-xs sm:text-sm text-gray-500">
              Track open quotes, delivery deadlines, and destination details
            </p>
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-2">
            {(["all", "open", "fulfilled", "cancelled"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`text-xs px-3 py-1.5 rounded-xl font-bold capitalize transition-all ${
                  statusFilter === filter
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-400">Loading requirements...</div>
        ) : requirements.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-gray-200 rounded-2xl space-y-4">
            <span className="text-4xl">📦</span>
            <div className="max-w-md mx-auto">
              <h4 className="text-base font-bold text-gray-800">No bulk procurement requests found</h4>
              <p className="text-xs text-gray-500 mt-1">
                Post your commercial demand (in Tons or Quintals) and let local farmer producers connect with quotations.
              </p>
            </div>
            <Button
              onClick={() => setShowRfqModal(true)}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl px-5 py-2 text-xs"
            >
              + Post Bulk RFQ Now
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {requirements.map((req) => (
              <div
                key={req.id}
                className="rounded-2xl border border-gray-200 p-5 bg-white hover:border-emerald-300 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-gray-900">{req.product}</h3>
                      <p className="text-xs font-semibold text-emerald-700">
                        {req.quantity} {req.unit.toUpperCase()}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                        req.status === "open"
                          ? "bg-emerald-100 text-emerald-800"
                          : req.status === "fulfilled"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>

                  {req.targetPricePerUnit && (
                    <p className="mt-2 text-xs text-gray-600">
                      Target: <span className="font-bold text-gray-900">₹{req.targetPricePerUnit.toLocaleString()}</span> / {req.unit}
                    </p>
                  )}

                  <div className="mt-3 text-[11px] text-gray-500 space-y-1">
                    <p>📅 Required by: <strong className="text-gray-700">{req.requiredByDate}</strong></p>
                    <p>📍 Destination: <strong className="text-gray-700">{req.deliveryLocation.district}, {req.deliveryLocation.state}</strong></p>
                    {req.notes && (
                      <p className="text-gray-600 italic line-clamp-2 mt-1">"{req.notes}"</p>
                    )}
                  </div>

                  {/* Farmer Quotations Section */}
                  <div className="mt-3 pt-2.5 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
                        🌾 Producer Quotes: <span className="text-emerald-700 font-extrabold">{req.quotations?.length || 0}</span>
                      </span>
                      {req.quotations && req.quotations.length > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleQuotes(req.id)}
                          className="text-[11px] text-emerald-700 font-bold hover:underline cursor-pointer"
                        >
                          {expandedQuotes[req.id] ? "Hide Quotes ▲" : "View Quotes ▼"}
                        </button>
                      )}
                    </div>

                    {expandedQuotes[req.id] && req.quotations && req.quotations.length > 0 && (
                      <div className="mt-2.5 space-y-2 max-h-48 overflow-y-auto">
                        {req.quotations.map((q, idx) => (
                          <div
                            key={idx}
                            className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-gray-900">{q.farmerName}</span>
                              <span className="font-black text-emerald-800">
                                ₹{q.offeredPricePerUnit.toLocaleString()} / {req.unit}
                              </span>
                            </div>
                            <div className="text-[11px] text-gray-600 flex items-center justify-between">
                              <span>Supply: {q.availableQuantity} {req.unit}</span>
                              <span>Ready: {q.availableDate}</span>
                            </div>
                            {q.notes && <p className="text-[11px] text-gray-500 italic">"{q.notes}"</p>}
                            <div className="pt-1">
                              <a
                                href={`tel:${q.farmerPhone}`}
                                className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:text-emerald-900 text-[11px]"
                              >
                                📞 Call Farmer: {q.farmerPhone}
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {req.status === "open" && (
                      <button
                        onClick={() => handleStatusChange(req.id, "fulfilled")}
                        className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold"
                      >
                        Mark Fulfilled
                      </button>
                    )}
                    {req.status === "open" && (
                      <button
                        onClick={() => handleStatusChange(req.id, "cancelled")}
                        className="text-[11px] text-gray-500 hover:text-gray-700 font-medium ml-2"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(req.id)}
                    className="text-[11px] text-red-500 hover:text-red-700 font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <BusinessProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />

      <CreateBulkRequirementModal
        isOpen={showRfqModal}
        onClose={() => setShowRfqModal(false)}
        onCreated={loadRequirements}
      />
    </div>
  );
}
