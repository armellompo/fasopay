"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { isLocale, LOCALE_COOKIE } from "./config";

export async function setLocale(locale: string): Promise<void> {
  if (!isLocale(locale)) return;
  cookies().set(LOCALE_COOKIE, locale, { path: "/", sameSite: "lax", maxAge: 365 * 86_400 });
  revalidatePath("/", "layout");
}
