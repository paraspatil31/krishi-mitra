import { useState, useRef, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import ProfilePhotoModal from "@/components/common/ProfilePhotoModal";
import UserProfileModal from "@/components/common/UserProfileModal";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";
import { NotificationBell } from "@/components/notifications/NotificationBell";

const DEFAULT_FARMER_AVATAR =
  "https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=160&auto=format&fit=crop&q=80";
const DEFAULT_BUYER_AVATAR =
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80";

export default function Navbar() {
  const { t } = useTranslation();
  const { isAuthenticated, user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [insightsDropdownOpen, setInsightsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const insightsRef = useRef<HTMLDivElement>(null);

  function handleLogout() {
    logout();
    setProfileDropdownOpen(false);
    setMenuOpen(false);
    navigate("/");
  }

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (insightsRef.current && !insightsRef.current.contains(event.target as Node)) {
        setInsightsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `relative text-[13px] font-semibold tracking-wide transition-all duration-200 px-3.5 py-2 rounded-lg ${
      isActive
        ? "text-emerald-800 bg-emerald-50/80 font-bold"
        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
    }`;

  const mobileLinkCls = ({ isActive }: { isActive: boolean }) =>
    `flex items-center justify-between text-[15px] font-medium px-4 py-3 rounded-xl transition-all ${
      isActive
        ? "text-emerald-800 bg-emerald-50 font-semibold"
        : "text-gray-700 hover:bg-gray-50"
    }`;

  const isFarmer = user?.role === "farmer";
  const isFPO = user?.role === "fpo";
  const isBusinessBuyer = user?.role === "buyer" && user?.buyerType === "business";
  const isHouseholdBuyer = user?.role === "buyer" && (!user?.buyerType || user?.buyerType === "household");
  const canAccessWholesale = isFarmer || isFPO || isBusinessBuyer || user?.role === "admin";

  const avatarUrl = user?.avatar || (isFarmer || isFPO ? DEFAULT_FARMER_AVATAR : DEFAULT_BUYER_AVATAR);

  const displayName = user?.name
    ? /^\d+$/.test(user.name)
      ? `Kisan #${user.name.slice(-4)}`
      : isFPO
      ? user?.fpoProfile?.orgName || user.name
      : user.name
    : isFarmer
    ? t("common.kisanProducer")
    : isFPO
    ? user?.fpoProfile?.orgName || "FPO Cooperative"
    : isBusinessBuyer
    ? user?.businessProfile?.businessName || t("common.member")
    : t("common.member");

  return (
    <>
      <nav className="sticky top-0 z-50 glass-nav border-b border-gray-200/60 transition-all">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Brand Logo */}
            <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-700 shadow-sm transition-transform group-hover:scale-105">
                <span className="text-lg select-none">🌾</span>
              </div>
              <div className="flex flex-col leading-none">
                <span
                  className="text-lg font-bold tracking-tight text-gray-900"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  KrishiBazaar
                </span>
                <span className="text-[9px] font-medium tracking-widest uppercase text-emerald-700 mt-0.5">
                  {t("common.farmToTable")}
                </span>
              </div>
            </Link>

            {/* Desktop Navigation - Clean & Uncluttered */}
            <div className="hidden md:flex items-center gap-1.5">
              <NavLink to="/products" className={linkCls}>
                {t("nav.browse", "Marketplace")}
              </NavLink>

              {/* Consolidated Market Intelligence Dropdown */}
              {canAccessWholesale && (
                <div className="relative" ref={insightsRef}>
                  <button
                    type="button"
                    onClick={() => setInsightsDropdownOpen((v) => !v)}
                    className={`flex items-center gap-1.5 text-[13px] font-semibold tracking-wide transition-all duration-200 px-3 py-2 rounded-lg cursor-pointer ${
                      insightsDropdownOpen
                        ? "text-emerald-900 bg-emerald-50 font-bold"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    <span>Market Insights</span>
                    <svg
                      className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-200 ${
                        insightsDropdownOpen ? "rotate-180 text-emerald-600" : ""
                      }`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  {insightsDropdownOpen && (
                    <div className="absolute left-0 mt-2 w-72 rounded-2xl border border-gray-200/90 bg-white p-2 shadow-xl shadow-gray-900/10 z-50 animate-scale-in">
                      <Link
                        to="/mandi-prices"
                        onClick={() => setInsightsDropdownOpen(false)}
                        className="flex items-start gap-3 rounded-xl p-2.5 hover:bg-emerald-50/70 transition-colors group cursor-pointer"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100/70 text-base">
                          📈
                        </span>
                        <div>
                          <p className="text-xs font-bold text-gray-900 group-hover:text-emerald-950">
                            {t("nav.mandiPrices", "Mandi Live Prices")}
                          </p>
                          <p className="text-[11px] text-gray-500">
                            Real-time wholesale Agmarknet rates
                          </p>
                        </div>
                      </Link>

                      <Link
                        to="/markets/nearby"
                        onClick={() => setInsightsDropdownOpen(false)}
                        className="flex items-start gap-3 rounded-xl p-2.5 hover:bg-emerald-50/70 transition-colors group cursor-pointer"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100/70 text-base">
                          📍
                        </span>
                        <div>
                          <p className="text-xs font-bold text-gray-900 group-hover:text-emerald-950">
                            {t("nav.nearbyMarkets", "Nearby Mandis & Haats")}
                          </p>
                          <p className="text-[11px] text-gray-500">
                            Find closest APMC yards with distance
                          </p>
                        </div>
                      </Link>

                      <Link
                        to="/storage-facilities"
                        onClick={() => setInsightsDropdownOpen(false)}
                        className="flex items-start gap-3 rounded-xl p-2.5 hover:bg-emerald-50/70 transition-colors group cursor-pointer"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100/70 text-base">
                          ❄️
                        </span>
                        <div>
                          <p className="text-xs font-bold text-gray-900 group-hover:text-emerald-950">
                            {t("nav.storage", "Cold Storage Directory")}
                          </p>
                          <p className="text-[11px] text-gray-500">
                            Preservation units & dry warehouses
                          </p>
                        </div>
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Primary Role Portal Link */}
              {isAuthenticated && isFarmer && (
                <>
                  <NavLink to="/farmer/dashboard" className={linkCls}>
                    {t("nav.farmerDashboard", "Farmer Hub")}
                  </NavLink>
                  <NavLink to="/crop-doctor" className={linkCls}>
                    🌿 {t("nav.cropDoctor", "Crop Doctor")}
                  </NavLink>
                </>
              )}
              {isAuthenticated && isFPO && (
                <NavLink to="/fpo/dashboard" className={linkCls}>
                  🏢 FPO Hub
                </NavLink>
              )}
              {isAuthenticated && isBusinessBuyer && (
                <NavLink to="/business/dashboard" className={linkCls}>
                  🏢 B2B Portal
                </NavLink>
              )}
              {isAuthenticated && isHouseholdBuyer && (
                <NavLink to="/buyer/orders" className={linkCls}>
                  {t("nav.orders", "My Orders")}
                </NavLink>
              )}
              {isAuthenticated && user?.role === "admin" && (
                <NavLink to="/admin/dashboard" className={linkCls}>
                  {t("nav.admin", "Admin Panel")}
                </NavLink>
              )}
            </div>

            {/* Desktop Right Actions */}
            <div className="hidden md:flex items-center gap-2">
              <LanguageSwitcher compact />

              {/* Cart Icon: Only shown to Buyers & Guests */}
              {!isFarmer && (
                <Link
                  to="/cart"
                  className="relative flex items-center justify-center h-9 w-9 rounded-lg text-gray-500 hover:text-emerald-700 hover:bg-emerald-50/60 transition-all"
                  aria-label={t("nav.viewShoppingCart")}
                >
                  <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  {count > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white ring-2 ring-white">
                      {count}
                    </span>
                  )}
                </Link>
              )}

              {/* Notifications Bell */}
              {isAuthenticated && <NotificationBell />}

              {isAuthenticated ? (
                /* Profile Dropdown */
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setProfileDropdownOpen((prev) => !prev)}
                    className="flex items-center gap-2 rounded-full p-0.5 pl-0.5 pr-2 border border-gray-200/80 hover:border-emerald-400 bg-white hover:bg-emerald-50/30 transition-all shadow-xs cursor-pointer group"
                    aria-expanded={profileDropdownOpen}
                    title="Profile and Account Settings"
                  >
                    <div className="relative">
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="h-8 w-8 rounded-full object-cover ring-[1.5px] ring-emerald-600 group-hover:ring-emerald-500 transition-all"
                      />
                      <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-[1.5px] ring-white" />
                    </div>
                    <span className="text-xs font-semibold text-gray-700 max-w-[80px] truncate hidden lg:inline">
                      {displayName}
                    </span>
                    <svg
                      className={`h-3.5 w-3.5 text-gray-400 transition-transform ${
                        profileDropdownOpen ? "rotate-180 text-emerald-600" : ""
                      }`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {profileDropdownOpen && (
                    <div className="absolute right-0 mt-2.5 w-72 rounded-2xl border border-gray-200/80 bg-white p-2 shadow-xl shadow-gray-900/8 z-50 animate-scale-in">
                      {/* User Header */}
                      <div
                        onClick={() => {
                          setShowProfileModal(true);
                          setProfileDropdownOpen(false);
                        }}
                        className="p-3 bg-emerald-50/70 hover:bg-emerald-100/60 rounded-xl mb-1 cursor-pointer transition-all group/header"
                        title="Click to view and edit profile"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="relative group/avatar shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowPhotoModal(true);
                              setProfileDropdownOpen(false);
                            }}
                            title="Change photo"
                          >
                            <img
                              src={avatarUrl}
                              alt={displayName}
                              className="h-10 w-10 rounded-full object-cover ring-2 ring-emerald-600/70 shadow-xs"
                            />
                            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                              <span className="text-white text-[10px]">📷</span>
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-black text-gray-900 truncate">
                                {displayName}
                              </p>
                              <span className="text-[11px] text-emerald-700 opacity-60 group-hover/header:opacity-100 transition-opacity">
                                ✏️
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 truncate">
                              {user?.phone || user?.email || t("common.directProducer")}
                            </p>
                            <span className="inline-flex items-center gap-1 mt-1 rounded-full bg-white px-2 py-0.5 text-[9px] font-bold text-emerald-800 border border-emerald-200 shadow-2xs">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                              {isFarmer
                                ? t("common.verifiedFarmer")
                                : isFPO
                                ? "🏢 FPO / Cooperative"
                                : isBusinessBuyer
                                ? "🏢 Business Buyer"
                                : "🛒 Household Buyer"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Dropdown Actions */}
                      <div className="py-1 space-y-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setShowProfileModal(true);
                            setProfileDropdownOpen(false);
                          }}
                          className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-emerald-950 hover:bg-emerald-50/70 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-5 text-center text-sm">👤</span>
                            <span>My Profile & Settings</span>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Edit
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShowPhotoModal(true);
                            setProfileDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer"
                        >
                          <span className="w-5 text-center text-sm">📸</span>
                          <span>{t("nav.changeProfilePhoto")}</span>
                        </button>

                        {isFarmer ? (
                          <DropdownLink
                            to="/farmer/dashboard"
                            icon="📊"
                            label={t("nav.farmerDashboard", "Farmer Dashboard")}
                            onClick={() => setProfileDropdownOpen(false)}
                          />
                        ) : isFPO ? (
                          <DropdownLink
                            to="/fpo/dashboard"
                            icon="🏢"
                            label="FPO Command Center"
                            onClick={() => setProfileDropdownOpen(false)}
                          />
                        ) : isBusinessBuyer ? (
                          <DropdownLink
                            to="/business/dashboard"
                            icon="🏢"
                            label="B2B Procurement Desk"
                            onClick={() => setProfileDropdownOpen(false)}
                          />
                        ) : user?.role === "buyer" ? (
                          <DropdownLink
                            to="/buyer/orders"
                            icon="📦"
                            label={t("nav.orders", "My Orders")}
                            onClick={() => setProfileDropdownOpen(false)}
                          />
                        ) : (
                          <DropdownLink
                            to="/admin/dashboard"
                            icon="🛡️"
                            label={t("nav.adminPanel", "Admin Panel")}
                            onClick={() => setProfileDropdownOpen(false)}
                          />
                        )}

                        <DropdownLink
                          to="/settings"
                          icon="⚙️"
                          label={t("nav.settings", "Settings & Preferences")}
                          onClick={() => setProfileDropdownOpen(false)}
                        />
                      </div>

                      {/* Divider & Logout */}
                      <div className="h-px bg-gray-100 mx-2 my-1" />
                      <div className="py-1">
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <span className="w-5 text-center text-sm">🚪</span>
                          <span>{t("nav.logOut")}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    to="/login"
                    className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all"
                  >
                    {t("nav.logIn")}
                  </Link>
                  <Link
                    to="/signup"
                    className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-600 transition-all"
                  >
                    {t("nav.signUp")}
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Right Controls */}
            <div className="flex md:hidden items-center gap-2">
              {/* Cart: Hidden for Farmers on Mobile */}
              {!isFarmer && (
                <Link
                  to="/cart"
                  className="relative flex items-center justify-center h-9 w-9 rounded-lg text-gray-500"
                  aria-label={t("nav.viewShoppingCart")}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  {count > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                      {count}
                    </span>
                  )}
                </Link>
              )}

              {/* Mobile Notification Bell */}
              {isAuthenticated && <NotificationBell />}

              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center justify-center h-8 w-8 rounded-full ring-[1.5px] ring-emerald-600 overflow-hidden"
                  aria-label="Toggle profile menu"
                >
                  <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                </button>
              ) : (
                <button
                  className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 transition-colors"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label="Toggle navigation menu"
                >
                  {menuOpen ? (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Mobile menu drawer */}
          {menuOpen && (
            <div className="md:hidden border-t border-gray-100 py-3 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Mobile Authenticated User Card */}
              {isAuthenticated && (
                <div className="flex items-center justify-between p-3 mb-3 bg-emerald-50/60 rounded-xl">
                  <div
                    className="flex items-center gap-3 cursor-pointer flex-1 min-w-0 mr-2"
                    onClick={() => {
                      setShowProfileModal(true);
                      setMenuOpen(false);
                    }}
                  >
                    <img src={avatarUrl} alt={displayName} className="h-10 w-10 rounded-full object-cover ring-[1.5px] ring-emerald-600" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-900 truncate">{displayName}</p>
                      <p className="text-xs text-emerald-700 font-medium capitalize">
                        {isFarmer ? `🌾 ${t("common.verifiedFarmer")}` : user?.role}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileModal(true);
                        setMenuOpen(false);
                      }}
                      className="rounded-lg bg-emerald-700 px-2.5 py-1 text-xs font-bold text-white shadow-xs"
                    >
                      Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPhotoModal(true);
                        setMenuOpen(false);
                      }}
                      className="rounded-lg bg-white border border-emerald-200 px-2 py-1 text-xs font-medium text-emerald-800"
                    >
                      📷
                    </button>
                  </div>
                </div>
              )}

              {/* Language Switcher */}
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50 mb-3">
                <span className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                  🌐 {t("nav.changeLanguage")}
                </span>
                <LanguageSwitcher compact />
              </div>

              {/* Core Links */}
              <NavLink to="/products" className={mobileLinkCls} onClick={() => setMenuOpen(false)}>
                <span>{t("nav.browse", "Marketplace")}</span>
                <span className="text-gray-400">🛍️</span>
              </NavLink>

              {/* Wholesale Links - cleanly separated under Market Insights */}
              {canAccessWholesale && (
                <>
                  <div className="my-2 px-3">
                    <div className="h-px bg-gray-100" />
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-700 mt-2">
                      Market Insights
                    </p>
                  </div>
                  <NavLink to="/mandi-prices" className={mobileLinkCls} onClick={() => setMenuOpen(false)}>
                    <span>{t("nav.mandiPrices", "Mandi Live Prices")}</span>
                    <span className="text-gray-400">📈</span>
                  </NavLink>
                  <NavLink to="/markets/nearby" className={mobileLinkCls} onClick={() => setMenuOpen(false)}>
                    <span>{t("nav.nearbyMarkets", "Nearby Mandis & Haats")}</span>
                    <span className="text-gray-400">📍</span>
                  </NavLink>
                  <NavLink to="/storage-facilities" className={mobileLinkCls} onClick={() => setMenuOpen(false)}>
                    <span>{t("nav.storage", "Cold Storage Directory")}</span>
                    <span className="text-gray-400">❄️</span>
                  </NavLink>
                </>
              )}
              
              {!isFarmer && !isFPO && (
                <NavLink to="/cart" className={mobileLinkCls} onClick={() => setMenuOpen(false)}>
                  <span>{t("nav.cart")} {count > 0 ? `(${count})` : ""}</span>
                  <span className="text-gray-400">🛒</span>
                </NavLink>
              )}

              {/* Role-specific section */}
              {isAuthenticated && isFPO && (
                <>
                  <div className="my-2 px-3">
                    <div className="h-px bg-gray-100" />
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-700 mt-2">
                      🏢 FPO Cooperative Hub
                    </p>
                  </div>
                  <NavLink to="/fpo/dashboard" className={mobileLinkCls} onClick={() => setMenuOpen(false)}>📊 FPO Command Center</NavLink>
                  <NavLink to="/fpo/members" className={mobileLinkCls} onClick={() => setMenuOpen(false)}>👨‍🌾 Member Farmers</NavLink>
                  <NavLink to="/fpo/lots" className={mobileLinkCls} onClick={() => setMenuOpen(false)}>📦 Aggregated Crop Lots</NavLink>
                  <NavLink to="/fpo/offers" className={mobileLinkCls} onClick={() => setMenuOpen(false)}>🤝 Price Offers</NavLink>
                  <NavLink to="/fpo/orders" className={mobileLinkCls} onClick={() => setMenuOpen(false)}>📋 Orders & Dispatch</NavLink>
                </>
              )}

              {isAuthenticated && isFarmer && (
                <>
                  <div className="my-2 px-3">
                    <div className="h-px bg-gray-100" />
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-700 mt-2">
                      {t("nav.farmPortal")}
                    </p>
                  </div>
                  <NavLink to="/farmer/dashboard" className={mobileLinkCls} onClick={() => setMenuOpen(false)}>{t("nav.farmerDashboard")}</NavLink>
                  <NavLink to="/farmer/bulk-demands" className={mobileLinkCls} onClick={() => setMenuOpen(false)}>📢 Bulk Buyer Demands (RFQs)</NavLink>
                  <NavLink to="/farmer/listings" className={mobileLinkCls} onClick={() => setMenuOpen(false)}>{t("nav.myListings")}</NavLink>
                  <NavLink to="/farmer/orders" className={mobileLinkCls} onClick={() => setMenuOpen(false)}>{t("nav.orders")}</NavLink>
                  <NavLink to="/farmer/offers" className={mobileLinkCls} onClick={() => setMenuOpen(false)}>{t("nav.offers")}</NavLink>
                  <NavLink to="/farmer/weather" className={mobileLinkCls} onClick={() => setMenuOpen(false)}>{t("nav.weather")}</NavLink>
                  <NavLink to="/crop-doctor" className={mobileLinkCls} onClick={() => setMenuOpen(false)}>
                    <span>🌿 {t("nav.cropDoctor", "Crop Doctor & Quality AI")}</span>
                    <span className="text-gray-400">🔬</span>
                  </NavLink>
                </>
              )}

              {isAuthenticated && isBusinessBuyer && (
                <>
                  <div className="my-2 px-3">
                    <div className="h-px bg-gray-100" />
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-700 mt-2">
                      🏢 B2B Procurement Desk
                    </p>
                  </div>
                  <NavLink to="/business/dashboard" className={mobileLinkCls} onClick={() => setMenuOpen(false)}>B2B Dashboard & RFQs</NavLink>
                  <NavLink to="/buyer/orders" className={mobileLinkCls} onClick={() => setMenuOpen(false)}>{t("nav.orders")}</NavLink>
                  <NavLink to="/buyer/offers" className={mobileLinkCls} onClick={() => setMenuOpen(false)}>{t("nav.offers")}</NavLink>
                </>
              )}

              {isAuthenticated && isHouseholdBuyer && (
                <>
                  <div className="my-2 px-3">
                    <div className="h-px bg-gray-100" />
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-700 mt-2">
                      {t("nav.myAccount")}
                    </p>
                  </div>
                  <NavLink to="/buyer/dashboard" className={mobileLinkCls} onClick={() => setMenuOpen(false)}>{t("nav.buyerDashboard", "Account Overview")}</NavLink>
                  <NavLink to="/buyer/orders" className={mobileLinkCls} onClick={() => setMenuOpen(false)}>{t("nav.orders")}</NavLink>
                  <NavLink to="/buyer/offers" className={mobileLinkCls} onClick={() => setMenuOpen(false)}>{t("nav.offers")}</NavLink>
                </>
              )}

              {isAuthenticated && user?.role === "admin" && (
                <>
                  <div className="my-2 px-3">
                    <div className="h-px bg-gray-100" />
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mt-2">
                      {t("nav.adminPanel")}
                    </p>
                  </div>
                  <NavLink to="/admin/dashboard" className={mobileLinkCls} onClick={() => setMenuOpen(false)}>{t("nav.dashboard")}</NavLink>
                  <NavLink to="/admin/users" className={mobileLinkCls} onClick={() => setMenuOpen(false)}>{t("nav.manageUsers")}</NavLink>
                  <NavLink to="/admin/listings" className={mobileLinkCls} onClick={() => setMenuOpen(false)}>{t("nav.manageListings")}</NavLink>
                  <NavLink to="/admin/orders" className={mobileLinkCls} onClick={() => setMenuOpen(false)}>{t("nav.manageOrders")}</NavLink>
                </>
              )}

              <div className="pt-3 mt-2 border-t border-gray-100">
                {isAuthenticated ? (
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 py-3 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors"
                  >
                    <span>🚪</span>
                    <span>{t("nav.logout")}</span>
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <Link
                      to="/login"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center justify-center rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700"
                    >
                      {t("nav.login")}
                    </Link>
                    <Link
                      to="/signup"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center justify-center rounded-xl bg-emerald-700 py-2.5 text-sm font-medium text-white"
                    >
                      {t("nav.signup")}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Profile Modals */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onOpenPhotoModal={() => setShowPhotoModal(true)}
      />
      <ProfilePhotoModal
        isOpen={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
      />
    </>
  );
}

/* Reusable dropdown link component */
function DropdownLink({ to, icon, label, onClick }: { to: string; icon: string; label: string; onClick: () => void }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-gray-600 hover:bg-emerald-50/60 hover:text-emerald-900 transition-colors"
    >
      <span className="w-5 text-center text-sm">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
