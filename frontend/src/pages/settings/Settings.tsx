import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/auth.service";
import UserProfileModal from "@/components/common/UserProfileModal";
import type { BuyerType, NotificationPreferences, SavedAddress, UserSettings } from "@/types/auth";

type SettingsTab =
  | "account"
  | "buyer-type"
  | "notifications"
  | "language"
  | "location"
  | "preferences"
  | "security"
  | "support";

export default function Settings() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, updateSettings, logout } = useAuth();

  const isFarmer = user?.role === "farmer";
  const isBuyer = user?.role === "buyer";
  const isAdmin = user?.role === "admin";
  const isBusiness = isBuyer && user?.buyerType === "business";

  const [activeTab, setActiveTab] = useState<SettingsTab>("account");
  const [showProfileModal, setShowProfileModal] = useState(false);

type FormUserSettings = UserSettings & {
  notifications: NotificationPreferences;
  privacy: NonNullable<UserSettings["privacy"]>;
  farmerPreferences: NonNullable<UserSettings["farmerPreferences"]>;
  procurementPreferences: NonNullable<UserSettings["procurementPreferences"]>;
};

  // Form states for settings
  const [settings, setSettings] = useState<FormUserSettings>({
    notifications: {
      email: true,
      sms: true,
      inApp: true,
      orderUpdates: true,
      priceAlerts: true,
      weatherAlerts: true,
      bulkDemandAlerts: true,
      marketing: false,
    },
    language: (user?.preferredLanguage as "en" | "hi" | "mr") || "en",
    currency: "INR",
    unit: "kg",
    dateFormat: "DD/MM/YYYY",
    farmerPreferences: {
      defaultListingCategory: "Vegetables",
      autoAcceptOffers: false,
      notifyOnNewOffers: true,
      lowStockThresholdKg: 20,
    },
    procurementPreferences: {
      preferredCategories: ["Vegetables", "Grains"],
      preferredPaymentTerm: "Escrow (Full Advance)",
      minOrderQuantityKg: 50,
      autoNotifyMatchingListings: true,
    },
    privacy: {
      profileVisibility: "public",
      showExactLocation: true,
      showPhoneNumber: true,
    },
  });

  const [addresses, setAddresses] = useState<SavedAddress[]>([]);

  // Feedback states
  const [isSaving, setIsSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modals
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Delete Account Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Address Modal
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addrLabel, setAddrLabel] = useState("Home");
  const [addrStreet, setAddrStreet] = useState("");
  const [addrLandmark, setAddrLandmark] = useState("");
  const [addrDistrict, setAddrDistrict] = useState("");
  const [addrState, setAddrState] = useState("Maharashtra");
  const [addrPincode, setAddrPincode] = useState("");
  const [addrPhone, setAddrPhone] = useState("");
  const [addrIsDefault, setAddrIsDefault] = useState(false);

  // Support ticket form
  const [supportCategory, setSupportCategory] = useState("Listing Issue");
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [supportSuccess, setSupportSuccess] = useState(false);

  // Auto-fill user settings on load
  useEffect(() => {
    if (user) {
      if (user.settings) {
        setSettings((prev) => ({
          ...prev,
          ...user.settings,
          notifications: {
            ...prev.notifications,
            ...(user.settings?.notifications || {}),
          },
          farmerPreferences: {
            ...prev.farmerPreferences,
            ...(user.settings?.farmerPreferences || {}),
          },
          procurementPreferences: {
            ...prev.procurementPreferences,
            ...(user.settings?.procurementPreferences || {}),
          },
          privacy: {
            ...prev.privacy,
            ...(user.settings?.privacy || {}),
          },
        }));
      }
      if (user.savedAddresses) {
        setAddresses(user.savedAddresses);
      }
    }
  }, [user]);

  function showToast(text: string, type: "success" | "error" = "success") {
    setToastMsg({ type, text });
    setTimeout(() => {
      setToastMsg(null);
    }, 4000);
  }

  // Handle saving general settings
  async function handleSaveSettings() {
    setIsSaving(true);
    try {
      await updateSettings({
        settings,
        savedAddresses: addresses,
      });

      // Synchronize i18n language if changed
      if (settings.language && settings.language !== i18n.language) {
        await i18n.changeLanguage(settings.language);
      }

      showToast(t("settings.savedSuccess", "Settings updated successfully!"), "success");
    } catch (err: any) {
      showToast(err.response?.data?.message || t("common.failedToSave", "Failed to save settings"), "error");
    } finally {
      setIsSaving(false);
    }
  }

  // Handle buyer type mode switch
  async function handleBuyerTypeSwitch(newType: BuyerType) {
    if (user?.buyerType === newType) return;
    setIsSaving(true);
    try {
      await updateSettings({ buyerType: newType });
      showToast(
        newType === "business"
          ? "Switched to B2B Business Buyer mode. Wholesale access enabled."
          : "Switched to Household Consumer mode. Your business records and bulk orders remain securely preserved.",
        "success"
      );
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to switch buyer type", "error");
    } finally {
      setIsSaving(false);
    }
  }

  // Handle Change Password
  async function handleChangePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword) {
      setPasswordError("Current password is required.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await authService.changePassword(currentPassword, newPassword);
      setPasswordSuccess(res.message || "Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPasswordSuccess("");
      }, 1800);
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || "Failed to update password. Check your current password.");
    } finally {
      setIsChangingPassword(false);
    }
  }

  // Handle Delete Account
  async function handleDeleteAccountSubmit(e: React.FormEvent) {
    e.preventDefault();
    setDeleteError("");
    if (deleteConfirmText.trim().toUpperCase() !== "DELETE") {
      setDeleteError('Please type "DELETE" to confirm account deactivation.');
      return;
    }
    if (!deletePassword) {
      setDeleteError("Password is required to confirm account deactivation.");
      return;
    }

    setIsDeleting(true);
    try {
      await authService.deleteAccount(deletePassword);
      await logout();
      navigate("/login");
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || "Incorrect password or failed to delete account.");
      setIsDeleting(false);
    }
  }

  // Handle Address Save
  async function handleSaveAddress(e: React.FormEvent) {
    e.preventDefault();
    if (!addrStreet || !addrDistrict || !addrPincode) {
      showToast("Street, district, and pincode are required.", "error");
      return;
    }

    let updatedAddrs = [...addresses];

    // If marked as default, unset other defaults
    if (addrIsDefault) {
      updatedAddrs = updatedAddrs.map((a) => ({ ...a, isDefault: false }));
    }

    if (editingAddressId) {
      updatedAddrs = updatedAddrs.map((a) =>
        a.id === editingAddressId
          ? {
              ...a,
              label: addrLabel,
              street: addrStreet,
              landmark: addrLandmark,
              district: addrDistrict,
              state: addrState,
              pincode: addrPincode,
              phone: addrPhone,
              isDefault: addrIsDefault,
            }
          : a
      );
    } else {
      const newAddr: SavedAddress = {
        id: "addr_" + Date.now(),
        label: addrLabel,
        street: addrStreet,
        landmark: addrLandmark,
        district: addrDistrict,
        state: addrState,
        pincode: addrPincode,
        phone: addrPhone || user?.phone || "",
        isDefault: addrIsDefault || addresses.length === 0,
      };
      updatedAddrs.push(newAddr);
    }

    setAddresses(updatedAddrs);
    setIsAddressModalOpen(false);

    // Auto-save addresses to backend
    try {
      await updateSettings({ savedAddresses: updatedAddrs });
      showToast("Delivery address saved successfully!", "success");
    } catch {
      showToast("Address saved locally. Click 'Save All Changes' to sync.", "error");
    }
  }

  function handleOpenAddAddress() {
    setEditingAddressId(null);
    setAddrLabel("Home");
    setAddrStreet("");
    setAddrLandmark("");
    setAddrDistrict(user?.district || "");
    setAddrState("Maharashtra");
    setAddrPincode("");
    setAddrPhone(user?.phone || "");
    setAddrIsDefault(addresses.length === 0);
    setIsAddressModalOpen(true);
  }

  function handleOpenEditAddress(addr: SavedAddress) {
    setEditingAddressId(addr.id || null);
    setAddrLabel(addr.label || "");
    setAddrStreet(addr.street);
    setAddrLandmark(addr.landmark || "");
    setAddrDistrict(addr.district);
    setAddrState(addr.state || "Maharashtra");
    setAddrPincode(addr.pincode);
    setAddrPhone(addr.phone || "");
    setAddrIsDefault(Boolean(addr.isDefault));
    setIsAddressModalOpen(true);
  }

  async function handleDeleteAddress(id?: string) {
    if (!id) return;
    const updated = addresses.filter((a) => a.id !== id);
    setAddresses(updated);
    try {
      await updateSettings({ savedAddresses: updated });
      showToast("Address removed.", "success");
    } catch {
      showToast("Failed to remove address.", "error");
    }
  }

  async function handleSetDefaultAddress(id?: string) {
    if (!id) return;
    const updated = addresses.map((a) => ({
      ...a,
      isDefault: a.id === id,
    }));
    setAddresses(updated);
    try {
      await updateSettings({ savedAddresses: updated });
      showToast("Default address updated.", "success");
    } catch {
      showToast("Failed to update default address.", "error");
    }
  }

  // Handle Support Ticket Submit
  async function handleSupportSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supportSubject.trim() || !supportMessage.trim()) {
      showToast("Please provide both a subject and a message.", "error");
      return;
    }
    setSupportSubmitting(true);
    try {
      await authService.reportIssue({
        category: supportCategory,
        subject: supportSubject,
        message: supportMessage,
      });
      setSupportSuccess(true);
      setSupportSubject("");
      setSupportMessage("");
      showToast("Your support ticket has been dispatched to KrishiBazaar Desk!", "success");
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to submit ticket. Please try again.", "error");
    } finally {
      setSupportSubmitting(false);
    }
  }

  const navItemsList: { id: SettingsTab; label: string; icon: string; hide?: boolean; badge?: string }[] = [
    { id: "account", label: "Account & Login", icon: "👤" },
    {
      id: "buyer-type",
      label: "Buyer Mode",
      icon: "🏢",
      hide: !isBuyer,
      badge: isBusiness ? "B2B" : "Retail",
    },
    { id: "notifications", label: "Notifications", icon: "🔔" },
    { id: "language", label: "Language & Region", icon: "🌐" },
    { id: "location", label: isFarmer ? "Farm Location" : "Delivery Addresses", icon: "📍" },
    { id: "preferences", label: "Marketplace Preferences", icon: "🎛️" },
    { id: "security", label: "Privacy & Security", icon: "🔒" },
    { id: "support", label: "Help & Support", icon: "❓" },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] py-8 px-4 sm:px-6 lg:px-8">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div
            className={`rounded-2xl px-5 py-3.5 shadow-2xl flex items-center gap-3 text-sm font-semibold border ${
              toastMsg.type === "success"
                ? "bg-emerald-900 text-emerald-100 border-emerald-700"
                : "bg-red-900 text-red-100 border-red-700"
            }`}
          >
            <span>{toastMsg.type === "success" ? "✅" : "⚠️"}</span>
            <span>{toastMsg.text}</span>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">⚙️</span>
              <h1
                className="text-2xl font-bold tracking-tight text-gray-900"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Settings & Preferences
              </h1>
            </div>
            <p className="text-sm text-gray-500">
              Manage your credentials, notification channels, marketplace view, and regional configurations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSaving ? (
                <>
                  <span className="animate-spin text-xs">⏳</span>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>💾</span>
                  <span>Save All Changes</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Profile Card Banner - Clarifies Profile vs Settings distinction */}
        <div className="mb-8 rounded-2xl bg-gradient-to-r from-emerald-800 to-emerald-950 p-4 sm:p-5 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-2xl shrink-0 backdrop-blur-xs">
              {isFarmer ? "🌾" : isBusiness ? "🏢" : "🛒"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">{user?.name || "Krishi User"}</h2>
                <span className="rounded-full bg-emerald-700/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-200 border border-emerald-500/30">
                  {isFarmer
                    ? "Farmer / Producer"
                    : isBusiness
                    ? "Wholesale Business Buyer"
                    : isAdmin
                    ? "Administrator"
                    : "Household Consumer"}
                </span>
              </div>
              <p className="text-xs text-emerald-200/90 mt-0.5">
                {isFarmer
                  ? `Farm: ${user?.farmProfile?.farmName || "Direct Farm"} • District: ${user?.district || "Maharashtra"}`
                  : isBusiness
                  ? `Business: ${user?.businessProfile?.businessName || "Bulk Procurement"} • GSTIN: ${user?.businessProfile?.gstin || "Not Registered"}`
                  : `District: ${user?.district || "Maharashtra"} • Direct Produce Buyer`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowProfileModal(true)}
            className="self-start sm:self-center inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2 text-xs font-semibold text-white border border-white/20 transition-colors cursor-pointer"
          >
            <span>✏️</span>
            <span>Edit Farm & Personal Profile</span>
          </button>
        </div>

        {/* Main 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Left Navigation Tabs (Desktop) / Chips (Mobile) */}
          <div className="lg:col-span-1">
            {/* Mobile Category Select */}
            <div className="lg:hidden mb-4">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Settings Menu
              </label>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {navItemsList
                  .filter((item) => !item.hide)
                  .map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={`shrink-0 flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                        activeTab === item.id
                          ? "bg-emerald-800 text-white shadow-sm"
                          : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
              </div>
            </div>

            {/* Desktop Vertical Nav List */}
            <div className="hidden lg:flex flex-col gap-1 rounded-2xl bg-white p-2.5 border border-gray-200/80 shadow-xs">
              <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 px-3 py-2">
                Preferences & System
              </span>
              {navItemsList
                .filter((item) => !item.hide)
                .map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? "bg-emerald-50 text-emerald-900 shadow-2xs font-bold border border-emerald-200/60"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{item.icon}</span>
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-800">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Right Content Panel */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl bg-white p-6 border border-gray-200/80 shadow-xs min-h-[500px]">
              {/* ========================================================= */}
              {/* TAB 1: ACCOUNT & LOGIN */}
              {/* ========================================================= */}
              {activeTab === "account" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <span>👤</span> Account Information & Credentials
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                      View your registered credentials, account role, and security access methods.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-gray-200 p-4 bg-gray-50/50">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                        Primary Email Address
                      </span>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-sm font-semibold text-gray-900">{user?.email || "No email linked"}</p>
                        <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                          Verified
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">Used for order confirmations and security alerts.</p>
                    </div>

                    <div className="rounded-xl border border-gray-200 p-4 bg-gray-50/50">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                        Registered Phone (SMS / OTP)
                      </span>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-sm font-semibold text-gray-900">{user?.phone || "No phone linked"}</p>
                        <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                          +91 Verified
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">Direct communication with farmers and buyers.</p>
                    </div>

                    <div className="rounded-xl border border-gray-200 p-4 bg-gray-50/50">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                        Account Role & Authorization
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-bold text-gray-900 capitalize">{user?.role}</span>
                        <span className="rounded-full bg-emerald-50 border border-emerald-300 text-emerald-900 text-[10px] font-black px-2 py-0.5">
                          {isFarmer ? "🌾 Farmer" : isBusiness ? "🏢 Business Buyer" : "🛒 Household"}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">Verified role controls marketplace pricing privileges.</p>
                    </div>

                    <div className="rounded-xl border border-gray-200 p-4 bg-gray-50/50">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                        Authentication Status
                      </span>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-sm font-semibold text-gray-900">Encrypted Password</p>
                        <button
                          type="button"
                          onClick={() => setIsPasswordModalOpen(true)}
                          className="text-xs font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                        >
                          Change Password
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">Protected with bcrypt multi-round hash.</p>
                    </div>
                  </div>

                  {/* Profile Edit Callout */}
                  <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xs font-bold text-emerald-950">Looking to update your profile details?</h3>
                      <p className="text-[11px] text-emerald-800 mt-0.5">
                        Your public bio, farm size, crops grown, business address, and GSTIN are managed in your Profile.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowProfileModal(true)}
                      className="rounded-lg bg-emerald-700 hover:bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition-colors shrink-0 cursor-pointer"
                    >
                      Open Profile Editor
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 2: BUYER TYPE MODE (BUYERS ONLY) */}
              {/* ========================================================= */}
              {activeTab === "buyer-type" && isBuyer && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <span>🏢</span> Buyer Purchasing Mode
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                      Choose between retail direct-to-home ordering and wholesale B2B lot sourcing.
                    </p>
                  </div>

                  {/* Notice explaining non-destructive switch */}
                  <div className="rounded-xl bg-blue-50/80 border border-blue-200 p-3.5 text-xs text-blue-900 flex items-start gap-2.5">
                    <span className="text-base">ℹ️</span>
                    <div>
                      <p className="font-bold">Seamless Multi-Mode Switching</p>
                      <p className="mt-0.5 text-blue-800/90 text-[11px]">
                        Switching to Household mode never deletes your business profile, GSTIN, bulk demands, or negotiated wholesale quotes. You can freely toggle between modes whenever you need to purchase for family or commercial operations.
                      </p>
                    </div>
                  </div>

                  {/* Mode Selection Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Household Option */}
                    <div
                      onClick={() => handleBuyerTypeSwitch("household")}
                      className={`rounded-2xl p-5 border-2 transition-all cursor-pointer ${
                        !isBusiness
                          ? "border-emerald-600 bg-emerald-50/40 shadow-sm"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">🛒</span>
                          <div>
                            <h3 className="text-sm font-bold text-gray-900">Household Consumer</h3>
                            <span className="text-[10px] text-gray-500">For daily household kitchen supply</span>
                          </div>
                        </div>
                        <input
                          type="radio"
                          name="buyerType"
                          checked={!isBusiness}
                          onChange={() => handleBuyerTypeSwitch("household")}
                          className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                        />
                      </div>
                      <ul className="space-y-1.5 text-xs text-gray-600">
                        <li className="flex items-center gap-2">
                          <span className="text-emerald-600">✓</span> Retail quantities (1 kg, 5 kg, dozens)
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-emerald-600">✓</span> Instant standard Razorpay / UPI checkout
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-emerald-600">✓</span> Doorstep home delivery addresses
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-emerald-600">✓</span> Blockchain QR code authenticity scanning
                        </li>
                      </ul>
                    </div>

                    {/* Business Option */}
                    <div
                      onClick={() => handleBuyerTypeSwitch("business")}
                      className={`rounded-2xl p-5 border-2 transition-all cursor-pointer ${
                        isBusiness
                          ? "border-emerald-600 bg-emerald-50/40 shadow-sm"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">🏢</span>
                          <div>
                            <h3 className="text-sm font-bold text-gray-900">Business / Wholesale</h3>
                            <span className="text-[10px] text-gray-500">Retailers, Hotels, Mandi Wholesalers</span>
                          </div>
                        </div>
                        <input
                          type="radio"
                          name="buyerType"
                          checked={isBusiness}
                          onChange={() => handleBuyerTypeSwitch("business")}
                          className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                        />
                      </div>
                      <ul className="space-y-1.5 text-xs text-gray-600">
                        <li className="flex items-center gap-2">
                          <span className="text-emerald-600">✓</span> Post custom Bulk Procurement Demands
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-emerald-600">✓</span> Negotiate volume prices directly with farmers
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-emerald-600">✓</span> Dedicated B2B Wholesale Portal & Mandi Intelligence
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-emerald-600">✓</span> GST Tax Invoicing & Bulk Freight Delivery
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 3: NOTIFICATION PREFERENCES */}
              {/* ========================================================= */}
              {activeTab === "notifications" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <span>🔔</span> Notification Preferences
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                      Choose which channels and real-time triggers send you alerts.
                    </p>
                  </div>

                  {/* Delivery Channels */}
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3">
                      Notification Channels
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200 bg-gray-50/50 cursor-pointer hover:bg-emerald-50/30 transition-colors">
                        <div>
                          <p className="text-xs font-bold text-gray-900">Email Alerts</p>
                          <p className="text-[10px] text-gray-500">Order receipts & digests</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.notifications.email}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              notifications: { ...settings.notifications, email: e.target.checked },
                            })
                          }
                          className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                        />
                      </label>

                      <label className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200 bg-gray-50/50 cursor-pointer hover:bg-emerald-50/30 transition-colors">
                        <div>
                          <p className="text-xs font-bold text-gray-900">SMS / WhatsApp</p>
                          <p className="text-[10px] text-gray-500">Urgent dispatch alerts</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.notifications.sms}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              notifications: { ...settings.notifications, sms: e.target.checked },
                            })
                          }
                          className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                        />
                      </label>

                      <label className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200 bg-gray-50/50 cursor-pointer hover:bg-emerald-50/30 transition-colors">
                        <div>
                          <p className="text-xs font-bold text-gray-900">In-App Popups</p>
                          <p className="text-[10px] text-gray-500">Dashboard bell badges</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.notifications.inApp}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              notifications: { ...settings.notifications, inApp: e.target.checked },
                            })
                          }
                          className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Triggered Events */}
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3">
                      Event Alerts ({isFarmer ? "Farmer Specialized" : isBusiness ? "B2B Specialized" : "Consumer Specialized"})
                    </h3>
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:bg-gray-50">
                        <div>
                          <p className="text-xs font-bold text-gray-900">📦 Order Placed & Dispatch Deadlines</p>
                          <p className="text-[11px] text-gray-500">
                            Immediate notification when an order is created, confirmed, or out for delivery.
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.notifications.orderUpdates}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              notifications: { ...settings.notifications, orderUpdates: e.target.checked },
                            })
                          }
                          className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:bg-gray-50">
                        <div>
                          <p className="text-xs font-bold text-gray-900">💰 Price Offers & Counter Negotiations</p>
                          <p className="text-[11px] text-gray-500">
                            Receive updates when counterparties accept, decline, or counter a negotiated rate.
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.notifications.priceAlerts}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              notifications: { ...settings.notifications, priceAlerts: e.target.checked },
                            })
                          }
                          className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                        />
                      </div>

                      {isFarmer && (
                        <>
                          <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:bg-gray-50">
                            <div>
                              <p className="text-xs font-bold text-gray-900">🌦️ IMD Severe Weather & Rain Advisory</p>
                              <p className="text-[11px] text-gray-500">
                                Real-time rainfall warnings, frost alerts, and harvesting window recommendations.
                              </p>
                            </div>
                            <input
                              type="checkbox"
                              checked={settings.notifications.weatherAlerts}
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  notifications: { ...settings.notifications, weatherAlerts: e.target.checked },
                                })
                              }
                              className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                            />
                          </div>

                          <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:bg-gray-50">
                            <div>
                              <p className="text-xs font-bold text-gray-900">🏢 Relevant Wholesale Bulk Demands</p>
                              <p className="text-[11px] text-gray-500">
                                Alert when hotel/retail buyers post a large demand matching your primary crops.
                              </p>
                            </div>
                            <input
                              type="checkbox"
                              checked={settings.notifications.bulkDemandAlerts}
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  notifications: { ...settings.notifications, bulkDemandAlerts: e.target.checked },
                                })
                              }
                              className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                            />
                          </div>
                        </>
                      )}

                      {!isFarmer && (
                        <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:bg-gray-50">
                          <div>
                            <p className="text-xs font-bold text-gray-900">🏷️ Harvest Drops & Farmer Promotions</p>
                            <p className="text-[11px] text-gray-500">
                              Be the first to know when certified organic farms near your district launch fresh harvests.
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            checked={settings.notifications.marketing}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                notifications: { ...settings.notifications, marketing: e.target.checked },
                              })
                            }
                            className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 4: LANGUAGE & REGIONAL SETTINGS */}
              {/* ========================================================= */}
              {activeTab === "language" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <span>🌐</span> Language & Regional Settings
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                      Customize UI localization, currency units, weight standards, and date formatting.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Interface Display Language
                      </label>
                      <select
                        value={settings.language}
                        onChange={(e) => {
                          const lang = e.target.value as "en" | "hi" | "mr";
                          setSettings({ ...settings, language: lang });
                          i18n.changeLanguage(lang);
                        }}
                        className="w-full rounded-xl border border-gray-300 p-2.5 text-xs text-gray-900 focus:border-emerald-500 focus:outline-hidden"
                      >
                        <option value="en">English (India)</option>
                        <option value="hi">हिन्दी (Hindi)</option>
                        <option value="mr">मराठी (Marathi)</option>
                      </select>
                      <p className="text-[11px] text-gray-400 mt-1">
                        Applies instantly across dashboards, listings, and receipts.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Default Weight & Quantity Unit
                      </label>
                      <select
                        value={settings.unit}
                        onChange={(e) =>
                          setSettings({ ...settings, unit: e.target.value as "kg" | "quintal" | "ton" })
                        }
                        className="w-full rounded-xl border border-gray-300 p-2.5 text-xs text-gray-900 focus:border-emerald-500 focus:outline-hidden"
                      >
                        <option value="kg">Kilograms (kg) - Standard Retail</option>
                        <option value="quintal">Quintal (100 kg) - Wholesale Mandi Standard</option>
                        <option value="ton">Metric Ton (1,000 kg) - Freight Lot</option>
                      </select>
                      <p className="text-[11px] text-gray-400 mt-1">
                        Preferred unit shown on marketplace cards and quotes.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Currency & Pricing Representation
                      </label>
                      <select
                        value={settings.currency}
                        onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                        className="w-full rounded-xl border border-gray-300 p-2.5 text-xs text-gray-900 focus:border-emerald-500 focus:outline-hidden"
                      >
                        <option value="INR">₹ Indian Rupee (INR)</option>
                      </select>
                      <p className="text-[11px] text-gray-400 mt-1">
                        All payments are settled via domestic Indian Banking & UPI.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Calendar & Date Formatting
                      </label>
                      <select
                        value={settings.dateFormat}
                        onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })}
                        className="w-full rounded-xl border border-gray-300 p-2.5 text-xs text-gray-900 focus:border-emerald-500 focus:outline-hidden"
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY (Indian Standard)</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      </select>
                      <p className="text-[11px] text-gray-400 mt-1">
                        Applied to harvest dates, offer expiries, and dispatch logs.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 5: LOCATION & ADDRESSES */}
              {/* ========================================================= */}
              {activeTab === "location" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span>📍</span> {isFarmer ? "Farm Location & Weather Sync" : "Saved Delivery Addresses"}
                      </h2>
                      <p className="text-xs text-gray-500 mt-1">
                        {isFarmer
                          ? "Verify the geographical center of your farm for hyperlocal IMD forecasts and buyer logistics."
                          : "Manage delivery addresses for doorstep dispatch and wholesale freight logistics."}
                      </p>
                    </div>

                    {!isFarmer && (
                      <button
                        type="button"
                        onClick={handleOpenAddAddress}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-600 transition-all shrink-0 cursor-pointer"
                      >
                        <span>+</span>
                        <span>Add New Address</span>
                      </button>
                    )}
                  </div>

                  {/* Farmer Location Section */}
                  {isFarmer && (
                    <div className="rounded-2xl border border-gray-200 p-5 bg-gray-50/50 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                            Primary Harvest Origin
                          </h3>
                          <p className="text-sm font-bold text-gray-900 mt-0.5">
                            {user?.farmProfile?.farmAddress || `${user?.district || "Nashik"}, Maharashtra`}
                          </p>
                        </div>
                        <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1">
                          📡 GPS Synced
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-white rounded-xl border border-gray-200">
                          <span className="text-gray-400 font-semibold block text-[10px]">CURRENT DISTRICT</span>
                          <span className="font-bold text-gray-800 text-sm">{user?.district || "Not set"}</span>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-gray-200">
                          <span className="text-gray-400 font-semibold block text-[10px]">COORDINATES (LNG, LAT)</span>
                          <span className="font-mono text-gray-800 text-xs">
                            {user?.location?.coordinates?.length === 2
                              ? `${user.location.coordinates[0].toFixed(4)}, ${user.location.coordinates[1].toFixed(4)}`
                              : "Auto-detected"}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>🌤️</span>
                          <span>IMD Agrometeorological Advisory station synchronized for this coordinate.</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowProfileModal(true)}
                          className="font-bold underline text-emerald-800 hover:text-emerald-950 cursor-pointer"
                        >
                          Update Location
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Buyer Saved Addresses List */}
                  {!isFarmer && (
                    <div className="space-y-3">
                      {addresses.length === 0 ? (
                        <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-2xl">
                          <span className="text-3xl block mb-2">🏠</span>
                          <p className="text-xs font-bold text-gray-700">No saved addresses yet</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            Add your home, office, or warehouse delivery locations.
                          </p>
                          <button
                            type="button"
                            onClick={handleOpenAddAddress}
                            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-600 transition-all cursor-pointer"
                          >
                            Add Address
                          </button>
                        </div>
                      ) : (
                        addresses.map((addr) => (
                          <div
                            key={addr.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-gray-300 bg-white gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black uppercase tracking-wider text-gray-900">
                                  {addr.label}
                                </span>
                                {addr.isDefault && (
                                  <span className="rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-2 py-0.5">
                                    Default Delivery
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-700">
                                {addr.street}, {addr.landmark ? `${addr.landmark}, ` : ""}
                                {addr.district}, {addr.state} - {addr.pincode}
                              </p>
                              {addr.phone && (
                                <p className="text-[11px] text-gray-400">Contact: {addr.phone}</p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-center">
                              {!addr.isDefault && (
                                <button
                                  type="button"
                                  onClick={() => handleSetDefaultAddress(addr.id)}
                                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 px-2 py-1 rounded-md hover:bg-emerald-50 cursor-pointer"
                                >
                                  Make Default
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpenEditAddress(addr)}
                                className="text-xs font-semibold text-gray-600 hover:text-gray-900 px-2 py-1 rounded-md hover:bg-gray-100 cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteAddress(addr.id)}
                                className="text-xs font-semibold text-red-600 hover:text-red-700 px-2 py-1 rounded-md hover:bg-red-50 cursor-pointer"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 6: MARKETPLACE & APP PREFERENCES */}
              {/* ========================================================= */}
              {activeTab === "preferences" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <span>🎛️</span> Marketplace Preferences
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                      Customize how crop listings and wholesale procurement tables are presented to you.
                    </p>
                  </div>

                  {/* Farmer Specific Preferences */}
                  {isFarmer && (
                    <div className="space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">
                        Farmer Production Defaults
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            Default New Listing Category
                          </label>
                          <select
                            value={settings.farmerPreferences?.defaultListingCategory || "Vegetables"}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                farmerPreferences: {
                                  ...settings.farmerPreferences,
                                  defaultListingCategory: e.target.value,
                                },
                              })
                            }
                            className="w-full rounded-xl border border-gray-300 p-2.5 text-xs text-gray-900 focus:border-emerald-500 focus:outline-hidden"
                          >
                            <option value="Vegetables">Vegetables (भाजीपाला)</option>
                            <option value="Fruits">Fruits (फळे)</option>
                            <option value="Grains">Grains & Cereals (धान्य)</option>
                            <option value="Pulses">Pulses & Dal (कडधान्ये)</option>
                            <option value="Spices">Spices & Condiments (मसाले)</option>
                            <option value="Organic">Certified Organic Produce</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            Low Stock Warning Threshold (kg)
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={settings.farmerPreferences?.lowStockThresholdKg ?? 20}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                farmerPreferences: {
                                  ...settings.farmerPreferences,
                                  lowStockThresholdKg: Number(e.target.value),
                                },
                              })
                            }
                            className="w-full rounded-xl border border-gray-300 p-2.5 text-xs text-gray-900 focus:border-emerald-500 focus:outline-hidden"
                          />
                          <p className="text-[10px] text-gray-400 mt-1">
                            Trigger amber badge when available stock dips below this value.
                          </p>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl border border-gray-200 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-gray-900">Notify When Buyer Counters an Offer</p>
                          <p className="text-[11px] text-gray-500">
                            Instant pop-up alert when wholesale buyer proposes a revised price or quantity.
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.farmerPreferences?.notifyOnNewOffers ?? true}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              farmerPreferences: {
                                ...settings.farmerPreferences,
                                notifyOnNewOffers: e.target.checked,
                              },
                            })
                          }
                          className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Buyer Specific Preferences */}
                  {!isFarmer && (
                    <div className="space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">
                        Procurement & Sourcing Filters
                      </h3>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-2">
                          Interested Produce Categories
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {["Vegetables", "Fruits", "Grains", "Pulses", "Spices", "Organic"].map((cat) => {
                            const isSelected =
                              settings.procurementPreferences?.preferredCategories?.includes(cat) ?? false;
                            return (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => {
                                  const cur = settings.procurementPreferences?.preferredCategories || [];
                                  const updated = isSelected
                                    ? cur.filter((c: string) => c !== cat)
                                    : [...cur, cat];
                                  setSettings({
                                    ...settings,
                                    procurementPreferences: {
                                      ...settings.procurementPreferences,
                                      preferredCategories: updated,
                                    },
                                  });
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                  isSelected
                                    ? "bg-emerald-700 text-white shadow-2xs"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                              >
                                {cat}
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1.5">
                          Prioritizes fresh harvests matching your chosen categories on the marketplace homepage.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl border border-gray-200 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-gray-900">Auto-Highlight Local District Harvests</p>
                          <p className="text-[11px] text-gray-500">
                            Puts farms located within 50 km at the top of your search results to lower freight transit times.
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.procurementPreferences?.autoNotifyMatchingListings ?? true}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              procurementPreferences: {
                                ...settings.procurementPreferences,
                                autoNotifyMatchingListings: e.target.checked,
                              },
                            })
                          }
                          className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 7: PRIVACY & SECURITY */}
              {/* ========================================================= */}
              {activeTab === "security" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <span>🔒</span> Privacy & Security Controls
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                      Manage password authentication, active device sessions, and account lifecycle.
                    </p>
                  </div>

                  {/* Password & Credential Management */}
                  <div className="rounded-xl border border-gray-200 p-4 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xs font-bold text-gray-900">Account Password</h3>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Ensure your account is protected with a secure, unique password.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPasswordModalOpen(true)}
                      className="rounded-xl bg-gray-900 hover:bg-black px-4 py-2 text-xs font-bold text-white shadow-2xs transition-colors shrink-0 cursor-pointer"
                    >
                      Update Password
                    </button>
                  </div>

                  {/* Privacy Controls */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">
                      Visibility Permissions
                    </h3>

                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200">
                      <div>
                        <p className="text-xs font-bold text-gray-900">Display Phone Number on Listings & Invoices</p>
                        <p className="text-[11px] text-gray-500">
                          Allows verified counterparties to contact you directly via call or WhatsApp.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.privacy?.showPhoneNumber ?? true}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            privacy: { ...settings.privacy, showPhoneNumber: e.target.checked },
                          })
                        }
                        className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200">
                      <div>
                        <p className="text-xs font-bold text-gray-900">Show Precise Farm Coordinates</p>
                        <p className="text-[11px] text-gray-500">
                          When disabled, buyers only see your district name rather than pinpoint farm GPS.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.privacy?.showExactLocation ?? true}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            privacy: { ...settings.privacy, showExactLocation: e.target.checked },
                          })
                        }
                        className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Active Session & Logout */}
                  <div className="rounded-xl border border-gray-200 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-gray-900">Active Web Session</h3>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Currently authenticated on this browser with JWT secure cookie.
                        </p>
                      </div>
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        Active Now
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        await logout();
                        navigate("/login");
                      }}
                      className="text-xs font-bold text-red-600 hover:text-red-700 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>🚪</span> Log out of current session
                    </button>
                  </div>

                  {/* Danger Zone */}
                  <div className="rounded-xl border border-red-200 bg-red-50/40 p-4">
                    <h3 className="text-xs font-bold text-red-900 uppercase tracking-wider">Danger Zone</h3>
                    <p className="text-xs text-red-700/90 mt-1">
                      Permanently deactivate your account. All active harvest listings will be paused and your profile will be disabled.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError("");
                        setDeletePassword("");
                        setDeleteConfirmText("");
                        setIsDeleteModalOpen(true);
                      }}
                      className="mt-3 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-bold px-4 py-2 transition-colors cursor-pointer"
                    >
                      Delete / Deactivate Account
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 8: HELP & SUPPORT */}
              {/* ========================================================= */}
              {activeTab === "support" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <span>❓</span> Help & Support Center
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                      Find answers to common agricultural marketplace questions or reach out directly to our support desk.
                    </p>
                  </div>

                  {/* Emergency Helpline Contacts */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
                      <span className="text-xl block mb-1">📞</span>
                      <p className="text-xs font-bold text-gray-900">Kisan Call Helpline</p>
                      <p className="text-sm font-black text-emerald-800 mt-0.5">1800-180-1551</p>
                      <p className="text-[10px] text-gray-400 mt-1">Toll-free, Mon - Sat (6 AM - 10 PM)</p>
                    </div>

                    <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
                      <span className="text-xl block mb-1">✉️</span>
                      <p className="text-xs font-bold text-gray-900">Email Grievance Desk</p>
                      <p className="text-xs font-bold text-gray-800 mt-0.5">support@krishibazaar.in</p>
                      <p className="text-[10px] text-gray-400 mt-1">Average response time: &lt; 4 hours</p>
                    </div>

                    <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
                      <span className="text-xl block mb-1">💬</span>
                      <p className="text-xs font-bold text-gray-900">WhatsApp Assistance</p>
                      <p className="text-xs font-bold text-emerald-800 mt-0.5">+91 98200 XXXXX</p>
                      <p className="text-[10px] text-gray-400 mt-1">Immediate mandi dispatch help</p>
                    </div>
                  </div>

                  {/* FAQs */}
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3">
                      Frequently Asked Questions
                    </h3>
                    <div className="space-y-2.5">
                      <details className="group rounded-xl border border-gray-200 p-3.5 bg-white [&_summary::-webkit-details-marker]:hidden">
                        <summary className="flex items-center justify-between text-xs font-bold text-gray-900 cursor-pointer">
                          <span>How does the UPI Escrow Payment work for fresh produce?</span>
                          <span className="transition-transform group-open:rotate-180 text-gray-400">▼</span>
                        </summary>
                        <p className="text-[11px] text-gray-600 mt-2 leading-relaxed">
                          When a buyer checks out, payments are safely held in an automated escrow account. The funds are only released to the farmer once the produce arrives and quality is confirmed or the delivery window concludes without dispute.
                        </p>
                      </details>

                      <details className="group rounded-xl border border-gray-200 p-3.5 bg-white [&_summary::-webkit-details-marker]:hidden">
                        <summary className="flex items-center justify-between text-xs font-bold text-gray-900 cursor-pointer">
                          <span>How do I verify crop authenticity on the blockchain?</span>
                          <span className="transition-transform group-open:rotate-180 text-gray-400">▼</span>
                        </summary>
                        <p className="text-[11px] text-gray-600 mt-2 leading-relaxed">
                          Every harvest listing writes an immutable provenance record to the ledger, capturing harvest date, farm GPS coordinates, and organic certifications. Buyers can scan the QR code on the listing to verify origin independently.
                        </p>
                      </details>

                      <details className="group rounded-xl border border-gray-200 p-3.5 bg-white [&_summary::-webkit-details-marker]:hidden">
                        <summary className="flex items-center justify-between text-xs font-bold text-gray-900 cursor-pointer">
                          <span>Can business buyers claim GST input credit?</span>
                          <span className="transition-transform group-open:rotate-180 text-gray-400">▼</span>
                        </summary>
                        <p className="text-[11px] text-gray-600 mt-2 leading-relaxed">
                          Yes! Simply switch to Business Buyer mode in Settings, enter your registered GSTIN and company legal entity name, and official B2B tax invoices will be generated automatically for every order.
                        </p>
                      </details>
                    </div>
                  </div>

                  {/* Support Ticket Submission */}
                  <div className="rounded-2xl border border-gray-200 p-5 bg-gray-50/50">
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">
                      Report a Problem / Submit Support Ticket
                    </h3>

                    {supportSuccess && (
                      <div className="mb-4 rounded-xl bg-emerald-100 border border-emerald-300 p-3 text-xs text-emerald-900 font-semibold">
                        ✅ Ticket submitted! Our agronomist support desk will respond shortly.
                      </div>
                    )}

                    <form onSubmit={handleSupportSubmit} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Issue Category</label>
                          <select
                            value={supportCategory}
                            onChange={(e) => setSupportCategory(e.target.value)}
                            className="w-full rounded-xl border border-gray-300 p-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-hidden"
                          >
                            <option value="Listing Issue">Produce Listing Issue</option>
                            <option value="Order & Delivery">Order Dispatch & Delivery Delay</option>
                            <option value="Payment & Escrow">Payment / Escrow Inquiry</option>
                            <option value="Weather Sync">IMD Weather Sync Problem</option>
                            <option value="Account Access">Account Access & Credentials</option>
                            <option value="Other">Other Query</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Subject</label>
                          <input
                            type="text"
                            placeholder="Brief summary of the issue"
                            value={supportSubject}
                            onChange={(e) => setSupportSubject(e.target.value)}
                            className="w-full rounded-xl border border-gray-300 p-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-hidden"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Detailed Description</label>
                        <textarea
                          rows={3}
                          placeholder="Describe the issue, order ID, or question in detail..."
                          value={supportMessage}
                          onChange={(e) => setSupportMessage(e.target.value)}
                          className="w-full rounded-xl border border-gray-300 p-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-hidden"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={supportSubmitting}
                        className="rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold px-5 py-2 transition-all cursor-pointer"
                      >
                        {supportSubmitting ? "Dispatching..." : "Submit Ticket"}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL: CHANGE PASSWORD */}
      {/* ========================================================= */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-200 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span>🔒</span> Change Password
              </h3>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {passwordError && (
              <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 font-bold">
                {passwordSuccess}
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-xs text-gray-900 focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  New Password (min 6 characters)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-xs text-gray-900 focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-xs text-gray-900 focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 transition-all cursor-pointer"
                >
                  {isChangingPassword ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: DELETE ACCOUNT */}
      {/* ========================================================= */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-red-200 animate-scale-in">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-red-900 flex items-center gap-2">
                <span>⚠️</span> Confirm Account Deactivation
              </h3>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed mb-4">
              This will deactivate your account and log you out immediately. Active listings will be halted.
            </p>

            {deleteError && (
              <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                {deleteError}
              </div>
            )}

            <form onSubmit={handleDeleteAccountSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Type <span className="font-bold text-red-700">DELETE</span> to confirm:
                </label>
                <input
                  type="text"
                  required
                  placeholder="DELETE"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-xs text-gray-900 focus:border-red-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Your Account Password</label>
                <input
                  type="password"
                  required
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-xs text-gray-900 focus:border-red-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeleting}
                  className="rounded-xl bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 transition-all cursor-pointer"
                >
                  {isDeleting ? "Deactivating..." : "Deactivate Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT ADDRESS */}
      {/* ========================================================= */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-gray-200 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span>📍</span> {editingAddressId ? "Edit Delivery Address" : "Add Delivery Address"}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Address Label</label>
                  <select
                    value={addrLabel}
                    onChange={(e) => setAddrLabel(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 p-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-hidden"
                  >
                    <option value="Home">Home (घर)</option>
                    <option value="Office">Office / Shop</option>
                    <option value="Warehouse">Warehouse (गोदाम)</option>
                    <option value="Mandi Gate">Mandi Gate / APMC Yard</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="Mobile number for delivery"
                    value={addrPhone}
                    onChange={(e) => setAddrPhone(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 p-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Street Address / House No.</label>
                <input
                  type="text"
                  required
                  placeholder="Plot/Flat, Building, Street"
                  value={addrStreet}
                  onChange={(e) => setAddrStreet(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Landmark (Optional)</label>
                <input
                  type="text"
                  placeholder="Near temple, school, or APMC gate"
                  value={addrLandmark}
                  onChange={(e) => setAddrLandmark(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">District</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Nashik"
                    value={addrDistrict}
                    onChange={(e) => setAddrDistrict(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 p-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    required
                    value={addrState}
                    onChange={(e) => setAddrState(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 p-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Pincode</label>
                  <input
                    type="text"
                    required
                    placeholder="6-digit PIN"
                    value={addrPincode}
                    onChange={(e) => setAddrPincode(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 p-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addrIsDefault}
                    onChange={(e) => setAddrIsDefault(e.target.checked)}
                    className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <span className="text-xs font-semibold text-gray-700">Set as my primary delivery address</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2 transition-all cursor-pointer"
                >
                  Save Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UserProfileModal for editing personal/farmer/business details */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </div>
  );
}
