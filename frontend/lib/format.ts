import { DATE_LOCALE, type Locale } from "./i18n/config";

const fcfa = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/** 1234567 → "1 234 567 FCFA" (French grouping, as used on Burkinabè pay slips). */
export function formatFcfa(amount: number, withUnit = true): string {
  const n = fcfa.format(Math.round(amount));
  return withUnit ? `${n} FCFA` : n;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** "2026-11" → "Novembre 2026" (fr) or "November 2026" (en). Pay slips always use French. */
export function periodLabel(period: string, locale: Locale = "fr"): string {
  const [y, m] = period.split("-").map(Number);
  const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(DATE_LOCALE[locale], { month: "long", year: "numeric", timeZone: "UTC" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Calendar date in the UI language: 29/10/2026 (fr) or 29/10/2026 (en-GB), or with month names via opts. */
export function formatDate(iso: string, locale: Locale, opts: Intl.DateTimeFormatOptions = {}): string {
  return new Date(iso).toLocaleDateString(DATE_LOCALE[locale], { timeZone: "UTC", ...opts });
}

const DAY_MS = 86_400_000;

/** Whole days from now until an ISO date (never negative). */
export function daysUntil(isoDate: string): number {
  return Math.max(0, Math.ceil((Date.parse(isoDate) - Date.now()) / DAY_MS));
}
