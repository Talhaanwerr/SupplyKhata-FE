"use client";

import { useEffect } from "react";
import { NextIntlClientProvider } from "next-intl";
import { useLocaleStore } from "@/store/locale-store";
import type { Locale } from "@/i18n/config";
import type { AbstractIntlMessages } from "next-intl";

// Static imports — both are tiny JSON files; the unused one is tree-shaken in prod.
import en from "../../messages/en.json";
import ar from "../../messages/ar.json";

const messages: Record<Locale, AbstractIntlMessages> = { en, ar };

interface LocaleProviderProps {
  children: React.ReactNode;
}

export function LocaleProvider({ children }: LocaleProviderProps) {
  const locale = useLocaleStore((s) => s.locale);
  const init = useLocaleStore((s) => s.init);

  // On first mount: read localStorage, apply document.dir/lang, update the store.
  // init() calls Zustand's set() — not React setState — so no cascading render issue.
  useEffect(() => {
    init();
  }, [init]);

  return (
    <NextIntlClientProvider locale={locale} messages={messages[locale]}>
      {children}
    </NextIntlClientProvider>
  );
}
