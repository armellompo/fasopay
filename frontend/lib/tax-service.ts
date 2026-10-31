import "server-only";

import type { TaxAuthority } from "@prisma/client";

import { prisma } from "./db";
import { currentCompany, filingDeadline } from "./payroll-service";
import type { PayrollResult } from "./types";

/** One employee's line on the état nominatif. */
export interface TaxLine {
  code: string;
  name: string;
  gross: number;
  cnssBase: number;
  cnssEmployee: number;
  cnssEmployer: number;
  iuts: number;
  tpa: number;
  fsp: number;
}

export interface Remittance {
  authority: TaxAuthority;
  amount: number;
  /** ISO date. */
  deadline: string;
  filing: { amount: number; reference: string | null; filedAt: string } | null;
}

export interface TaxDeclaration {
  companyName: string;
  ifu: string | null;
  cnssEmployerNumber: string | null;
  periods: string[];
  period: string;
  /** Earliest remittance deadline, ISO date. */
  deadline: string;
  lines: TaxLine[];
  totals: Omit<TaxLine, "code" | "name">;
  remittances: Remittance[];
  /** Active employees whose payslip for the period is not calculated yet. */
  pending: string[];
}

const ZERO_TOTALS = { gross: 0, cnssBase: 0, cnssEmployee: 0, cnssEmployer: 0, iuts: 0, tpa: 0, fsp: 0 };

export async function getTaxDeclaration(requested?: string): Promise<TaxDeclaration | null> {
  const company = await currentCompany();
  if (!company) return null;

  const runs = await prisma.payrollRun.findMany({
    where: { companyId: company.id },
    orderBy: { period: "desc" },
    select: { id: true, period: true },
  });
  const run = runs.find((r) => r.period === requested) ?? runs[0];
  if (!run) return null;

  const [payslips, filings, unpaidDrafts] = await Promise.all([
    // Only calculated or paid payslips carry figures that can be declared.
    prisma.payslip.findMany({
      where: { runId: run.id, status: { in: ["CALCULATED", "PAID"] } },
      include: { employee: { select: { code: true, fullName: true } } },
      orderBy: { employee: { code: "asc" } },
    }),
    prisma.taxFiling.findMany({ where: { runId: run.id } }),
    prisma.employee.findMany({
      where: {
        companyId: company.id,
        active: true,
        NOT: { payslips: { some: { runId: run.id, status: { in: ["CALCULATED", "PAID"] } } } },
      },
      select: { fullName: true },
    }),
  ]);

  const lines: TaxLine[] = payslips.map((p) => {
    const engine = p.engineResult as unknown as PayrollResult | null;
    return {
      code: p.employee.code,
      name: p.employee.fullName,
      gross: p.grossSalary ?? 0,
      cnssBase: engine?.cnss_base ?? 0,
      cnssEmployee: p.cnssEmployee ?? 0,
      cnssEmployer: p.cnssEmployer ?? 0,
      iuts: p.iuts ?? 0,
      tpa: p.tpa ?? 0,
      fsp: p.fsp ?? 0,
    };
  });

  const totals = lines.reduce(
    (t, l) => ({
      gross: t.gross + l.gross,
      cnssBase: t.cnssBase + l.cnssBase,
      cnssEmployee: t.cnssEmployee + l.cnssEmployee,
      cnssEmployer: t.cnssEmployer + l.cnssEmployer,
      iuts: t.iuts + l.iuts,
      tpa: t.tpa + l.tpa,
      fsp: t.fsp + l.fsp,
    }),
    ZERO_TOTALS,
  );

  const due: Record<TaxAuthority, number> = {
    DGI: totals.iuts + totals.tpa,
    CNSS: totals.cnssEmployee + totals.cnssEmployer,
    FSP: totals.fsp,
  };
  const remittances: Remittance[] = (Object.keys(due) as TaxAuthority[]).map((authority) => {
    const f = filings.find((x) => x.authority === authority);
    return {
      authority,
      amount: due[authority],
      deadline: filingDeadline(run.period, authority),
      filing: f ? { amount: f.amount, reference: f.reference, filedAt: f.filedAt.toISOString() } : null,
    };
  });

  return {
    companyName: company.name,
    ifu: company.ifu,
    cnssEmployerNumber: company.cnssEmployerNumber,
    periods: runs.map((r) => r.period),
    period: run.period,
    deadline: filingDeadline(run.period),
    lines,
    totals,
    remittances,
    pending: unpaidDrafts.map((e) => e.fullName),
  };
}
