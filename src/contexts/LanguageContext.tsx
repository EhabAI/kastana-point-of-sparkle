import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import enTranslations from "@/locales/en";
import arTranslations from "@/locales/ar";

type Language = "en" | "ar";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const translations: Record<Language, Record<string, string>> = {
  en: enTranslations,
  ar: arTranslations,
};

const STORAGE_KEY = "kastana_language";

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "ar") return stored;
    }
    return "en";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  const isRTL = language === "ar";

  useEffect(() => {
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language, isRTL]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context) return context;

  // Fallback (shouldn't happen, but prevents a full app crash if a component
  // is rendered outside the provider due to routing/provider timing issues).
  const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  const language: Language = stored === "ar" || stored === "en" ? stored : "en";

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.warn("useLanguage used outside LanguageProvider; falling back to localStorage/default.");
  }

  return {
    language,
    setLanguage: (lang: Language) => {
      if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, lang);
    },
    t: (key: string) => translations[language][key] || key,
    isRTL: language === "ar",
  };
}
