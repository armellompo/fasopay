import "server-only";

import type { TaxAuthority } from "@prisma/client";

import { calculatePayroll } from "./api";
import { getAuth } from "./auth/context";
import { prisma } from "./db";
import { payslipFields, toPayInput, toRow } from "./payslip";
import type { DashboardData } from "./types";

/**
 * The signed-in user's active company, or null when signed out. Every page, action and service
 * scopes its queries through this, so a user only ever reaches companies they are a member of.
 */
export async function currentCompany() {
  const auth = await getAuth();
  if (!auth?.activeCompanyId) return null;
  return prisma.company.findUnique({ where: { id: auth.activeCompanyId } });
}

/** The given period's run, or the latest one when no period is passed. */
export async function currentRun(period?: string) {
  const company = await currentCompany();
  if (!company) return null;
  const run = await prisma.payrollRun.findFirst({
    where: { companyId: company.id, ...(period ? { period } : {}) },
    orderBy: { period: "desc" },
  });
  return { company, run };
}

/**
 * Day of the following month each remittance is due. IUTS and TPA: within the first 10 days (CGI art. 116
 * and 230); FSP goes to the DGI on the IUTS deadline. CNSS: set by decree, not yet confirmed, kept at the 15th.
 */
export const FILING_DAY: Record<TaxAuthority, number> = { DGI: 10, FSP: 10, CNSS: 15 };

export function filingDeadline(period: string, authority: TaxAuthority = "DGI"): string {
  const [y, m] = period.split("-").map(Number);
  return new Date(Date.UTC(y, m, FILING_DAY[authority])).toISOString().slice(0, 10); // month index m = following month
}

export async function getDashboard(): Promise<DashboardData | null> {
  const current = await currentRun();
  if (!current?.run) return null;
  const { company, run } = current;

  const employees = await prisma.employee.findMany({
    where: { companyId: company.id, active: true },
    include: { payslips: { where: { runId: run.id } } },
    orderBy: { code: "asc" },
  });

  const totalMonthlyOutlay = employees.reduce((sum, e) => sum + (e.payslips[0]?.totalEmployerCost ?? 0), 0);

  return {
    company: { name: company.name, city: company.city, activeEmployees: employees.length },
    period: run.period,
    rows: employees.map((e) => toRow(e, e.payslips[0])),
    totalMonthlyOutlay,
    nextDeadline: filingDeadline(run.period),
  };
}

/**
 * Recompute every unpaid payslip of the current run through the compliance engine
 * and persist the results. All engine calls must succeed before anything is written,
 * then the writes happen in one transaction, so a run is never half-saved.
 */
export async function runPayroll(period?: string): Promise<number> {
  const current = await currentRun(period);
  if (!current?.run) throw new Error("No payroll run to calculate");
  const { company, run } = current;

  const employees = await prisma.employee.findMany({
    where: { companyId: company.id, active: true },
    include: { payslips: { where: { runId: run.id } } },
  });
  const unpaid = employees.filter((e) => e.payslips[0]?.status !== "PAID");

  const results = await Promise.all(unpaid.map((e) => calculatePayroll(toPayInput(e))));

  await prisma.$transaction(
    unpaid.map((e, i) => {
      const fields = { ...payslipFields(results[i], e), status: "CALCULATED" as const };
      return prisma.payslip.upsert({
        where: { runId_employeeId: { runId: run.id, employeeId: e.id } },
        create: { runId: run.id, employeeId: e.id, ...fields },
        update: fields,
      });
    }),
  );
  return unpaid.length;
}
