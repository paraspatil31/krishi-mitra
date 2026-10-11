import { useState, type ReactNode } from "react";
import { NavLink, Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import ProfilePhotoModal from "@/components/common/ProfilePhotoModal";
import UserProfileModal from "@/components/common/UserProfileModal";
import { FARMER_NAV_SECTIONS, type NavSection } from "@/pages/farmer/navItems";

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

interface DashboardLayoutProps {
  title: string;
  subtitle?: string;
  navItems?: NavItem[];
  navSections?: NavSection[];
  actions?: ReactNode;
  children: ReactNode;
}

const DEFAULT_FARMER_AVATAR =
  "https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=160&auto=format&fit=crop&q=80";
const DEFAULT_BUYER_AVATAR =
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80";

const NAV_KEY_MAP: Record<string, string> = {
  "/farmer/dashboard": "nav.dashboard",
  "/farmer/listings": "nav.myListings",
  "/farmer/orders": "nav.orders",
  "/farmer/offers": "nav.priceOffers",
  "/farmer/weather": "nav.weatherAdvisory",
  "/mandi-prices": "nav.mandiPrices",
  "/crop-doctor": "nav.cropDoctor",
  "/farmer/crop-doctor": "nav.cropDoctor",
  "/buyer/dashboard": "nav.dashboard",
  "/buyer/orders": "nav.orders",
  "/buyer/offers": "nav.myOffers",
};

export default function DashboardLayout({
  title,
  subtitle: _subtitle,
  navItems,
  navSections,
  actions,
  children,
}: DashboardLayoutProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const isFarmer = user?.role === "farmer";

  const avatarUrl = user?.avatar || (isFarmer ? DEFAULT_FARMER_AVATAR : DEFAULT_BUYER_AVATAR);

  // Clean formatted user name
  const displayName = user?.name
    ? /^\d+$/.test(user.name)
      ? `Kisan #${user.name.slice(-4)}`
      : user.name
    : isFarmer
    ? t("common.kisanProducer", "Kisan Producer")
    : t("common.member", "Member");

  const getItemLabel = (item: NavItem) =>
    NAV_KEY_MAP[item.href] ? t(NAV_KEY_MAP[item.href], item.label) : item.label;

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm transition-all duration-200 ${
      isActive
        ? "bg-emerald-700 text-white font-semibold shadow-sm"
        : "text-gray-600 hover:bg-emerald-50/80 hover:text-emerald-900 font-medium"
    }`;

  const mobileLinkCls = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all whitespace-nowrap shrink-0 ${
      isActive
        ? "bg-emerald-700 text-white shadow-xs"
        : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
    }`;

  // Prioritize structured sections
  const sectionsToRender = navSections || (isFarmer ? FARMER_NAV_SECTIONS : undefined);

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Sidebar */}
          <aside className="lg:w-64 shrink-0">
            <div className="lg:sticky lg:top-20 space-y-4">
              {/* Sidebar Card */}
              <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs">
                {/* User Info - Desktop Only */}
                <div className="mb-4 pb-3 border-b border-gray-100 hidden lg:block">
                  <div className="flex items-center gap-3">
                    <div
                      className="relative group cursor-pointer shrink-0"
                      onClick={() => setShowPhotoModal(true)}
                      title={t("profile.changePhoto", "Click to update profile photo")}
                    >
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="h-10 w-10 rounded-xl object-cover ring-[1.5px] ring-emerald-600 group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 rounded-xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-white text-[10px]">📷</span>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-sm font-bold text-gray-900 truncate">
                        {displayName}
                      </h2>
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {isFarmer ? t("badges.verifiedFarmer", "Verified Producer") : t("badges.verifiedBuyer", "Verified Buyer")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Create Listing Button - Farmers Only */}
                {isFarmer && (
                  <div className="mb-3">
                    <Link
                      to="/farmer/listings/new"
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-600 transition-all btn-spring"
                    >
                      <span className="text-base font-bold leading-none">+</span>
                      <span>{t("dashboard.createNewListing", "+ New Harvest Listing")}</span>
                    </Link>
                  </div>
                )}

                {/* Structured Desktop Nav Sections */}
                {sectionsToRender ? (
                  <div className="hidden lg:flex flex-col">
                    {/* Header: FARMER HUB */}
                    {isFarmer && (
                      <div className="mb-2 px-2.5 pt-1">
                        <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                          <span>🌾</span> FARMER HUB
                        </span>
                      </div>
                    )}

                    <nav className="flex flex-col gap-0.5">
                      {sectionsToRender.map((section, sIdx) => (
                        <div
                          key={section.title || `section-${sIdx}`}
                          className={sIdx > 0 ? "mt-3 pt-2.5 border-t border-gray-100/90" : ""}
                        >
                          {section.title && (
                            <p className="text-[10px] font-black tracking-wider uppercase text-gray-400 mb-1.5 px-3">
                              {section.title}
                            </p>
                          )}
                          <div className="flex flex-col gap-0.5">
                            {section.items.map((item) => {
                              if (item.href) {
                                return (
                                  <NavLink
                                    key={item.href}
                                    to={item.href}
                                    className={linkCls}
                                    end={item.href.endsWith("dashboard")}
                                  >
                                    {({ isActive }) => (
                                      <>
                                        <div className="flex items-center gap-2.5">
                                          <span
                                            className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm transition-transform group-hover:scale-105 ${
                                              isActive
                                                ? "bg-white/20 text-white"
                                                : "bg-gray-100/80 text-gray-600"
                                            }`}
                                          >
                                            {item.icon}
                                          </span>
                                          <span className="truncate text-[13px]">{item.label}</span>
                                        </div>
                                        {isActive && (
                                          <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
                                        )}
                                      </>
                                    )}
                                  </NavLink>
                                );
                              }

                              return (
                                <button
                                  key={item.label}
                                  type="button"
                                  onClick={() => setShowProfileModal(true)}
                                  className="w-full group flex items-center justify-between rounded-xl px-3.5 py-2 text-sm text-gray-600 hover:bg-emerald-50/80 hover:text-emerald-900 font-medium transition-all cursor-pointer"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <span className="flex h-7 w-7 items-center justify-center rounded-lg text-sm bg-gray-100/80 text-gray-600 group-hover:scale-105 transition-transform">
                                      {item.icon}
                                    </span>
                                    <span className="truncate text-[13px]">{item.label}</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </nav>
                  </div>
                ) : (
                  /* Fallback Flat Nav Items */
                  <nav className="hidden lg:flex flex-col gap-1">
                    {navItems?.map((item) => (
                      <NavLink
                        key={item.href}
                        to={item.href}
                        className={linkCls}
                        end={item.href.endsWith("dashboard")}
                      >
                        {({ isActive }) => (
                          <>
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm transition-transform group-hover:scale-105 ${
                                  isActive
                                    ? "bg-white/20 text-white"
                                    : "bg-gray-100/80 text-gray-600"
                                }`}
                              >
                                {item.icon}
                              </span>
                              <span className="truncate text-[13px]">{getItemLabel(item)}</span>
                            </div>
                            {isActive && (
                              <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
                            )}
                          </>
                        )}
                      </NavLink>
                    ))}
                  </nav>
                )}

                {/* Mobile Horizontal Nav */}
                <div className="lg:hidden flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        onClick={() => setShowPhotoModal(true)}
                        className="h-8 w-8 rounded-full object-cover ring-1 ring-emerald-600 cursor-pointer"
                      />
                      <div>
                        <h2 className="text-sm font-bold text-gray-900 leading-tight">{title}</h2>
                        <p className="text-xs text-emerald-700 font-medium">{displayName}</p>
                      </div>
                    </div>
                    {isFarmer && (
                      <Link
                        to="/farmer/listings/new"
                        className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white shadow-xs"
                      >
                        + {t("common.confirm", "Create")}
                      </Link>
                    )}
                  </div>

                  <nav className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {sectionsToRender
                      ? sectionsToRender
                          .flatMap((s) => s.items)
                          .map((item) => {
                            if (item.href) {
                              return (
                                <NavLink
                                  key={item.href}
                                  to={item.href}
                                  className={mobileLinkCls}
                                  end={item.href.endsWith("dashboard")}
                                >
                                  <span>{item.icon}</span>
                                  <span>{item.label}</span>
                                </NavLink>
                              );
                            }
                            return (
                              <button
                                key={item.label}
                                type="button"
                                onClick={() => setShowProfileModal(true)}
                                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 whitespace-nowrap shrink-0"
                              >
                                <span>{item.icon}</span>
                                <span>{item.label}</span>
                              </button>
                            );
                          })
                      : navItems?.map((item) => (
                          <NavLink
                            key={item.href}
                            to={item.href}
                            className={mobileLinkCls}
                            end={item.href.endsWith("dashboard")}
                          >
                            <span>{item.icon}</span>
                            <span>{getItemLabel(item)}</span>
                          </NavLink>
                        ))}
                  </nav>
                </div>

                {/* Sidebar Trust Badge - Desktop Only */}
                <div className="mt-4 pt-3 border-t border-gray-100 hidden lg:block text-center">
                  <div className="rounded-xl bg-emerald-50/50 border border-emerald-100 p-2.5 space-y-0.5">
                    <p className="text-[10px] font-semibold text-emerald-800 flex items-center justify-center gap-1">
                      <span>⚡</span> 0% {t("footer.directSourcingDesc", "Middleman Margin")}
                    </p>
                    <p className="text-[9px] text-emerald-600 font-medium">
                      100% {t("footer.escrowProtection", "Escrow Protection")}.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 min-w-0">
            {actions && (
              <div className="flex items-center justify-end gap-3 mb-4">
                {actions}
              </div>
            )}
            {children}
          </main>
        </div>
      </div>

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
