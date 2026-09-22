import { create } from "zustand";
import { type Locale, defaultLocale, isRTL, locales, LOCALE_STORAGE_KEY } from "@/i18n/config";

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** Must be called once on the client to hydrate from localStorage */
  init: () => void;
}

function applyLocale(locale: Locale) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale;
  document.documentElement.dir = isRTL(locale) ? "rtl" : "ltr";
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: defaultLocale,

  setLocale: (locale: Locale) => {
    if (!locales.includes(locale)) return;
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // Private browsing — non-fatal
    }
    applyLocale(locale);
    set({ locale });
  },

  init: () => {
    let locale: Locale = defaultLocale;
    try {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
      if (stored && locales.includes(stored)) {
        locale = stored;
      }
    } catch {
      // Non-fatal
    }
    applyLocale(locale);
    set({ locale });
  },
}));
