import { Link } from "react-router";
import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-gray-200 bg-[#0f2a1c] text-gray-300 mt-auto">
      {/* Top trust banner */}
      <div className="border-b border-emerald-900/40 bg-[#0b2218] py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2.5">
              <span className="text-2xl">🛡️</span>
              <div>
                <h4 className="text-xs font-semibold text-white">{t("footer.escrowProtection")}</h4>
                <p className="text-[11px] text-gray-400 mt-0.5">{t("footer.escrowProtectionDesc")}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2.5">
              <span className="text-2xl">🌾</span>
              <div>
                <h4 className="text-xs font-semibold text-white">{t("footer.directSourcing")}</h4>
                <p className="text-[11px] text-gray-400 mt-0.5">{t("footer.directSourcingDesc")}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2.5">
              <span className="text-2xl">⚡</span>
              <div>
                <h4 className="text-xs font-semibold text-white">{t("footer.freshHarvest")}</h4>
                <p className="text-[11px] text-gray-400 mt-0.5">{t("footer.freshHarvestDesc")}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2.5">
              <span className="text-2xl">🌤️</span>
              <div>
                <h4 className="text-xs font-semibold text-white">{t("footer.weatherAdvisory")}</h4>
                <p className="text-[11px] text-gray-400 mt-0.5">{t("footer.weatherAdvisoryDesc")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Col 1 & 2: Brand Story */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-lg">
                🌾
              </div>
              <span
                className="text-xl font-bold text-white"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {t("common.appName")}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed max-w-sm">
              {t("footer.brandDescription")}
            </p>
            <div className="flex items-center gap-3 text-xs text-emerald-400 pt-2 font-medium">
              <span>🇮🇳 {t("footer.builtForIndianFarmers")}</span>
              <span>•</span>
              <span>Pune &bull; Nashik &bull; Punjab</span>
            </div>
          </div>

          {/* Col 3: Categories */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-4">
              {t("footer.categories")}
            </h5>
            <ul className="space-y-2.5 text-xs sm:text-sm text-gray-300">
              <li>
                <Link to="/products?category=vegetables" className="hover:text-white transition-colors">
                  {t("footer.freshVegetables")}
                </Link>
              </li>
              <li>
                <Link to="/products?category=fruits" className="hover:text-white transition-colors">
                  {t("footer.orchardFruits")}
                </Link>
              </li>
              <li>
                <Link to="/products?category=grains" className="hover:text-white transition-colors">
                  {t("footer.grainsPulses")}
                </Link>
              </li>
              <li>
                <Link to="/products?category=dairy" className="hover:text-white transition-colors">
                  {t("footer.farmDairyGhee")}
                </Link>
              </li>
              <li>
                <Link to="/products?category=herbs" className="hover:text-white transition-colors">
                  {t("footer.organicHerbsSpices")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Platform */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-4">
              {t("footer.platform")}
            </h5>
            <ul className="space-y-2.5 text-xs sm:text-sm text-gray-300">
              <li>
                <Link to="/products" className="hover:text-white transition-colors">
                  {t("footer.browseAllHarvests")}
                </Link>
              </li>
              <li>
                <Link to="/signup" className="hover:text-white transition-colors">
                  {t("footer.registerAsFarmer")}
                </Link>
              </li>
              <li>
                <Link to="/cart" className="hover:text-white transition-colors">
                  {t("footer.cartCheckout")}
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-white transition-colors">
                  {t("footer.signIn")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 5: Support */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-4">
              {t("footer.supportEscrow")}
            </h5>
            <p className="text-xs text-gray-400 leading-relaxed">
              {t("footer.supportQuestion")}
            </p>
            <div className="mt-3 space-y-1 text-xs text-gray-300">
              <p>{t("footer.email")}: <span className="text-emerald-300">support@krishibazaar.in</span></p>
              <p>{t("footer.tollFree")}: <span className="text-emerald-300">1800-KRISHI-BZ</span></p>
            </div>
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-950/80 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-300 border border-emerald-800">
              <span>🔒</span>
              <span>{t("footer.razorpayVerifiedEscrow")}</span>
            </div>
          </div>
        </div>

        {/* Bottom copyright line */}
        <div className="mt-12 pt-6 border-t border-emerald-950 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <p>{t("footer.copyright", { year: new Date().getFullYear() })}</p>
          <div className="flex gap-6">
            <span className="hover:text-gray-300 cursor-pointer">{t("footer.privacyPolicy")}</span>
            <span className="hover:text-gray-300 cursor-pointer">{t("footer.termsOfService")}</span>
            <span className="hover:text-gray-300 cursor-pointer">{t("footer.farmerCharter")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
