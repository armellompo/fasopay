"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useT } from "@/components/I18nProvider";

const TABS = [
  { href: "/settings", key: "company" },
  { href: "/settings/team", key: "team" },
] as const;

export function SettingsTabs() {
  const pathname = usePathname();
  const t = useT().settings.tabs;
  return (
    <nav className="flex gap-1 border-b border-slate-200" aria-label={t.aria}>
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              active ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t[tab.key]}
          </Link>
        );
      })}
    </nav>
  );
}
