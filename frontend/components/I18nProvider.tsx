"use client";

import { createContext, useContext, type ReactNode } from "react";

import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { dictionaries, type Dict } from "@/lib/i18n/dictionaries";

// Only the locale crosses the server/client boundary; dictionaries hold functions, so the client
// imports them directly.
const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useT(): Dict {
  return dictionaries[useContext(LocaleContext)];
}
