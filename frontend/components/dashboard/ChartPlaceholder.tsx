"use client";

import { BarChart3 } from "lucide-react";

import { useT } from "@/components/I18nProvider";

import { formatFcfa } from "@/lib/format";
import type { EmployeePayRow } from "@/lib/types";

/** Slot for the future "Earnings vs Deductions" chart; shows live totals meanwhile. */
export function ChartPlaceholder({ rows }: { rows: EmployeePayRow[] }) {
  const c = useT().dashboard.chart;
  const gross = rows.reduce((s, r) => s + r.grossSalary, 0);
  const deductions = rows.reduce((s, r) => s + r.employeeDeductions, 0);
  const employer = rows.reduce((s, r) => s + r.employerCharges, 0);
  const deductionPct = gross ? Math.round((deductions / gross) * 100) : 0;

  return (
    <section className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">{c.title}</h2>
      <p className="text-sm text-slate-500">{c.subtitle}</p>

      <div className="mt-4 grid flex-1 place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
        <div>
          <BarChart3 className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm font-medium text-slate-600">{c.placeholder}</p>
          <p className="text-xs text-slate-400">{c.hint}</p>
        </div>
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-500">{c.gross}</dt>
          <dd className="font-medium tabular-nums">{formatFcfa(gross)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">{c.deductions(deductionPct)}</dt>
          <dd className="font-medium tabular-nums text-rose-600">−{formatFcfa(deductions)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">{c.employer}</dt>
          <dd className="font-medium tabular-nums">{formatFcfa(employer)}</dd>
        </div>
      </dl>
    </section>
  );
}
