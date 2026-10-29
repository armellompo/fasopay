"use client";

import { ArrowLeft, Calculator, CheckCheck, Download, FileText, Loader2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { useLocale, useT } from "@/components/I18nProvider";
import { useCan } from "@/components/RoleProvider";
import { Toast, useToast } from "@/components/Toast";
import { downloadText, toBulkPayCsv } from "@/lib/bulk-pay";
import { formatDate, formatFcfa, periodLabel } from "@/lib/format";
import { calculateRun, markPaid } from "@/lib/run-actions";
import type { RunDetail } from "@/lib/runs-service";
import type { EmployeePayRow, PaymentMethod } from "@/lib/types";

import { runStatus } from "./RunsView";

const STATUS_STYLES: Record<EmployeePayRow["status"], string> = {
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

export function RunDetailView({ detail }: { detail: RunDetail }) {
  const { period, rows } = detail;
  const tAll = useT();
  const t = tAll.runs.detail;
  const locale = useLocale();
  const label = periodLabel(period, locale);
  const [toast, setToast] = useToast();
  const [pending, startTransition] = useTransition();
  const [method, setMethod] = useState<PaymentMethod | "All">("All");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const canPay = useCan("runs.markPaid");

  const counts = {
    headcount: rows.length,
    draft: rows.filter((r) => r.status === "Draft").length,
    paid: rows.filter((r) => r.status === "Paid").length,
  };
  const status = runStatus(counts);
  const done = rows.filter((r) => r.status !== "Draft");
  const totals = {
    gross: done.reduce((s, r) => s + r.grossSalary, 0),
    net: done.reduce((s, r) => s + r.netPayout, 0),
    employer: done.reduce((s, r) => s + r.grossSalary + r.employerCharges, 0),
    paidOut: rows.filter((r) => r.status === "Paid").reduce((s, r) => s + r.netPayout, 0),
  };

  const methods = useMemo(() => {
    const m = new Map<PaymentMethod, number>();
    rows.forEach((r) => m.set(r.paymentMethod, (m.get(r.paymentMethod) ?? 0) + 1));
    return [...m.entries()];
  }, [rows]);

  const visible = rows.filter((r) => method === "All" || r.paymentMethod === method);
  const payable = visible.filter((r) => r.status === "Calculated");
  const selectedRows = rows.filter((r) => selected.has(r.id));
  const selectedTotal = selectedRows.reduce((s, r) => s + r.netPayout, 0);
  const allVisibleSelected = payable.length > 0 && payable.every((r) => selected.has(r.id));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      payable.forEach((r) => (allVisibleSelected ? next.delete(r.id) : next.add(r.id)));
      return next;
    });

  const calculate = () =>
    startTransition(async () => {
      const res = await calculateRun(period);
      setToast({ kind: res.ok ? "success" : "error", text: res.message });
    });

  const pay = () =>
    startTransition(async () => {
      const res = await markPaid(period, [...selected]);
      setToast({ kind: res.ok ? "success" : "error", text: res.message });
      if (res.ok) {
        setSelected(new Set());
        setConfirming(false);
      }
    });

  const exportCsv = () => {
    const source = selectedRows.length > 0 ? selectedRows : rows.filter((r) => r.status === "Calculated");
    const suffix = method === "All" ? "" : `-${method.toLowerCase().replace(/\s+/g, "-")}`;
    downloadText(`fasopay-bulk-${period}${suffix}.csv`, toBulkPayCsv(source, period));
    setToast({ kind: "success", text: t.exported(source.length) });
  };

  return (
    <>
      <div>
        <Link href="/runs" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-4 w-4" /> {t.back}
        </Link>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight">{label}</h1>
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${status.cls}`}>
              {tAll.runs.runStatus[status.key]}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={calculate}
              disabled={pending || counts.paid === counts.headcount}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
              {counts.draft > 0 ? t.calculate : t.recalculate}
            </button>
            <button
              onClick={exportCsv}
              disabled={selectedRows.length === 0 && !rows.some((r) => r.status === "Calculated")}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {selectedRows.length > 0 ? t.exportSelected(selectedRows.length) : t.exportUnpaid}
            </button>
            {done.length > 0 && (
              <a
                href={`/api/payslips/${period}${selectedRows.length > 0 ? `?employees=${selectedRows.map((r) => r.id).join(",")}` : ""}`}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                <FileText className="h-4 w-4" />
                {selectedRows.length > 0 ? t.payslipsSelected(selectedRows.length) : t.payslipsAll}
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [t.stats.gross, totals.gross],
          [t.stats.net, totals.net],
          [t.stats.cost, totals.employer],
          [t.stats.paidOut, totals.paidOut],
        ].map(([k, v]) => (
          <div key={k as string} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">{k}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{formatFcfa(v as number)}</p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1 text-xs font-medium">
            {(["All", ...methods.map(([m]) => m)] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition ${
                  method === m ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:text-slate-900"
                }`}
              >
                {m !== "All" && <span className={`h-2 w-2 rounded-full ${METHOD_DOT[m]}`} />}
                {m === "All" ? tAll.common.all : tAll.common.method[m]}
                <span className="opacity-60">{m === "All" ? rows.length : methods.find(([x]) => x === m)?.[1]}</span>
              </button>
            ))}
          </div>

          {selectedRows.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {confirming ? (
                <>
                  <span className="text-sm text-slate-700">
                    {t.confirm(selectedRows.length, formatFcfa(selectedTotal))}
                  </span>
                  <button
                    onClick={() => setConfirming(false)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {tAll.common.cancel}
                  </button>
                  <button
                    onClick={pay}
                    disabled={pending}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-70"
                  >
                    {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t.confirmPaid}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirming(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  <CheckCheck className="h-4 w-4" />
                  {t.markPaid(selectedRows.length, formatFcfa(selectedTotal))}
                </button>
              )}
            </div>
          )}
        </div>

        {visible.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-slate-500">{t.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  {canPay && (
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label={t.selectAll}
                      checked={allVisibleSelected}
                      disabled={payable.length === 0}
                      onChange={toggleAll}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-40"
                    />
                  </th>
                  )}
                  <th className="px-4 py-3">{t.col.employee}</th>
                  <th className="px-4 py-3">{t.col.payout}</th>
                  <th className="px-4 py-3 text-right">{t.col.gross}</th>
                  <th className="px-4 py-3 text-right">{t.col.deductions}</th>
                  <th className="px-4 py-3 text-right">{t.col.net}</th>
                  <th className="px-4 py-3 text-right">{t.col.employer}</th>
                  <th className="px-4 py-3">{t.col.status}</th>
                  <th className="px-4 py-3">
                    <span className="sr-only">{t.col.payslip}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((r) => {
                  const draft = r.status === "Draft";
                  return (
                    <tr key={r.id} className={`transition-colors hover:bg-slate-50 ${selected.has(r.id) ? "bg-emerald-50/50" : ""}`}>
                      {canPay && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          aria-label={t.select(r.name)}
                          checked={selected.has(r.id)}
                          disabled={r.status !== "Calculated"}
                          onChange={() => toggle(r.id)}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-30"
                        />
                      </td>
                      )}
                      <td className="whitespace-nowrap px-4 py-3">
                        <p className="font-medium text-slate-900">{r.name}</p>
                        <p className="text-xs text-slate-500">
                          {r.code} · {r.role}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        <span className="inline-flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${METHOD_DOT[r.paymentMethod]}`} />
                          {tAll.common.method[r.paymentMethod]}
                        </span>
                        {r.mobileMoneyNumber && <p className="pl-4 text-xs tabular-nums text-slate-500">{r.mobileMoneyNumber}</p>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatFcfa(r.grossSalary, false)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-rose-600">
                        {draft ? "—" : `−${formatFcfa(r.employeeDeductions, false)}`}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums">
                        {draft ? <span className="font-normal text-slate-400">{tAll.common.pending}</span> : formatFcfa(r.netPayout, false)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-600">
                        {draft ? "—" : formatFcfa(r.employerCharges, false)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[r.status]}`}>
                          {tAll.common.status[r.status]}
                        </span>
                        {r.paidAt && (
                          <p className="mt-0.5 text-xs text-slate-500">{formatDate(r.paidAt, locale)}</p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        {!draft && (
                          <a
                            href={`/api/payslips/${period}/${r.id}`}
                            target="_blank"
                            rel="noopener"
                            title={t.payslipTitle(r.name)}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            {t.payslip}
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-slate-400">
        {t.flow}
      </p>

      <Toast toast={toast} />
    </>
  );
}
