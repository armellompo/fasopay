"use client";

import { CalendarPlus, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";

import { useLocale, useT } from "@/components/I18nProvider";
import { useCan } from "@/components/RoleProvider";
import { Toast, useToast } from "@/components/Toast";
import { formatFcfa, periodLabel } from "@/lib/format";
import { openNextRun } from "@/lib/run-actions";
import type { RunSummary } from "@/lib/runs-service";

export type RunStatusKey = "paid" | "open" | "partial" | "calculated";

/** Run-level status; the label comes from the dictionary (runs.runStatus). */
export function runStatus(r: Pick<RunSummary, "headcount" | "draft" | "paid">): { key: RunStatusKey; cls: string } {
  if (r.headcount > 0 && r.paid === r.headcount) return { key: "paid", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" };
  if (r.draft > 0) return { key: "open", cls: "bg-slate-100 text-slate-600 ring-slate-200" };
  if (r.paid > 0) return { key: "partial", cls: "bg-sky-50 text-sky-700 ring-sky-200" };
  return { key: "calculated", cls: "bg-amber-50 text-amber-700 ring-amber-200" };
}

interface RunsViewProps {
  runs: RunSummary[];
  next: string;
  blockedBy: number;
}

export function RunsView({ runs, next, blockedBy }: RunsViewProps) {
  const [toast, setToast] = useToast();
  const [pending, startTransition] = useTransition();
  const canOpen = useCan("runs.open");
  const t = useT().runs;
  const locale = useLocale();

  const open = () =>
    startTransition(async () => {
      const res = await openNextRun();
      setToast({ kind: res.ok ? "success" : "error", text: res.message });
    });

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t.title}</h1>
          <p className="text-sm text-slate-500">{t.subtitle}</p>
        </div>
        {canOpen && (
        <div className="flex flex-col items-stretch gap-1 sm:items-end">
          <button
            onClick={open}
            disabled={pending || blockedBy > 0}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
            {t.open(periodLabel(next, locale))}
          </button>
          {blockedBy > 0 && (
            <p className="text-xs text-amber-700">
              {t.blocked(blockedBy, periodLabel(runs[0].period, locale))}
            </p>
          )}
        </div>
        )}
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {runs.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-slate-500">{t.none}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">{t.col.period}</th>
                  <th className="px-4 py-3">{t.col.status}</th>
                  <th className="px-4 py-3 text-right">{t.col.employees}</th>
                  <th className="px-4 py-3 text-right">{t.col.gross}</th>
                  <th className="px-4 py-3 text-right">{t.col.net}</th>
                  <th className="px-4 py-3 text-right">{t.col.cost}</th>
                  <th className="px-4 py-3">{t.col.paidOut}</th>
                  <th className="px-4 py-3">{t.col.filings}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {runs.map((r) => {
                  const status = runStatus(r);
                  const pct = r.headcount ? Math.round((r.paid / r.headcount) * 100) : 0;
                  return (
                    <tr key={r.period} className="group relative transition-colors hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                        <Link href={`/runs/${r.period}`} className="after:absolute after:inset-0">
                          {periodLabel(r.period, locale)}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${status.cls}`}>
                          {t.runStatus[status.key]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{r.headcount}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatFcfa(r.gross, false)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums">{formatFcfa(r.net, false)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatFcfa(r.employerCost, false)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs tabular-nums text-slate-500">
                            {r.paid}/{r.headcount}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{t.filed(r.filings)}</td>
                      <td className="px-4 py-3 text-right">
                        <ChevronRight className="ml-auto h-4 w-4 text-slate-300 group-hover:text-slate-500" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Toast toast={toast} />
    </>
  );
}
