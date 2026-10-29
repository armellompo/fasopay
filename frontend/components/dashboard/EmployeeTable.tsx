"use client";

import { Search, UserX } from "lucide-react";
import { useMemo, useState } from "react";

import { useT } from "@/components/I18nProvider";
import { formatFcfa, initials } from "@/lib/format";
import type { EmployeePayRow, PaymentMethod, PayStatus } from "@/lib/types";

const STATUS_STYLES: Record<PayStatus, string> = {
  Draft: "bg-slate-100 text-slate-600 ring-slate-200",
  Calculated: "bg-amber-50 text-amber-700 ring-amber-200",
  Paid: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

const METHOD_DOT: Record<PaymentMethod, string> = {
  "Orange Money": "bg-orange-500",
  "Moov Money": "bg-blue-600",
  Wave: "bg-sky-400",
  "Bank Transfer": "bg-slate-500",
};

const FILTERS: ("All" | PayStatus)[] = ["All", "Draft", "Calculated", "Paid"];

export function EmployeeTable({ rows }: { rows: EmployeePayRow[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const t = useT();
  const tt = t.dashboard.table;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (filter === "All" || r.status === filter) &&
        (!q || r.name.toLowerCase().includes(q) || r.department.toLowerCase().includes(q)),
    );
  }, [rows, query, filter]);

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-slate-900">{tt.title}</h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1.5 transition ${
                  filter === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {f === "All" ? t.common.all : t.common.status[f]}
              </button>
            ))}
          </div>
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tt.search}
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 sm:w-64"
            />
          </label>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
          <UserX className="h-8 w-8 text-slate-300" />
          <p className="text-sm font-medium text-slate-700">{tt.noMatch}</p>
          <p className="text-sm text-slate-500">
            {rows.length === 0 ? tt.noEmployees : tt.tryAgain}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">{tt.employee}</th>
                <th className="px-4 py-3">{tt.department}</th>
                <th className="px-4 py-3 text-right">{tt.gross}</th>
                <th className="px-4 py-3 text-right">{tt.net}</th>
                <th className="px-4 py-3">{tt.method}</th>
                <th className="px-4 py-3">{tt.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
                        {initials(r.name)}
                      </span>
                      <div>
                        <p className="font-medium text-slate-900">{r.name}</p>
                        <p className="text-xs text-slate-500">{r.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{r.department}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-700">
                    {formatFcfa(r.grossSalary, false)}
                  </td>
                  <td
                    className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums text-slate-900"
                    title={r.status === "Draft" ? tt.notCalculated : tt.deductions(formatFcfa(r.employeeDeductions))}
                  >
                    {r.status === "Draft" ? <span className="font-normal text-slate-400">{t.common.pending}</span> : formatFcfa(r.netPayout, false)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                    <span className="inline-flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${METHOD_DOT[r.paymentMethod]}`} />
                      {t.common.method[r.paymentMethod]}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[r.status]}`}>
                      {t.common.status[r.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
