import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "../locales/en.json";
import hi from "../locales/hi.json";
import mr from "../locales/mr.json";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", nativeName: "English", flag: "🇬🇧" },
  { code: "hi", label: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳" },
  { code: "mr", label: "Marathi", nativeName: "मराठी", flag: "🌾" },
] as const;

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

const savedLang = (typeof window !== "undefined" && localStorage.getItem("agri_lang")) || "en";
const initialLang = ["en", "hi", "mr"].includes(savedLang) ? savedLang : "en";

if (typeof document !== "undefined") {
  document.documentElement.lang = initialLang;
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
    mr: { translation: mr },
  },
  lng: initialLang,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false, // React already escapes values safely
  },
});

i18n.on("languageChanged", (lng) => {
  if (typeof document !== "undefined") {
    document.documentElement.lang = lng;
    localStorage.setItem("agri_lang", lng);
  }
});

export default i18n;
