"use client";

import { useLocaleStore } from "@/store/locale-store";
import { locales, LOCALE_LABELS, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocaleStore();

  return (
    <div
      role="group"
      aria-label="Language selector"
      className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5"
    >
      {locales.map((l: Locale) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          aria-pressed={locale === l}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            locale === l
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          {LOCALE_LABELS[l]}
        </button>
      ))}
    </div>
  );
}
