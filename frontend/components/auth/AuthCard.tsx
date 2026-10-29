import type { ReactNode } from "react";

import { LanguageSwitch } from "@/components/LanguageSwitch";

/** Centered card with the FasoPay mark, used by sign-in, sign-up and company setup. */
export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <LanguageSwitch className="absolute right-4 top-4" />
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-600 font-bold text-white">F</div>
          <span className="text-xl font-semibold tracking-tight">FasoPay</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-lg font-semibold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-4 text-center text-sm text-slate-500">{footer}</div>}
      </div>
    </main>
  );
}

export function AuthField({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
    </label>
  );
}

export const authInput = (error?: string) =>
  `block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
    error ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500" : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
  }`;
