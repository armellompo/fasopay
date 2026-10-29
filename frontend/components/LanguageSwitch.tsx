"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { LOCALES } from "@/lib/i18n/config";
import { setLocale } from "@/lib/i18n/actions";

import { useLocale } from "./I18nProvider";

/** FR | EN toggle. Saves the choice in a cookie and re-renders the page in that language. */
export function LanguageSwitch({ className = "" }: { className?: string }) {
  const current = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div role="group" aria-label="Langue / Language" className={`flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold ${className}`}>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          disabled={pending}
          aria-pressed={l === current}
          onClick={() =>
            startTransition(async () => {
              await setLocale(l);
              router.refresh();
            })
          }
          className={`rounded-md px-2 py-1 uppercase transition ${
            l === current ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
