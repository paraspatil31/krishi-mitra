import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { fpoService, FPOStats, FPOMember, FPOOffer } from "@/services/fpo.service";
import Spinner from "@/components/common/Spinner";
import ErrorMessage from "@/components/common/ErrorMessage";

export default function FPODashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [stats, setStats] = useState<FPOStats | null>(null);
  const [members, setMembers] = useState<FPOMember[]>([]);
  const [offers, setOffers] = useState<FPOOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const [statsData, membersData, offersData] = await Promise.all([
        fpoService.getStats(),
        fpoService.getMembers(),
        fpoService.getOffers(),
      ]);
      setStats(statsData);
      setMembers(membersData);
      setOffers(offersData);
    } catch (err: any) {
      setError(err?.message || "Failed to load FPO dashboard data");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const pendingOffers = offers.filter((o) => o.status === "pending");

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-800 via-teal-900 to-green-900 p-6 sm:p-8 text-white shadow-xl mb-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3.5 py-1 text-xs font-semibold text-emerald-200 backdrop-blur-md mb-3 border border-emerald-400/20">
              <span>🏢</span>
              <span>Farmer Producer Organization Hub</span>
            </div>
            <h1
              className="text-2xl sm:text-3xl font-bold tracking-tight text-white"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {stats?.fpoName || user?.name || "FPO Cooperative Hub"}
            </h1>
            <p className="mt-1 text-sm text-emerald-100 max-w-xl">
              Multi-farm aggregation command center. Manage member farmers, pool collective crop harvests, negotiate wholesale buyer bids, and dispatch produce at fair market rates.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Link
              to="/fpo/members"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-emerald-950 shadow-md hover:bg-emerald-50 transition-all active:scale-95"
            >
              <span>👨‍🌾</span>
              <span>Manage Members</span>
            </Link>
            <Link
              to="/fpo/lots"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/80 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md hover:bg-emerald-500 transition-all active:scale-95 border border-emerald-400/30"
            >
              <span>📦</span>
              <span>Aggregated Lots</span>
            </Link>
          </div>
        </div>

        {/* Decorative Background Glow */}
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-teal-500/20 blur-3xl" />
      </div>

      {error && <ErrorMessage message={error} />}

      {/* Pending Offers Action Alert */}
      {pendingOffers.length > 0 && (
        <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 sm:p-5 text-amber-900 shadow-sm transition-all animate-pulse-glow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-xl">
              💰
            </span>
            <div>
              <h3 className="text-sm font-bold text-amber-950">
                {pendingOffers.length} Negotiated Buyer {pendingOffers.length === 1 ? "Offer" : "Offers"} Awaiting Response
              </h3>
              <p className="text-xs text-amber-800">
                Commercial buyers have submitted price bids on your member crop lots. Review and accept before they expire.
              </p>
            </div>
          </div>
          <Link
            to="/fpo/offers"
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition-all shrink-0"
          >
            <span>Review Offers</span>
            <span>→</span>
          </Link>
        </div>
      )}

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs transition-all hover:shadow-md hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Member Farmers</span>
            <span className="rounded-lg bg-emerald-50 p-2 text-emerald-700 text-lg">👨‍🌾</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-gray-900">
            {stats?.totalMembersCount ?? 0}
          </div>
          <p className="mt-1 text-xs text-gray-500">Affiliated producers in cluster</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs transition-all hover:shadow-md hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Active Crop Lots</span>
            <span className="rounded-lg bg-blue-50 p-2 text-blue-700 text-lg">🌾</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-gray-900">
            {stats?.activeLotsCount ?? 0}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            ~{((stats?.totalStockVolumeKg ?? 0) / 1000).toFixed(1)} Tons in barn
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs transition-all hover:shadow-md hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Inventory Value</span>
            <span className="rounded-lg bg-amber-50 p-2 text-amber-700 text-lg">🏷️</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-gray-900">
            ₹{(stats?.totalLotsValue ?? 0).toLocaleString("en-IN")}
          </div>
          <p className="mt-1 text-xs text-gray-500">Aggregated collective produce</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs transition-all hover:shadow-md hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Revenue</span>
            <span className="rounded-lg bg-purple-50 p-2 text-purple-700 text-lg">💵</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-gray-900">
            ₹{(stats?.totalRevenue ?? 0).toLocaleString("en-IN")}
          </div>
          <p className="mt-1 text-xs text-gray-500">{stats?.completedOrdersCount ?? 0} orders delivered</p>
        </div>
      </div>

      {/* Two Column Layout: Aggregated Commodities & Member Farmers Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Aggregated Commodities Breakdown */}
        <div className="lg:col-span-1 rounded-2xl border border-gray-100 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900">Pooled Commodities</h2>
            <Link to="/fpo/lots" className="text-xs font-bold text-emerald-700 hover:text-emerald-800">
              View Lots →
            </Link>
          </div>

          {stats?.commodities && stats.commodities.length > 0 ? (
            <div className="space-y-4">
              {stats.commodities.map((item) => {
                const totalVol = stats.totalStockVolumeKg || 1;
                const pct = Math.min(100, Math.round((item.volumeKg / totalVol) * 100));
                return (
                  <div key={item.cropName} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-gray-900 font-bold">{item.cropName}</span>
                      <span className="text-gray-500">
                        {item.volumeKg >= 1000 ? `${(item.volumeKg / 1000).toFixed(1)} T` : `${item.volumeKg} kg`} ({item.lotsCount} {item.lotsCount === 1 ? "lot" : "lots"})
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-gray-400">
              No pooled crops listed yet. Create a crop lot to begin aggregation.
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-gray-100">
            <Link
              to="/fpo/lots"
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-emerald-600 bg-emerald-50/50 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-all"
            >
              <span>+ Add Crop Lot</span>
            </Link>
          </div>
        </div>

        {/* Member Farmers Roster Preview */}
        <div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">Member Farmers</h2>
              <p className="text-xs text-gray-500">Affiliated producers in your cluster</p>
            </div>
            <Link
              to="/fpo/members"
              className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-all"
            >
              <span>+ Add Member</span>
            </Link>
          </div>

          {members.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wider font-semibold">
                    <th className="pb-3">Farmer Name</th>
                    <th className="pb-3">Location</th>
                    <th className="pb-3">Land Size</th>
                    <th className="pb-3">Primary Harvest</th>
                    <th className="pb-3 text-right">Active Lots</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {members.slice(0, 5).map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3 font-bold text-gray-900">
                        <div className="flex items-center gap-2">
                          <span className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">
                            {m.name.charAt(0)}
                          </span>
                          <div>
                            <div>{m.name}</div>
                            <div className="text-[10px] text-gray-400 font-normal">{m.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-gray-600">{m.district}</td>
                      <td className="py-3 text-gray-600">{m.landSizeAcres ? `${m.landSizeAcres} Acres` : "—"}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1">
                          {m.primaryCrops.slice(0, 2).map((c) => (
                            <span key={c} className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] text-gray-700 font-medium">
                              {c}
                            </span>
                          ))}
                          {m.primaryCrops.length > 2 && (
                            <span className="text-[10px] text-gray-400">+{m.primaryCrops.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 text-right font-bold text-emerald-700">
                        {m.activeLotsCount} lots
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center">
              <span className="text-3xl block mb-2">👨‍🌾</span>
              <p className="text-xs text-gray-500 mb-3">No member farmers registered yet.</p>
              <Link
                to="/fpo/members"
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-all"
              >
                <span>Register First Member</span>
              </Link>
            </div>
          )}

          {members.length > 5 && (
            <div className="mt-4 text-center border-t border-gray-50 pt-3">
              <Link to="/fpo/members" className="text-xs font-bold text-emerald-700 hover:text-emerald-800">
                View all {members.length} members →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/fpo/offers"
          className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs hover:border-amber-300 hover:shadow-md transition-all flex items-center gap-4"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-2xl">
            🤝
          </span>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Price Offers Inbox</h3>
            <p className="text-xs text-gray-500">Negotiate and lock in commercial bulk bids</p>
          </div>
        </Link>

        <Link
          to="/fpo/orders"
          className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs hover:border-blue-300 hover:shadow-md transition-all flex items-center gap-4"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
            📋
          </span>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Orders & Dispatch</h3>
            <p className="text-xs text-gray-500">Track shipments, manifests, and escrow release</p>
          </div>
        </Link>

        <Link
          to="/mandi-prices"
          className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all flex items-center gap-4"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
            📈
          </span>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Mandi Benchmarks</h3>
            <p className="text-xs text-gray-500">Live Agmarknet APMC clearing prices</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
