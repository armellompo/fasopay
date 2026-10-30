"use client";

import { AlertTriangle, ArrowLeft, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import Link from "next/link";
import { useRef, useState, useTransition, type DragEvent } from "react";

import { useT } from "@/components/I18nProvider";
import { useCan } from "@/components/RoleProvider";
import { Toast, useToast } from "@/components/Toast";
import { formatFcfa } from "@/lib/format";
import { commitImport, previewImport, type ImportPreviewState } from "@/lib/import-actions";

export function ImportView() {
  const t = useT();
  const ti = t.import;
  const canManage = useCan("employees.manage");
  // The file is sent from code (picker or drop), not a form submit, so call the action directly.
  const [state, setState] = useState<ImportPreviewState>({ status: "idle" });
  const [reading, startReading] = useTransition();
  const [committing, startCommit] = useTransition();
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [imported, setImported] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useToast();
  const fileRef = useRef<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const formWith = (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return fd;
  };

  const choose = (file: File | undefined) => {
    if (!file) return;
    fileRef.current = file;
    setImported(null);
    setOnlyErrors(false);
    startReading(async () => setState(await previewImport({ status: "idle" }, formWith(file))));
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    choose(e.dataTransfer.files[0]);
  };

  const commit = () => {
    const file = fileRef.current;
    if (!file) return;
    startCommit(async () => {
      const res = await commitImport(formWith(file));
      if (res.ok) setImported(res.imported);
      else setToast({ kind: "error", text: res.message });
    });
  };

  const rows = state.status === "preview" ? state.rows.filter((r) => !onlyErrors || r.errors.length > 0) : [];

  return (
    <>
      <div>
        <Link href="/employees" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-4 w-4" /> {ti.back}
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">{ti.title}</h1>
        <p className="text-sm text-slate-500">{ti.subtitle}</p>
      </div>

      {!canManage ? (
        <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">{ti.readOnly}</p>
      ) : imported !== null ? (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
            <div>
              <h2 className="text-lg font-semibold text-emerald-900">{ti.done(imported)}</h2>
              <p className="mt-1 text-sm text-emerald-800">{ti.doneHint}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/employees" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                  {ti.viewEmployees}
                </Link>
                <Link href="/" className="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50">
                  {ti.runPayroll}
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold">{ti.step1}</h2>
              <p className="mt-1 text-sm text-slate-500">{ti.step1Hint}</p>
              <a
                href="/api/employees/template"
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-4 w-4" />
                {ti.downloadTemplate}
              </a>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold">{ti.step2}</h2>
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={`mt-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition ${
                  dragOver ? "border-emerald-500 bg-emerald-50" : "border-slate-300 hover:border-emerald-400 hover:bg-slate-50"
                }`}
              >
                {reading ? <Loader2 className="h-6 w-6 animate-spin text-emerald-600" /> : <Upload className="h-6 w-6 text-slate-400" />}
                <span className="text-sm font-medium text-slate-700">
                  {reading ? ti.reading : fileRef.current?.name ?? ti.dropHint}
                </span>
                <span className="text-xs text-slate-400">{ti.formats}</span>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                  className="sr-only"
                  onChange={(e) => {
                    choose(e.target.files?.[0]);
                    e.target.value = ""; // allow re-selecting the same file after fixing it
                  }}
                />
              </label>
            </section>
          </div>

          {state.status === "error" && !reading && (
            <p role="alert" className="flex items-start gap-2 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {state.message}
            </p>
          )}

          {state.status === "preview" && !reading && (
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="space-y-3 border-b border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                    <h2 className="text-sm font-semibold">{ti.step3}</h2>
                    <span className="text-xs text-slate-400">{state.fileName}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs font-medium">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 ring-1 ring-inset ring-emerald-200">
                      {ti.summary.valid(state.valid)}
                    </span>
                    {state.invalid > 0 && (
                      <span className="rounded-full bg-rose-50 px-2.5 py-1 text-rose-700 ring-1 ring-inset ring-rose-200">
                        {ti.summary.invalid(state.invalid)}
                      </span>
                    )}
                  </div>
                </div>
                {state.ignored.length > 0 && <p className="text-xs text-slate-500">{ti.summary.ignored(state.ignored.join(", "))}</p>}
                {state.defaulted.length > 0 && <p className="text-xs text-amber-700">{ti.summary.defaulted(state.defaulted.join(", "))}</p>}
                {state.invalid > 0 && (
                  <label className="flex w-fit items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={onlyErrors}
                      onChange={(e) => setOnlyErrors(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    {ti.onlyErrors}
                  </label>
                )}
              </div>

              <div className="max-h-[28rem] overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">{ti.col.line}</th>
                      <th className="px-4 py-3">{ti.col.name}</th>
                      <th className="px-4 py-3">{ti.col.role}</th>
                      <th className="px-4 py-3 text-right">{ti.col.gross}</th>
                      <th className="px-4 py-3">{ti.col.payout}</th>
                      <th className="px-4 py-3">{ti.col.status}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((r) => (
                      <tr key={r.line} className={r.errors.length ? "bg-rose-50/40" : ""}>
                        <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-slate-400">{r.line}</td>
                        <td className="whitespace-nowrap px-4 py-2.5 font-medium text-slate-900">{r.name || "—"}</td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{r.role || "—"}</td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">{r.gross !== null ? formatFcfa(r.gross, false) : "—"}</td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{r.payout || "—"}</td>
                        <td className="px-4 py-2.5">
                          {r.errors.length === 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" /> {ti.ok}
                            </span>
                          ) : (
                            <ul className="space-y-0.5 text-xs text-rose-700">
                              {r.errors.map((e) => (
                                <li key={e}>{e}</li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">{state.invalid > 0 ? ti.skipNote : ""}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {ti.chooseAnother}
                  </button>
                  <button
                    type="button"
                    onClick={commit}
                    disabled={committing || state.valid === 0}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {committing && <Loader2 className="h-4 w-4 animate-spin" />}
                    {committing ? ti.importing : ti.importN(state.valid)}
                  </button>
                </div>
              </div>
            </section>
          )}
        </>
      )}

      <Toast toast={toast} />
    </>
  );
}
