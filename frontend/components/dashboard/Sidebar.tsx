"use client";

import { Check, ChevronsUpDown, FileText, LayoutDashboard, PlayCircle, Plus, Settings, Users, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { switchCompany } from "@/lib/auth/actions";
import { useT } from "@/components/I18nProvider";
import type { AuthCompany } from "@/lib/auth/context";
import type { Dict } from "@/lib/i18n/dictionaries";

// Pages without an href are not built yet and render as disabled.
const NAV: { key: keyof Dict["shell"]["nav"]; icon: LucideIcon; href?: string }[] = [
  { key: "dashboard", icon: LayoutDashboard, href: "/" },
  { key: "employees", icon: Users, href: "/employees" },
  { key: "runs", icon: PlayCircle, href: "/runs" },
  { key: "tax", icon: FileText, href: "/tax" },
  { key: "settings", icon: Settings, href: "/settings" },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  companies: AuthCompany[];
  active: AuthCompany;
}

export function Sidebar({ open, onClose, companies, active }: SidebarProps) {
  const pathname = usePathname();
  const t = useT().shell;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-slate-900/40 transition-opacity lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col print:hidden border-r border-slate-200 bg-white transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600 text-sm font-bold text-white">F</div>
            <span className="text-lg font-semibold tracking-tight">FasoPay</span>
          </Link>
          <button onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label={t.closeMenu}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map(({ key, icon: Icon, href }) => {
            const label = t.nav[key];
            const base = "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors";
            if (!href) {
              return (
                <span key={label} className={`${base} cursor-not-allowed text-slate-400`} title={t.soon}>
                  <Icon className="h-4 w-4 text-slate-300" />
                  {label}
                  <span className="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-400">
                    {t.soon}
                  </span>
                </span>
              );
            }
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={label}
                href={href}
                onClick={onClose}
                aria-current={isActive ? "page" : undefined}
                className={`${base} ${
                  isActive ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-emerald-600" : "text-slate-400"}`} />
                {label}
              </Link>
            );
          })}
        </nav>

        <CompanySwitcher companies={companies} active={active} />
      </aside>
    </>
  );
}

function CompanySwitcher({ companies, active }: { companies: AuthCompany[]; active: AuthCompany }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const t = useT();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative border-t border-slate-200 p-3">
      {open && (
        <div role="menu" className="absolute inset-x-3 bottom-full mb-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <p className="px-3 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t.shell.companies}</p>
          <div className="max-h-64 overflow-y-auto">
            {companies.map((c) => (
              <form key={c.id} action={switchCompany}>
                <input type="hidden" name="companyId" value={c.id} />
                <button
                  type="submit"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-slate-800">{c.name}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {t.common.role[c.role]} · {c.city}
                    </span>
                  </span>
                  {c.id === active.id && <Check className="h-4 w-4 shrink-0 text-emerald-600" />}
                </button>
              </form>
            ))}
          </div>
          <Link
            href="/companies/new"
            className="flex items-center gap-2 border-t border-slate-100 px-3 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
          >
            <Plus className="h-4 w-4" />
            {t.shell.addCompany}
          </Link>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-slate-50"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-slate-500">{t.shell.company} · {t.common.role[active.role]}</span>
          <span className="block truncate text-sm font-medium text-slate-800">{active.name}</span>
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>
    </div>
  );
}
