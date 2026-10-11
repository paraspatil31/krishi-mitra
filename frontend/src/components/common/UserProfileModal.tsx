import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import type { BuyerType, BusinessProfile, FarmProfile } from "@/types/auth";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPhotoModal?: () => void;
}

export default function UserProfileModal({
  isOpen,
  onClose,
  onOpenPhotoModal,
}: UserProfileModalProps) {
  const { t, i18n } = useTranslation();
  const { user, updateProfile } = useAuth();

  // Basic Details
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [district, setDistrict] = useState("");
  const [lng, setLng] = useState<number | undefined>(undefined);
  const [lat, setLat] = useState<number | undefined>(undefined);
  const [preferredLang, setPreferredLang] = useState<"en" | "hi" | "mr">("en");
  const [buyerType, setBuyerType] = useState<BuyerType>("household");

  // Farm Profile (for Farmers)
  const [farmName, setFarmName] = useState("");
  const [farmAddress, setFarmAddress] = useState("");
  const [landSizeAcres, setLandSizeAcres] = useState<number | "">("");
  const [primaryCropsStr, setPrimaryCropsStr] = useState("");
  const [organicCertified, setOrganicCertified] = useState(false);

  // Business Profile (for Business Buyers)
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("Wholesaler");
  const [gstin, setGstin] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [typicalPurchaseQuantity, setTypicalPurchaseQuantity] = useState("");

  // States
  const [isLocating, setIsLocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Sync state whenever modal opens or user updates
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setDistrict(user.district || "");
      if (user.location?.coordinates && user.location.coordinates.length === 2) {
        setLng(user.location.coordinates[0]);
        setLat(user.location.coordinates[1]);
      }
      setPreferredLang(user.preferredLanguage || "en");
      setBuyerType(user.buyerType || "household");

      // Farmer profile
      if (user.farmProfile) {
        setFarmName(user.farmProfile.farmName || "");
        setFarmAddress(user.farmProfile.farmAddress || "");
        setLandSizeAcres(user.farmProfile.landSizeAcres ?? "");
        setPrimaryCropsStr(user.farmProfile.primaryCrops?.join(", ") || "");
        setOrganicCertified(Boolean(user.farmProfile.organicCertified));
      }

      // Business profile
      if (user.businessProfile) {
        setBusinessName(user.businessProfile.businessName || "");
        setBusinessType(user.businessProfile.businessType || "Wholesaler");
        setGstin(user.businessProfile.gstin || "");
        setBusinessAddress(user.businessProfile.businessAddress || "");
        setContactPerson(user.businessProfile.contactPerson || "");
        setBusinessPhone(user.businessProfile.phone || "");
        setTypicalPurchaseQuantity(user.businessProfile.typicalPurchaseQuantity || "");
      }
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const isFarmer = user.role === "farmer";
  const isBuyer = user.role === "buyer";

  // GPS Auto-detect
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    setErrorMsg("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const detectedLng = Number(pos.coords.longitude.toFixed(5));
        const detectedLat = Number(pos.coords.latitude.toFixed(5));
        setLng(detectedLng);
        setLat(detectedLat);

        // Attempt reverse geocoding via OpenStreetMap Nominatim
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${detectedLat}&lon=${detectedLng}`
          );
          if (resp.ok) {
            const data = await resp.json();
            const detDistrict =
              data.address?.district ||
              data.address?.city ||
              data.address?.county ||
              data.address?.state_district;
            const detState = data.address?.state;
            if (detDistrict) {
              setDistrict(detState ? `${detDistrict}, ${detState}` : detDistrict);
            }
          }
        } catch {
          // Keep current district if reverse geocode fails
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        setErrorMsg("Unable to retrieve GPS location. Please enter manually.");
        console.warn("GPS error:", err);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!name.trim()) {
      setErrorMsg("Please enter your name.");
      return;
    }

    try {
      setIsSaving(true);

      const updatePayload: Record<string, any> = {
        name: name.trim(),
        email: email.trim() || undefined,
        district: district.trim() || undefined,
        preferredLanguage: preferredLang,
      };

      if (lng !== undefined && lat !== undefined) {
        updatePayload.location = {
          type: "Point",
          coordinates: [lng, lat],
        };
      }

      // Update i18n language if changed
      if (preferredLang !== i18n.language) {
        i18n.changeLanguage(preferredLang);
        localStorage.setItem("preferred_language", preferredLang);
      }

      if (isFarmer) {
        const crops = primaryCropsStr
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean);
        const farmProf: FarmProfile = {
          farmName: farmName.trim() || undefined,
          farmAddress: farmAddress.trim() || undefined,
          landSizeAcres: typeof landSizeAcres === "number" ? landSizeAcres : undefined,
          primaryCrops: crops.length ? crops : undefined,
          organicCertified,
        };
        updatePayload.farmProfile = farmProf;
      }

      if (isBuyer) {
        updatePayload.buyerType = buyerType;
        if (buyerType === "business") {
          const bizProf: BusinessProfile = {
            businessName: businessName.trim() || undefined,
            businessType: businessType.trim() || undefined,
            gstin: gstin.trim() ? gstin.trim().toUpperCase() : undefined,
            businessAddress: businessAddress.trim() || undefined,
            contactPerson: contactPerson.trim() || undefined,
            phone: businessPhone.trim() || undefined,
            typicalPurchaseQuantity: typicalPurchaseQuantity.trim() || undefined,
          };
          updatePayload.businessProfile = bizProf;
        }
      }

      await updateProfile(updatePayload);
      setSuccessMsg("Profile successfully updated!");
      setTimeout(() => {
        setSuccessMsg("");
        onClose();
      }, 900);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 md:p-4 animate-fade-in-up overflow-y-auto">
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-gray-100 animate-scale-in my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50/70 via-white to-emerald-50/40 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={
                  user.avatar ||
                  (isFarmer
                    ? "https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=150"
                    : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150")
                }
                alt={user.name}
                className="h-12 w-12 rounded-full object-cover ring-2 ring-emerald-600/40 shadow-xs"
              />
              {onOpenPhotoModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenPhotoModal();
                  }}
                  title="Change photo"
                  className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-700 text-white text-[10px] hover:bg-emerald-800 shadow-xs ring-2 ring-white"
                >
                  📷
                </button>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-gray-900">
                  {user.name}
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  {isFarmer
                    ? "🌾 Verified Farmer"
                    : isBuyer && user.buyerType === "business"
                    ? "🏢 Business Buyer"
                    : "🛒 Household Buyer"}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium">
                📞 {user.phone} • {user.district || "Location not set"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5 space-y-6 flex-1">
          {errorMsg && (
            <div className="rounded-2xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-700 text-center">
              ⚠️ {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800 text-center">
              ✅ {successMsg}
            </div>
          )}

          {/* Section 1: Basic Information */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-800">
                👤
              </span>
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-700">
                Personal Information
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Patil"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. ramesh@example.com"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Registered Mobile Number
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    disabled
                    value={user.phone}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-xs font-semibold text-gray-500 cursor-not-allowed"
                  />
                  <span className="shrink-0 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1.5 rounded-xl">
                    ✓ Verified
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Preferred App Language
                </label>
                <div className="flex gap-2">
                  {(
                    [
                      { code: "en", label: "English" },
                      { code: "hi", label: "हिन्दी" },
                      { code: "mr", label: "मराठी" },
                    ] as const
                  ).map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => setPreferredLang(lang.code)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
                        preferredLang === lang.code
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Geographic & Location Intelligence */}
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-800">
                  📍
                </span>
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-700">
                  Location & Market Region
                </h4>
              </div>

              <button
                type="button"
                onClick={handleDetectGPS}
                disabled={isLocating}
                className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors cursor-pointer"
              >
                <span>{isLocating ? "⏳" : "🎯"}</span>
                <span>{isLocating ? "Detecting GPS..." : "Detect GPS Location"}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  District / City / State
                </label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="e.g. Nashik, Maharashtra"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  GPS Coordinates (GeoJSON 2dsphere)
                </label>
                <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-3.5 py-2 rounded-xl border border-gray-200 font-mono">
                  {lat !== undefined && lng !== undefined ? (
                    <span>
                      🌐 {lat.toFixed(4)}° N, {lng.toFixed(4)}° E
                    </span>
                  ) : (
                    <span className="text-gray-400">Click "Detect GPS" to pin exact location</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Role-Specific Information */}
          {isFarmer && (
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-800">
                  🌾
                </span>
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-700">
                  Farm & Agricultural Profile
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Farm or Estate Name
                  </label>
                  <input
                    type="text"
                    value={farmName}
                    onChange={(e) => setFarmName(e.target.value)}
                    placeholder="e.g. Kisan Organic Green Agro"
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Total Cultivated Land (Acres)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={landSizeAcres}
                    onChange={(e) =>
                      setLandSizeAcres(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    placeholder="e.g. 7.5"
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Farm Address / Village / Tehsil
                  </label>
                  <input
                    type="text"
                    value={farmAddress}
                    onChange={(e) => setFarmAddress(e.target.value)}
                    placeholder="e.g. Gat No. 42, Pimpalgaon Village, Niphad Taluka"
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Primary Harvest Crops (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={primaryCropsStr}
                    onChange={(e) => setPrimaryCropsStr(e.target.value)}
                    placeholder="e.g. Red Onions, Alphonso Mangoes, Wheat, Tomatoes"
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center gap-3 bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100">
                  <input
                    type="checkbox"
                    id="organicCertified"
                    checked={organicCertified}
                    onChange={(e) => setOrganicCertified(e.target.checked)}
                    className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300 cursor-pointer"
                  />
                  <label
                    htmlFor="organicCertified"
                    className="text-xs font-bold text-gray-800 cursor-pointer flex-1"
                  >
                    🌿 Jaivik Bharat / NPOP Certified Organic Farm
                    <span className="block text-[10px] text-gray-500 font-normal mt-0.5">
                      Check this if your farm produces certified organic produce with valid test certificates.
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {isBuyer && (
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-800">
                    🏢
                  </span>
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-700">
                    Buyer Category & Business Profile
                  </h4>
                </div>
              </div>

              {/* Buyer Type Switcher */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setBuyerType("household")}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    buyerType === "household"
                      ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/20"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <p className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                    🛒 Household Buyer
                  </p>
                  <p className="text-[10px] text-gray-500 mt-1">
                    Personal & household consumption directly from farmers.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setBuyerType("business")}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    buyerType === "business"
                      ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/20"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <p className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                    🏢 Business / Bulk Buyer
                  </p>
                  <p className="text-[10px] text-gray-500 mt-1">
                    Commercial sourcing, hotels, restaurants, wholesale & RFQs.
                  </p>
                </button>
              </div>

              {/* Business Profile Details (if buyerType is business) */}
              {buyerType === "business" && (
                <div className="space-y-4 bg-gray-50/70 p-4 rounded-2xl border border-gray-200/80">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Company / Entity Name
                      </label>
                      <input
                        type="text"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="e.g. Fresh Mart Retailers"
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Business Sector
                      </label>
                      <select
                        value={businessType}
                        onChange={(e) => setBusinessType(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="Wholesaler">Wholesaler / Trader</option>
                        <option value="Restaurant">Restaurant / Cloud Kitchen</option>
                        <option value="Hotel">Hotel / Catering</option>
                        <option value="Retailer">Supermarket / Retail Chain</option>
                        <option value="Processor">Food Processor</option>
                        <option value="Exporter">Exporter</option>
                        <option value="Other">Other Enterprise</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        GSTIN Number (Optional)
                      </label>
                      <input
                        type="text"
                        maxLength={15}
                        value={gstin}
                        onChange={(e) => setGstin(e.target.value.toUpperCase())}
                        placeholder="27AAAAA0000A1Z5"
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-mono font-medium text-gray-900 uppercase focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Contact Person
                      </label>
                      <input
                        type="text"
                        value={contactPerson}
                        onChange={(e) => setContactPerson(e.target.value)}
                        placeholder="e.g. Amit Verma (Purchase Head)"
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Registered Business Address
                      </label>
                      <input
                        type="text"
                        value={businessAddress}
                        onChange={(e) => setBusinessAddress(e.target.value)}
                        placeholder="e.g. Unit 4, Agro Market Hub, APMC Market"
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Modal Footer Buttons */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
            {onOpenPhotoModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPhotoModal();
                }}
                className="text-xs font-bold text-emerald-800 hover:text-emerald-900 flex items-center gap-1.5"
              >
                <span>📸</span>
                <span>Change Photo</span>
              </button>
            )}

            <div className="flex items-center gap-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-2.5 text-xs font-black text-white hover:from-emerald-500 hover:to-emerald-600 shadow-md shadow-emerald-800/20 transition-all disabled:opacity-50 btn-spring flex items-center gap-2 cursor-pointer"
              >
                {isSaving && <span className="animate-spin text-sm">⏳</span>}
                <span>{isSaving ? "Saving..." : "Save Changes"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
