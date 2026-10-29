import "server-only";

import { prisma } from "./db";
import { currentCompany } from "./payroll-service";
import { toRow } from "./payslip";
import type { EmployeePayRow } from "./types";

export interface RunSummary {
  period: string;
  headcount: number;
  draft: number;
  calculated: number;
  paid: number;
  gross: number;
  net: number;
  employerCost: number;
  filings: number;
}

export interface RunDetail {
  period: string;
  isLatest: boolean;
  rows: EmployeePayRow[];
}

/** "2026-11" → "2026-12" */
export function nextPeriod(period: string): string {
  const [y, m] = period.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

function thisMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/** Rows for a run: everyone with a payslip in it, plus (latest run only) active employees not yet included. */
async function runRows(companyId: string, runId: string, isLatest: boolean): Promise<EmployeePayRow[]> {
  const employees = await prisma.employee.findMany({
    where: {
      companyId,
      OR: [{ payslips: { some: { runId } } }, ...(isLatest ? [{ active: true }] : [])],
    },
    include: { payslips: { where: { runId } } },
    orderBy: { code: "asc" },
  });
  return employees.map((e) => toRow(e, e.payslips[0]));
}

export async function listRuns(): Promise<{ runs: RunSummary[]; next: string; blockedBy: number }> {
  const company = await currentCompany();
  if (!company) return { runs: [], next: thisMonth(), blockedBy: 0 };

  const runs = await prisma.payrollRun.findMany({
    where: { companyId: company.id },
    orderBy: { period: "desc" },
    include: { _count: { select: { filings: true } } },
  });

  const summaries = await Promise.all(
    runs.map(async (run, i): Promise<RunSummary> => {
      const rows = await runRows(company.id, run.id, i === 0);
      const count = (s: EmployeePayRow["status"]) => rows.filter((r) => r.status === s).length;
      const done = rows.filter((r) => r.status !== "Draft");
      return {
        period: run.period,
        headcount: rows.length,
        draft: count("Draft"),
        calculated: count("Calculated"),
        paid: count("Paid"),
        gross: done.reduce((s, r) => s + r.grossSalary, 0),
        net: done.reduce((s, r) => s + r.netPayout, 0),
        employerCost: done.reduce((s, r) => s + r.grossSalary + r.employerCharges, 0),
        filings: run._count.filings,
      };
    }),
  );

  return {
    runs: summaries,
    next: summaries[0] ? nextPeriod(summaries[0].period) : thisMonth(),
    // The next month can only open once the latest one is fully calculated.
    blockedBy: summaries[0]?.draft ?? 0,
  };
}

export async function getRunDetail(period: string): Promise<RunDetail | null> {
  const company = await currentCompany();
  if (!company) return null;
  const [run, latest] = await Promise.all([
    prisma.payrollRun.findUnique({ where: { companyId_period: { companyId: company.id, period } } }),
    prisma.payrollRun.findFirst({ where: { companyId: company.id }, orderBy: { period: "desc" }, select: { id: true } }),
  ]);
  if (!run) return null;
  const isLatest = latest?.id === run.id;
  return { period: run.period, isLatest, rows: await runRows(company.id, run.id, isLatest) };
}
