import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { fpoService, FPOMember, CreateMemberLotInput } from "@/services/fpo.service";
import { Listing } from "@/types/product";
import Spinner from "@/components/common/Spinner";
import ErrorMessage from "@/components/common/ErrorMessage";
import QualityGradeBadge from "@/components/common/QualityGradeBadge";

export default function FPOLots() {
  const [searchParams] = useSearchParams();
  const initialFarmerId = searchParams.get("farmerId") || "";

  const [lots, setLots] = useState<Listing[]>([]);
  const [members, setMembers] = useState<FPOMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedFarmerId, setSelectedFarmerId] = useState(initialFarmerId);
  const [search, setSearch] = useState("");

  // Create Lot Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateMemberLotInput>({
    name: "",
    category: "vegetables",
    description: "",
    price: 0,
    unit: "quintal",
    quantity: 0,
    location: "Nashik, Maharashtra",
    harvestDate: new Date().toISOString().split("T")[0],
    memberFarmerId: initialFarmerId || "",
    qualityGrade: "A",
    status: "active",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const [lotsData, membersData] = await Promise.all([
        fpoService.getLots(),
        fpoService.getMembers(),
      ]);
      setLots(lotsData);
      setMembers(membersData);
    } catch (err: any) {
      setError(err?.message || "Failed to load crop lots");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateLot(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSubmitting(true);
      setModalError(null);

      await fpoService.createLot({
        ...formData,
        price: Number(formData.price),
        quantity: Number(formData.quantity),
        memberFarmerId: formData.memberFarmerId || undefined,
      });

      setIsModalOpen(false);
      setFormData({
        name: "",
        category: "vegetables",
        description: "",
        price: 0,
        unit: "quintal",
        quantity: 0,
        location: "Nashik, Maharashtra",
        harvestDate: new Date().toISOString().split("T")[0],
        memberFarmerId: "",
        qualityGrade: "A",
        status: "active",
      });
      await loadData();
    } catch (err: any) {
      setModalError(err?.message || "Failed to create crop lot");
    } finally {
      setSubmitting(false);
    }
  }

  const filteredLots = lots.filter((lot) => {
    const matchesFarmer =
      !selectedFarmerId ||
      lot.farmerId === selectedFarmerId ||
      lot.memberFarmerId === selectedFarmerId;
    const matchesSearch =
      !search ||
      lot.name.toLowerCase().includes(search.toLowerCase()) ||
      lot.farmerName.toLowerCase().includes(search.toLowerCase());
    return matchesFarmer && matchesSearch;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Header Row */}
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
            Aggregated Crop Lots
          </h1>
          <p className="text-xs text-gray-500">
            Pool and manage collective farm lots across all registered member farmers.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition-all"
        >
          <span>+ Create Aggregated Lot</span>
        </button>
      </div>

      {error && <ErrorMessage message={error} />}

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="sm:col-span-2 relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search crop lots by commodity name or producer..."
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 pl-10 text-xs sm:text-sm shadow-xs focus:border-emerald-500 focus:outline-hidden"
          />
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
          )}
        </div>

        <div>
          <select
            value={selectedFarmerId}
            onChange={(e) => setSelectedFarmerId(e.target.value)}
            className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-xs sm:text-sm shadow-xs focus:border-emerald-500 focus:outline-hidden"
          >
            <option value="">All Member Producers (All Lots)</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                👨‍🌾 {m.name} ({m.district})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lots Grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : filteredLots.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLots.map((lot) => (
            <div
              key={lot.id}
              className="rounded-3xl border border-gray-100 bg-white p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Member Attribution & Quality Grade Header */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-900 border border-emerald-200/60 max-w-[70%] truncate">
                    <span>👨‍🌾</span>
                    <span className="truncate">
                      {lot.memberFarmerName ? `Harvested by ${lot.memberFarmerName}` : lot.farmerName}
                    </span>
                  </div>
                  {lot.qualityGrade && <QualityGradeBadge grade={lot.qualityGrade} />}
                </div>

                {/* Crop Name & Category */}
                <h3 className="text-lg font-bold text-gray-900">{lot.name}</h3>
                <p className="text-xs text-gray-500 line-clamp-2 mt-1">{lot.description}</p>

                {/* Metrics Table */}
                <div className="grid grid-cols-2 gap-2 my-4 rounded-2xl bg-gray-50/70 p-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Listed Rate</span>
                    <span className="text-base font-bold text-gray-900">
                      ₹{lot.price}
                      <span className="text-xs font-normal text-gray-500">/{lot.unit}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Available Volume</span>
                    <span className="text-base font-bold text-emerald-700">
                      {lot.quantity} {lot.unit}
                    </span>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-gray-200/50 flex items-center justify-between text-[11px] text-gray-500">
                    <span>📍 {lot.location}</span>
                    <span>🗓️ Harvest: {lot.harvestDate}</span>
                  </div>
                </div>
              </div>

              {/* Action Links */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                <Link
                  to={`/products/${lot.id}`}
                  className="font-bold text-emerald-700 hover:text-emerald-800"
                >
                  View in Marketplace ↗
                </Link>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    lot.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {lot.isActive ? "● Active & Public" : "Draft / Inactive"}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-gray-200 p-12 text-center bg-gray-50/50">
          <span className="text-4xl block mb-2">🌾</span>
          <h3 className="text-sm font-bold text-gray-900 mb-1">No crop lots found</h3>
          <p className="text-xs text-gray-500 mb-4 max-w-sm mx-auto">
            {selectedFarmerId
              ? "This member farmer currently has no lots listed under the FPO."
              : "Pool harvested crops from your member farmers to create aggregated market lots."}
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs transition-all"
          >
            <span>+ Create Crop Lot</span>
          </button>
        </div>
      )}

      {/* Create Lot Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl animate-scaleIn border border-gray-100 my-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3
                  className="text-lg font-bold text-gray-900"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Create Aggregated Lot
                </h3>
                <p className="text-xs text-gray-500">
                  List harvest lots attributed to a member farmer or collective pool.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="h-8 w-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            {modalError && <ErrorMessage message={modalError} />}

            <form onSubmit={handleCreateLot} className="space-y-4">
              {/* Member Farmer Attribution */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Produce Origin / Member Farmer
                </label>
                <select
                  value={formData.memberFarmerId}
                  onChange={(e) => setFormData({ ...formData, memberFarmerId: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-hidden"
                >
                  <option value="">🏢 FPO Collective Aggregated Lot (Multi-Farmer Pool)</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      👨‍🌾 {m.name} — {m.district} ({m.landSizeAcres ? `${m.landSizeAcres} Acres` : "Cluster"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Commodity / Crop Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Red Onion, Wheat, Tomato"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-hidden"
                  >
                    <option value="vegetables">Vegetables</option>
                    <option value="fruits">Fruits</option>
                    <option value="grains">Grains & Pulses</option>
                    <option value="herbs">Spices & Herbs</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    step="0.5"
                    min="0.5"
                    value={formData.price || ""}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    placeholder="₹ rate"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Unit *
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-hidden"
                  >
                    <option value="kg">Kilogram (kg)</option>
                    <option value="quintal">Quintal (100kg)</option>
                    <option value="ton">Ton (1000kg)</option>
                    <option value="crate">Crate</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Available Volume *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.quantity || ""}
                    onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                    placeholder="Volume"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Quality Grade
                  </label>
                  <select
                    value={formData.qualityGrade}
                    onChange={(e) => setFormData({ ...formData, qualityGrade: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-hidden"
                  >
                    <option value="A">Grade A (Premium Export Quality)</option>
                    <option value="B">Grade B (Standard Commercial Grade)</option>
                    <option value="C">Grade C (Processing Grade)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Harvest Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.harvestDate}
                    onChange={(e) => setFormData({ ...formData, harvestDate: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Location / Yard Dispatch Address *
                </label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Lasalgaon FPO Collection Yard, Nashik"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Description & Lot Details
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mention variety (e.g. Garva, Phule Samarth), moisture level, packing type..."
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 rounded-xl border border-gray-200 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-1/2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 shadow-xs"
                >
                  {submitting ? "Publishing Lot..." : "Publish Collective Lot"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
