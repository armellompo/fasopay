"use client";

import { Download, Loader2, Play } from "lucide-react";

import { useT } from "@/components/I18nProvider";

interface ActionsPanelProps {
  period: string;
  running: boolean;
  onRunPayroll: () => void;
  onExport: () => void;
  exportDisabled: boolean;
}

export function ActionsPanel({ period, running, onRunPayroll, onExport, exportDisabled }: ActionsPanelProps) {
  const d = useT().dashboard;
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-base font-semibold text-slate-900">{d.period(period)}</h2>
        <p className="text-sm text-slate-500">{d.periodHint}</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          onClick={onExport}
          disabled={exportDisabled}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {d.exportBulk}
        </button>
        <button
          onClick={onRunPayroll}
          disabled={running}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-70"
        >
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {running ? d.calculating : d.run}
        </button>
      </div>
    </section>
  );
}
