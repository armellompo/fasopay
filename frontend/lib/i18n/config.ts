// Edge-safe (used by middleware-adjacent code and the client): no Node or server imports.
export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "fr";
export const LOCALE_COOKIE = "fasopay_locale";

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

/** BCP 47 tag for Intl date formatting. Amounts stay in fr-FR grouping in both languages (FCFA convention). */
export const DATE_LOCALE: Record<Locale, string> = { fr: "fr-FR", en: "en-GB" };
