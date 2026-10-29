"use client";

import { CalendarClock, Users, Wallet } from "lucide-react";
import { useCallback, useState } from "react";

import { ActionsPanel } from "@/components/dashboard/ActionsPanel";
import { ChartPlaceholder } from "@/components/dashboard/ChartPlaceholder";
import { EmployeeTable } from "@/components/dashboard/EmployeeTable";
import { StatCard } from "@/components/dashboard/StatCard";
import { useLocale, useT } from "@/components/I18nProvider";
import { Toast, useToast } from "@/components/Toast";
import { PRICE_PER_EMPLOYEE } from "@/lib/billing";
import { downloadText, toBulkPayCsv } from "@/lib/bulk-pay";
import { daysUntil, formatDate, formatFcfa, periodLabel } from "@/lib/format";
import type { DashboardData, RunPayrollResponse } from "@/lib/types";

export function DashboardShell({ initial }: { initial: DashboardData }) {
  const [data, setData] = useState<DashboardData>(initial);
  const [running, setRunning] = useState(false);
  const [toast, setToast] = useToast();
  const t = useT();
  const locale = useLocale();
  const d = t.dashboard;

  const { company, rows, period } = data;
  const label = periodLabel(period, locale);

  const runPayroll = useCallback(async () => {
    setRunning(true);
    try {
      // Server recomputes every unpaid payslip via the compliance engine and saves it.
      const res = await fetch("/api/payroll/run", { method: "POST" });
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = body && typeof body === "object" && "error" in body ? String(body.error) : d.failed;
        throw new Error(msg);
      }
      const { calculated, data: next } = body as RunPayrollResponse;
      setData(next);
      setToast({
        kind: "success",
        text: calculated === 0 ? d.allPaid : d.calculated(calculated, label),
      });
    } catch (err) {
      setToast({ kind: "error", text: err instanceof Error ? err.message : d.failed });
    } finally {
      setRunning(false);
    }
  }, [label, setToast, d]);

  const exportCsv = useCallback(() => {
    downloadText(`fasopay-bulk-${period}.csv`, toBulkPayCsv(rows, period));
    setToast({ kind: "success", text: d.exported });
  }, [rows, period, setToast, d]);

  const daysLeft = daysUntil(data.nextDeadline);
  const deadlineLabel = formatDate(data.nextDeadline, locale, { day: "numeric", month: "short" });
  const payable = rows.some((r) => r.status !== "Draft");

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">{d.title}</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label={d.outlay}
          value={formatFcfa(data.totalMonthlyOutlay)}
          icon={Wallet}
          tone="emerald"
          footnote={d.outlayNote}
        />
        <StatCard
          label={d.activeEmployees}
          value={d.employeesCount(company.activeEmployees)}
          icon={Users}
          footnote={d.subscription(formatFcfa(company.activeEmployees * PRICE_PER_EMPLOYEE))}
        />
        <StatCard
          label={d.deadline}
          value={deadlineLabel}
          icon={CalendarClock}
          tone="amber"
          footnote={d.filing(t.common.daysLeft(daysLeft))}
        />
      </div>

      <ActionsPanel
        period={label}
        running={running}
        onRunPayroll={runPayroll}
        onExport={exportCsv}
        exportDisabled={!payable}
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <EmployeeTable rows={rows} />
        </div>
        <ChartPlaceholder rows={rows} />
      </div>
      <Toast toast={toast} />
    </>
  );
}
