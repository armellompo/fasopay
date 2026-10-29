import Link from "next/link";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { getT } from "@/lib/i18n/server";
import { getDashboard } from "@/lib/payroll-service";

// Always read fresh payroll data from the database.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboard();

  if (!data) {
    const t = getT();
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <h1 className="text-lg font-semibold">{t.dashboard.noMonth}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {t.dashboard.noMonthHint}{" "}
          <Link href="/runs" className="font-medium text-emerald-700 hover:underline">
            {t.shell.nav.runs}
          </Link>
          .
        </p>
      </div>
    );
  }
  return <DashboardShell initial={data} />;
}
