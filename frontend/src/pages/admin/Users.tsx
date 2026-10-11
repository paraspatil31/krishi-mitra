import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "@/services/api";
import VerifiedBadge from "@/components/common/VerifiedBadge";
import Spinner from "@/components/common/Spinner";

interface UserRecord {
  id: string;
  _id?: string;
  name: string;
  phone: string;
  email?: string;
  role: "farmer" | "buyer" | "admin";
  isVerifiedBuyer?: boolean;
  isPhoneVerified?: boolean;
  createdAt?: string;
}

export default function Users() {
  const [data, setData] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [feedback, setFeedback] = useState<string>("");

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await api.get<{ data: UserRecord[] }>("/admin/users");
      setData(res.data);
    } catch (err: any) {
      console.error("Failed to load users:", err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleBuyerVerification(user: UserRecord) {
    const userId = user.id || user._id;
    if (!userId) return;

    setUpdatingId(userId);
    const nextStatus = !user.isVerifiedBuyer;

    try {
      await api.patch(`/admin/users/${userId}/verify`, {
        isVerifiedBuyer: nextStatus,
        notes: nextStatus ? "Verified through Admin Panel Accreditation" : "Verification revoked by Admin",
      });

      setData((prev) =>
        prev.map((u) => {
          const uId = u.id || u._id;
          if (uId === userId) {
            return { ...u, isVerifiedBuyer: nextStatus };
          }
          return u;
        })
      );

      setFeedback(`Successfully updated ${user.name} to ${nextStatus ? "VERIFIED" : "UNVERIFIED"}`);
      setTimeout(() => setFeedback(""), 3500);
    } catch (err: any) {
      alert(err.message || "Failed to update verification status");
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredUsers = data.filter((u) => {
    if (filterRole !== "all" && u.role !== filterRole) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = u.name?.toLowerCase().includes(q);
      const matchPhone = u.phone?.includes(q);
      const matchEmail = u.email?.toLowerCase().includes(q);
      return matchName || matchPhone || matchEmail;
    }
    return true;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            to="/admin"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1 mb-2"
          >
            &larr; Back to Admin Dashboard
          </Link>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">User Management &amp; Trust Accreditation</h1>
          <p className="mt-1 text-sm text-gray-500">
            Audit user accounts, check phone validations, and accredit trusted buyers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 transition"
          >
            ↻ Refresh Users
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-fade-in">
          <span>✓</span>
          <span>{feedback}</span>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
        <div className="w-full sm:w-72 relative">
          <input
            type="text"
            placeholder="Search by name, phone, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {["all", "buyer", "farmer", "admin"].map((role) => (
            <button
              key={role}
              onClick={() => setFilterRole(role)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold capitalize transition ${
                filterRole === role
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {role === "all" ? "All Users" : `${role}s`}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="py-24 text-center">
          <Spinner size="lg" />
          <p className="mt-3 text-sm text-gray-500">Loading user database...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-gray-500 text-sm">
          No users match your criteria.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/80 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="p-4">User</th>
                  <th className="p-4">Phone / Contact</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Accreditation Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((u) => {
                  const userId = u.id || u._id || "";
                  const isUpdating = updatingId === userId;

                  return (
                    <tr key={userId} className="hover:bg-gray-50/60 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-gray-900">{u.name}</div>
                        <div className="text-xs text-gray-400">{u.email || "No email registered"}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-mono text-gray-800 text-xs font-medium">
                          {u.phone}
                        </div>
                        {u.isPhoneVerified && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                            ✓ Phone Verified
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                            u.role === "admin"
                              ? "bg-purple-100 text-purple-800"
                              : u.role === "farmer"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4">
                        {u.role === "buyer" ? (
                          u.isVerifiedBuyer ? (
                            <VerifiedBadge type="buyer" />
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 border border-gray-200 px-2 py-0.5 text-xs text-gray-600">
                              <span>⚪</span> Unverified
                            </span>
                          )
                        ) : u.role === "farmer" ? (
                          <VerifiedBadge type="farmer" />
                        ) : (
                          <span className="text-xs text-gray-400">System Admin</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {u.role === "buyer" ? (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => toggleBuyerVerification(u)}
                            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition shadow-xs disabled:opacity-50 ${
                              u.isVerifiedBuyer
                                ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                                : "bg-emerald-600 text-white hover:bg-emerald-700"
                            }`}
                          >
                            {isUpdating ? (
                              <span className="inline-flex items-center gap-1">
                                <span className="animate-spin">⏳</span> Updating...
                              </span>
                            ) : u.isVerifiedBuyer ? (
                              "Revoke Badge"
                            ) : (
                              "Accredit Buyer ✓"
                            )}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
