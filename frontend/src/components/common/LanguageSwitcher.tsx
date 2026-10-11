import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, SupportedLanguageCode } from "@/i18n";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/api";

interface LanguageSwitcherProps {
  compact?: boolean;
  className?: string;
}

export default function LanguageSwitcher({ compact = false, className = "" }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLangCode = (i18n.language || "en").split("-")[0];
  const currentLang =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentLangCode) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSelectLanguage(code: SupportedLanguageCode) {
    await i18n.changeLanguage(code);
    setIsOpen(false);

    // If user is authenticated, persist preferredLanguage to backend profile in background
    if (user?.id) {
      try {
        await api.patch("/auth/profile", { preferredLanguage: code });
      } catch (err) {
        // Non-blocking best-effort
        console.warn("Failed to persist language preference:", err);
      }
    }
  }

  return (
    <div ref={dropdownRef} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="Change language"
        className={`flex items-center gap-1.5 rounded-lg border border-gray-200/80 bg-white font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900 transition-all ${
          compact ? "px-2 py-1.5 text-xs" : "px-2.5 py-1.5 text-xs"
        }`}
      >
        <span className="text-xs leading-none" aria-hidden="true">
          {currentLang.flag}
        </span>
        <span className="font-medium text-[11px]">{currentLang.nativeName}</span>
        <svg
          className={`h-3 w-3 text-gray-400 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-emerald-600" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-1.5 w-40 rounded-xl border border-gray-100 bg-white p-1 shadow-lg ring-1 ring-black/5 z-50 animate-scale-in"
        >
          <div className="px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-gray-400">
            Language
          </div>
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = lang.code === currentLang.code;
            return (
              <button
                key={lang.code}
                type="button"
                role="menuitem"
                onClick={() => handleSelectLanguage(lang.code)}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-emerald-50 text-emerald-800"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm leading-none">{lang.flag}</span>
                  <span>{lang.nativeName}</span>
                </div>
                {isSelected && (
                  <svg className="h-3.5 w-3.5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
