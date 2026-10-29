import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "./config";
import { dictionaries, type Dict } from "./dictionaries";

/** The visitor's language, from the cookie set by the FR/EN switch. Cached per request. */
export const getLocale = cache((): Locale => {
  const v = cookies().get(LOCALE_COOKIE)?.value;
  return isLocale(v) ? v : DEFAULT_LOCALE;
});

/** Messages in the visitor's language, for server components and server actions. */
export function getT(): Dict {
  return dictionaries[getLocale()];
}
