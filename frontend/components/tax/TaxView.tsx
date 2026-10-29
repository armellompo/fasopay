"use client";

import type { TaxAuthority } from "@prisma/client";
import { AlertTriangle, CheckCircle2, Download, Landmark, Loader2, Printer, ShieldCheck, Undo2, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { useLocale, useT } from "@/components/I18nProvider";
import { Toast, useToast } from "@/components/Toast";
import { daysUntil, formatDate, formatFcfa, periodLabel } from "@/lib/format";
import type { Dict } from "@/lib/i18n/dictionaries";
import { markFiled, undoFiling } from "@/lib/tax-actions";
import type { Remittance, TaxDeclaration, TaxLine } from "@/lib/tax-service";

// Subtitles come from the dictionary (tax.authority).
const META: Record<TaxAuthority, { title: string; icon: typeof Landmark }> = {
  DGI: { title: "DGI", icon: Landmark },
  CNSS: { title: "CNSS", icon: ShieldCheck },
  FSP: { title: "FSP", icon: Users },
};

// Header labels come from the dictionary (tax.columns); the CSV keeps these stable keys.
const COLUMNS: { key: keyof Omit<TaxLine, "code" | "name"> }[] = [
  { key: "gross" },
  { key: "cnssBase" },
  { key: "cnssEmployee" },
  { key: "cnssEmployer" },
  { key: "iuts" },
  { key: "tpa" },
  { key: "fsp" },
];

/** État nominatif as CSV (semicolon-separated, opens directly in French-locale Excel). */
function toCsv(d: TaxDeclaration): string {
  const header = ["code", "employee", ...COLUMNS.map((c) => c.key)].join(";");
  const rows = d.lines.map((l) => [l.code, `"${l.name}"`, ...COLUMNS.map((c) => l[c.key])].join(";"));
  const total = ["TOTAL", "", ...COLUMNS.map((c) => d.totals[c.key])].join(";");
  const summary = d.remittances.map((r) => `${r.authority};due;${r.amount}`);
  return ["﻿" + header, ...rows, total, "", "authority;;amount", ...summary].join("\r\n");
}

export function TaxView({ declaration: d }: { declaration: TaxDeclaration }) {
  const router = useRouter();
  const [toast, setToast] = useToast();
  const t = useT().tax;
  const locale = useLocale();
  const label = periodLabel(d.period, locale);
  const deadline = formatDate(d.deadline, locale, { day: "numeric", month: "long", year: "numeric" });
  const days = daysUntil(d.deadline);
  const allFiled = d.remittances.every((r) => r.filing);
  const totalDue = d.remittances.reduce((s, r) => s + r.amount, 0);

  const exportCsv = () => {
    const url = URL.createObjectURL(new Blob([toCsv(d)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `fasopay-etat-nominatif-${d.period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setToast({ kind: "success", text: t.exported });
  };

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t.title}</h1>
          <p className="text-sm text-slate-500">
            {d.companyName} · {label} · {t.due(deadline)}
            {!allFiled && (
              <span className={`ml-2 font-medium ${days <= 5 ? "text-rose-600" : "text-amber-600"}`}>
                {t.daysLeft(days)}
              </span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {d.ifu || d.cnssEmployerNumber ? (
              <>
                {d.ifu && <>{t.ifu} {d.ifu}</>}
                {d.ifu && d.cnssEmployerNumber && " · "}
                {d.cnssEmployerNumber && <>{t.cnssEmployerNo} {d.cnssEmployerNumber}</>}
              </>
            ) : (
              <Link href="/settings" className="text-amber-700 underline underline-offset-2 print:hidden">
                {t.addIds}
              </Link>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <select
            value={d.period}
            onChange={(e) => router.push(`/tax?period=${e.target.value}`)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            aria-label={t.period}
          >
            {d.periods.map((p) => (
              <option key={p} value={p}>
                {periodLabel(p, locale)}
              </option>
            ))}
          </select>
          <button
            onClick={exportCsv}
            disabled={d.lines.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {t.exportCsv}
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Printer className="h-4 w-4" />
            {t.print}
          </button>
        </div>
      </div>

      {d.pending.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <span className="font-semibold">{t.incompleteTitle}</span> {t.incomplete(d.pending.length, label, d.pending.join(", "))}
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {d.remittances.map((r) => (
          <RemittanceCard
            key={r.authority}
            r={r}
            period={d.period}
            blocked={d.pending.length > 0}
            breakdown={breakdownFor(r.authority, d, t)}
            onDone={(ok, text) => setToast({ kind: ok ? "success" : "error", text })}
          />
        ))}
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <div>
            <h2 className="text-base font-semibold">{t.statement}</h2>
            <p className="text-xs text-slate-500">{t.statementHint(label)}</p>
          </div>
          <p className="text-sm text-slate-500">
            {t.totalDue} <span className="font-semibold tabular-nums text-slate-900">{formatFcfa(totalDue)}</span>
          </p>
        </div>
        {d.lines.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-slate-500">{t.noLines}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">{t.employee}</th>
                  {COLUMNS.map((c) => (
                    <th key={c.key} className="whitespace-nowrap px-4 py-3 text-right">
                      {t.columns[c.key]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {d.lines.map((l) => (
                  <tr key={l.code} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <span className="font-medium text-slate-900">{l.name}</span>
                      <span className="ml-2 text-xs text-slate-500">{l.code}</span>
                    </td>
                    {COLUMNS.map((c) => (
                      <td key={c.key} className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-slate-700">
                        {formatFcfa(l[c.key], false)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                <tr>
                  <td className="px-4 py-3">{t.total(d.lines.length)}</td>
                  {COLUMNS.map((c) => (
                    <td key={c.key} className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                      {formatFcfa(d.totals[c.key], false)}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-slate-400">
        {t.footnote}
      </p>

      <Toast toast={toast} />
    </>
  );
}

function breakdownFor(a: TaxAuthority, d: TaxDeclaration, t: Dict["tax"]): [string, number][] {
  const s = d.totals;
  const b = t.breakdown;
  if (a === "DGI") return [[b.iuts, s.iuts], [b.tpa, s.tpa]];
  if (a === "CNSS") return [[b.cnssEmployee, s.cnssEmployee], [b.cnssEmployer, s.cnssEmployer], [b.cnssBase, s.cnssBase]];
  return [[b.fsp, s.fsp]];
}

interface CardProps {
  r: Remittance;
  period: string;
  blocked: boolean;
  breakdown: [string, number][];
  onDone: (ok: boolean, text: string) => void;
}

function RemittanceCard({ r, period, blocked, breakdown, onDone }: CardProps) {
  const [filing, setFiling] = useState(false);
  const [reference, setReference] = useState("");
  const [pending, startTransition] = useTransition();
  const t = useT().tax;
  const locale = useLocale();
  const { title, icon: Icon } = META[r.authority];
  const subtitle = t.authority[r.authority];
  const drifted = r.filing && r.filing.amount !== r.amount;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await markFiled(period, r.authority, reference);
      onDone(res.ok, res.message);
      if (res.ok) setFiling(false);
    });
  };

  const reopen = () =>
    startTransition(async () => {
      const res = await undoFiling(period, r.authority);
      onDone(res.ok, res.message);
    });

  return (
    <section
      className={`flex flex-col rounded-xl border bg-white p-5 shadow-sm ${r.filing ? "border-emerald-200" : "border-slate-200"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-600">
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">{title}</h2>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>
        {r.filing ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
            <CheckCircle2 className="h-3 w-3" /> {t.filed}
          </span>
        ) : (
          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
            {t.toFile}
          </span>
        )}
      </div>

      <p className="mt-4 text-2xl font-semibold tracking-tight tabular-nums">{formatFcfa(r.amount)}</p>
      <dl className="mt-3 space-y-1 text-sm">
        {breakdown.map(([k, v]) => (
          <div key={k} className="flex justify-between">
            <dt className="text-slate-500">{k}</dt>
            <dd className="tabular-nums">{formatFcfa(v)}</dd>
          </div>
        ))}
      </dl>

      {drifted && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {t.drift(formatFcfa(r.filing!.amount), formatFcfa(r.amount))}
        </p>
      )}

      <div className="mt-auto pt-4 print:hidden">
        {r.filing ? (
          <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              {formatDate(r.filing.filedAt, locale)}
              {r.filing.reference && <> · {t.ref} {r.filing.reference}</>}
            </span>
            <button
              onClick={reopen}
              disabled={pending}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              <Undo2 className="h-3.5 w-3.5" /> {t.reopen}
            </button>
          </div>
        ) : filing ? (
          <form onSubmit={submit} className="flex gap-2">
            <input
              autoFocus
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder={t.referencePh}
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-70"
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t.confirm}
            </button>
          </form>
        ) : (
          <button
            onClick={() => setFiling(true)}
            disabled={blocked || r.amount === 0}
            title={blocked ? t.blockedHint : undefined}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t.markFiled}
          </button>
        )}
      </div>
    </section>
  );
}
