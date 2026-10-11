import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { fpoService, FPOMember, AddMemberInput } from "@/services/fpo.service";
import Spinner from "@/components/common/Spinner";
import ErrorMessage from "@/components/common/ErrorMessage";

export default function FPOMembers() {
  const [members, setMembers] = useState<FPOMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Add Member Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [formData, setFormData] = useState<AddMemberInput>({
    name: "",
    phone: "",
    district: "Nashik",
    villageAddress: "",
    landSizeAcres: undefined,
    primaryCrops: [],
    organicCertified: false,
  });
  const [cropInput, setCropInput] = useState("");

  // Remove confirmation modal state
  const [memberToRemove, setMemberToRemove] = useState<FPOMember | null>(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    loadMembers();
  }, []);

  async function loadMembers() {
    try {
      setLoading(true);
      setError(null);
      const data = await fpoService.getMembers();
      setMembers(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load member farmers");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSubmitting(true);
      setModalError(null);

      const crops = cropInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await fpoService.addMember({
        ...formData,
        primaryCrops: crops,
      });

      setIsAddModalOpen(false);
      setFormData({
        name: "",
        phone: "",
        district: "Nashik",
        villageAddress: "",
        landSizeAcres: undefined,
        primaryCrops: [],
        organicCertified: false,
      });
      setCropInput("");
      await loadMembers();
    } catch (err: any) {
      setModalError(err?.message || "Failed to register member farmer");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemoveMember() {
    if (!memberToRemove) return;
    try {
      setRemoving(true);
      await fpoService.removeMember(memberToRemove.id);
      setMemberToRemove(null);
      await loadMembers();
    } catch (err: any) {
      setError(err?.message || "Failed to unlink member farmer");
    } finally {
      setRemoving(false);
    }
  }

  const filteredMembers = members.filter((m) => {
    const term = search.toLowerCase();
    return (
      m.name.toLowerCase().includes(term) ||
      m.phone.includes(term) ||
      m.district.toLowerCase().includes(term) ||
      m.primaryCrops.some((c) => c.toLowerCase().includes(term))
    );
  });

  const totalAcres = members.reduce((acc, m) => acc + (m.landSizeAcres || 0), 0);
  const totalActiveLots = members.reduce((acc, m) => acc + (m.activeLotsCount || 0), 0);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Link to="/fpo/dashboard" className="text-xs text-gray-500 hover:text-emerald-700">
              ← FPO Dashboard
            </Link>
          </div>
          <h1
            className="text-2xl font-bold text-gray-900 mt-1"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Member Farmers Roster
          </h1>
          <p className="text-xs text-gray-500">
            Registered smallholder and marginal producers aggregated under your organization.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition-all"
        >
          <span>+ Onboard Member Farmer</span>
        </button>
      </div>

      {error && <ErrorMessage message={error} />}

      {/* Summary Stat Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">Total Members</span>
          <span className="text-xl font-bold text-gray-900">{members.length} Farmers</span>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">Pooled Land Area</span>
          <span className="text-xl font-bold text-emerald-700">{totalAcres} Acres</span>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">Collective Active Lots</span>
          <span className="text-xl font-bold text-blue-700">{totalActiveLots} Lots</span>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">Certified Organic</span>
          <span className="text-xl font-bold text-green-700">
            {members.filter((m) => m.organicCertified).length} Producers
          </span>
        </div>
      </div>

      {/* Search Input Filter */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search member farmers by name, phone, village, or primary crop..."
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 pl-11 text-xs sm:text-sm shadow-xs focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Members Grid / Cards */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : filteredMembers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMembers.map((m) => (
            <div
              key={m.id}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs hover:border-emerald-200 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-200 text-emerald-900 font-bold flex items-center justify-center text-sm shadow-xs">
                      {m.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">{m.name}</h3>
                      <p className="text-[11px] text-gray-500">📞 {m.phone}</p>
                    </div>
                  </div>
                  {m.organicCertified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700 border border-green-200/60">
                      <span>🌿</span> Organic
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 py-3 border-y border-gray-50 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Village / District:</span>
                    <span className="font-semibold text-gray-800">{m.district}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Land Holding:</span>
                    <span className="font-semibold text-gray-800">
                      {m.landSizeAcres ? `${m.landSizeAcres} Acres` : "Not recorded"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Active Listed Lots:</span>
                    <span className="font-bold text-emerald-700">{m.activeLotsCount} lots</span>
                  </div>
                </div>

                {m.primaryCrops.length > 0 && (
                  <div className="mt-3">
                    <span className="text-[11px] text-gray-400 block mb-1">Primary Harvests:</span>
                    <div className="flex flex-wrap gap-1">
                      {m.primaryCrops.map((c) => (
                        <span
                          key={c}
                          className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Card Actions */}
              <div className="mt-5 pt-3 border-t border-gray-50 flex items-center justify-between">
                <Link
                  to={`/fpo/lots?farmerId=${m.id}`}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
                >
                  View Harvest Lots →
                </Link>
                <button
                  onClick={() => setMemberToRemove(m)}
                  className="text-[11px] font-semibold text-red-600 hover:text-red-700 hover:underline"
                >
                  Unlink Farmer
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-gray-200 p-12 text-center bg-gray-50/50">
          <span className="text-4xl block mb-2">👨‍🌾</span>
          <h3 className="text-sm font-bold text-gray-900 mb-1">No member farmers found</h3>
          <p className="text-xs text-gray-500 mb-4 max-w-sm mx-auto">
            {search
              ? "No farmers match your search filter. Try clearing your search term."
              : "Start by onboarding local smallholder farmers in your cluster to aggregate their produce."}
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs transition-all"
          >
            <span>+ Onboard First Farmer</span>
          </button>
        </div>
      )}

      {/* Add Member Farmer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-scaleIn border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3
                  className="text-lg font-bold text-gray-900"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Onboard Member Farmer
                </h3>
                <p className="text-xs text-gray-500">
                  Register or affiliate an agricultural producer to your FPO.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="h-8 w-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            {modalError && <ErrorMessage message={modalError} />}

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Farmer Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Ramesh Vitthal Patil"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Mobile Number (for notifications & OTP) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    pattern="[6-9][0-9]{9}"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="9822012345"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 pl-11 text-xs focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    District
                  </label>
                  <input
                    type="text"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    placeholder="e.g. Nashik"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Land Size (Acres)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.landSizeAcres ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        landSizeAcres: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    placeholder="e.g. 3.5"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Village / Taluka Address
                </label>
                <input
                  type="text"
                  value={formData.villageAddress}
                  onChange={(e) => setFormData({ ...formData, villageAddress: e.target.value })}
                  placeholder="e.g. Niphad Taluka, Lasalgaon"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Primary Crops Harvested (comma separated)
                </label>
                <input
                  type="text"
                  value={cropInput}
                  onChange={(e) => setCropInput(e.target.value)}
                  placeholder="e.g. Red Onion, Soybean, Pomegranate"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="organicCheck"
                  checked={formData.organicCertified}
                  onChange={(e) => setFormData({ ...formData, organicCertified: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="organicCheck" className="text-xs font-medium text-gray-700">
                  Organic / NPOP Farm Certified
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-1/2 rounded-xl border border-gray-200 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-1/2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 shadow-xs"
                >
                  {submitting ? "Registering..." : "Onboard Farmer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unlink Confirmation Dialog */}
      {memberToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl animate-scaleIn border border-gray-100 text-center">
            <span className="text-3xl block mb-2">⚠️</span>
            <h3 className="text-base font-bold text-gray-900 mb-1">
              Unlink {memberToRemove.name}?
            </h3>
            <p className="text-xs text-gray-500 mb-6">
              This will disassociate the farmer from your organization. Their future crop lots will no longer aggregate into your FPO command center.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setMemberToRemove(null)}
                className="w-1/2 rounded-xl border border-gray-200 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveMember}
                disabled={removing}
                className="w-1/2 rounded-xl bg-red-600 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50 shadow-xs"
              >
                {removing ? "Unlinking..." : "Confirm Unlink"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
