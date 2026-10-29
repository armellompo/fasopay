"use client";

import { Bell, LogOut, Menu } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { useT } from "@/components/I18nProvider";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { RoleProvider } from "@/components/RoleProvider";
import { Sidebar } from "@/components/dashboard/Sidebar";
import type { AuthCompany } from "@/lib/auth/context";
import { logout } from "@/lib/auth/actions";
import { initials } from "@/lib/format";

interface AppShellProps {
  user: { name: string; email: string };
  companies: AuthCompany[];
  active: AuthCompany;
  children: ReactNode;
}

/** Sidebar + top bar shared by every signed-in page. */
export function AppShell({ user, companies, active, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const t = useT().shell;

  return (
    <div className="min-h-screen">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} companies={companies} active={active} />

      <div className="lg:pl-64 print:pl-0">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur sm:px-6 print:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label={t.openMenu}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-sm font-semibold text-slate-900">{active.name}</p>
              <p className="text-xs text-slate-500">{active.city}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitch />
            <button className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label={t.notifications}>
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-500" />
            </button>
            <UserMenu user={user} />
          </div>
        </header>

        <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
          <RoleProvider role={active.role}>{children}</RoleProvider>
        </main>
      </div>
    </div>
  );
}

function UserMenu({ user }: { user: { name: string; email: string } }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const t = useT().shell;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t.accountMenu}
        className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-xs font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
      >
        {initials(user.name)}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4 text-slate-400" />
              {t.signOut}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
