import { useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { BusinessProfile } from "@/types/auth";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import ErrorMessage from "@/components/common/ErrorMessage";

interface BusinessProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const BUSINESS_TYPES = [
  "Restaurant / Cafe",
  "Hotel / Resort",
  "Wholesaler / Trader",
  "Retail Supermarket / Grocery Chain",
  "Food Processing Unit",
  "Catering / Event Services",
  "Hostel / Institutional Mess",
  "Exporter",
  "Other Commercial Enterprise",
];

const COMMON_COMMODITIES = [
  "Onion (Kanda)",
  "Tomato",
  "Potato",
  "Wheat (Gehun)",
  "Soybean",
  "Rice / Paddy",
  "Gram / Chana",
  "Cotton",
  "Banana",
  "Grapes",
  "Pomegranate",
];

export default function BusinessProfileModal({ isOpen, onClose, onSuccess }: BusinessProfileModalProps) {
  const { user, updateBusinessProfile } = useAuth();

  const [businessName, setBusinessName] = useState(user?.businessProfile?.businessName || "");
  const [businessType, setBusinessType] = useState(user?.businessProfile?.businessType || BUSINESS_TYPES[0]);
  const [gstin, setGstin] = useState(user?.businessProfile?.gstin || "");
  const [businessAddress, setBusinessAddress] = useState(user?.businessProfile?.businessAddress || "");
  const [contactPerson, setContactPerson] = useState(user?.businessProfile?.contactPerson || user?.name || "");
  const [phone, setPhone] = useState(user?.businessProfile?.phone || user?.phone || "");
  const [typicalQuantity, setTypicalQuantity] = useState(user?.businessProfile?.typicalPurchaseQuantity || "5 - 20 Tons / month");
  const [selectedCommodities, setSelectedCommodities] = useState<string[]>(
    user?.businessProfile?.preferredProducts || []
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (!isOpen) return null;

  function toggleCommodity(item: string) {
    if (selectedCommodities.includes(item)) {
      setSelectedCommodities(selectedCommodities.filter((c) => c !== item));
    } else {
      setSelectedCommodities([...selectedCommodities, item]);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!businessName.trim()) {
      setError("Business or Entity Name is required");
      return;
    }

    if (!businessAddress.trim()) {
      setError("Primary Warehouse or Delivery Address is required");
      return;
    }

    if (gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin.trim())) {
      setError("Please enter a valid 15-character Indian GSTIN format (or leave blank if unregistered)");
      return;
    }

    setLoading(true);
    try {
      const profile: BusinessProfile = {
        businessName: businessName.trim(),
        businessType,
        gstin: gstin.trim() ? gstin.trim().toUpperCase() : undefined,
        businessAddress: businessAddress.trim() || undefined,
        contactPerson: contactPerson.trim() || undefined,
        phone: phone.trim() || undefined,
        preferredProducts: selectedCommodities,
        typicalPurchaseQuantity: typicalQuantity,
      };

      await updateBusinessProfile(profile);
      setSuccessMsg("Business profile updated successfully!");
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || "Failed to update business profile");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-gray-100 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0d261a] to-emerald-950 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-2xl border border-emerald-400/30">
              🏢
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight">Business Procurement Profile</h3>
              <p className="text-xs text-emerald-200">
                Configure your commercial entity to access custom bulk quotations & mandi benchmarks
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white rounded-full p-1.5 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && <ErrorMessage message={error} />}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold">
              ✓ {successMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Input
                label="Business / Entity Name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. FreshBowl Kitchens Pvt Ltd"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Business Type
              </label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-emerald-600 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
              >
                {BUSINESS_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Input
                label="GSTIN (Optional)"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="e.g. 27AAAAA0000A1Z5"
                hint="15-digit GST identification number"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Typical Monthly Volume
              </label>
              <select
                value={typicalQuantity}
                onChange={(e) => setTypicalQuantity(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-emerald-600 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
              >
                <option value="Under 1 Ton / month">Under 1 Ton / month (Trial)</option>
                <option value="1 - 5 Tons / month">1 - 5 Tons / month</option>
                <option value="5 - 20 Tons / month">5 - 20 Tons / month</option>
                <option value="20 - 50 Tons / month">20 - 50 Tons / month</option>
                <option value="50+ Tons / month">50+ Tons / month (Industrial Bulk)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Input
                label="Procurement Contact Person"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Rajesh Kumar"
              />
            </div>
            <div>
              <Input
                label="Direct Desk / Contact Phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9820012345"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              Primary Delivery Hub / Warehouse Address
            </label>
            <textarea
              rows={2}
              value={businessAddress}
              onChange={(e) => setBusinessAddress(e.target.value)}
              placeholder="e.g. Plot No 44, APMC Sector 19, Vashi, Navi Mumbai - 400703"
              className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm text-gray-900 focus:border-emerald-600 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
              Primary Commodities Procured (Select all that apply)
            </label>
            <div className="flex flex-wrap gap-2">
              {COMMON_COMMODITIES.map((c) => {
                const isSelected = selectedCommodities.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCommodity(c)}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                      isSelected
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {isSelected ? "✓ " : "+ "}
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-6 rounded-xl shadow-md"
            >
              Save Business Profile
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
