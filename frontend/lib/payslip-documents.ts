import "server-only";

import type { Company, Employee, Payslip } from "@prisma/client";

import { prisma } from "./db";
import { periodLabel } from "./format";
import { currentCompany } from "./payroll-service";
import { snapshotOf, type PayslipSnapshot } from "./payslip";
import type { PayrollResult } from "./types";

const METHOD_FR: Record<PayslipSnapshot["paymentMethod"], string> = {
  ORANGE_MONEY: "Orange Money",
  MOOV_MONEY: "Moov Money",
  WAVE: "Wave",
  BANK_TRANSFER: "Virement bancaire",
};

/** Everything one printed bulletin de paie needs, already resolved. */
export interface PayslipDocData {
  company: Pick<Company, "name" | "legalForm" | "address" | "city" | "phone" | "ifu" | "rccm" | "cnssEmployerNumber">;
  period: string;
  periodLabel: string;
  status: "CALCULATED" | "PAID";
  paidAt: string | null;
  employee: {
    code: string;
    fullName: string;
    role: string;
    department: string;
    cnssNumber: string | null;
    dependents: number;
    isExecutive: boolean;
    paymentMethod: string;
    mobileMoneyNumber: string | null;
  };
  earnings: { label: string; amount: number }[];
  gross: number;
  cnss: { base: number; rate: number; amount: number };
  iuts: PayrollResult["iuts_detail"] & { abatementRate: number };
  fsp: { base: number; rate: number; amount: number };
  totalDeductions: number;
  net: number;
  employer: { cnss: number; cnssRate: number; tpa: number; tpaRate: number; total: number; totalCost: number };
}

export type PayslipDocResult = { ok: true; slips: PayslipDocData[]; period: string } | { ok: false; status: 401 | 404; message: string };

/** Rate actually applied, derived from the stored figures so old slips stay self-consistent. */
const rateOf = (amount: number, base: number) => (base > 0 ? Math.round((amount / base) * 1000) / 10 : 0);

function earningsOf(s: Pick<PayslipSnapshot, "baseSalary" | "bonuses" | "housingAllowance" | "transportAllowance" | "functionAllowance" | "otherAllowance">) {
  return [
    { label: "Salaire de base", amount: s.baseSalary },
    { label: "Primes et gratifications", amount: s.bonuses },
    { label: "Indemnité de logement", amount: s.housingAllowance },
    { label: "Indemnité de transport", amount: s.transportAllowance },
    { label: "Indemnité de fonction", amount: s.functionAllowance },
    { label: "Autres indemnités", amount: s.otherAllowance },
  ].filter((e) => e.amount > 0);
}

function toDoc(company: Company, period: string, slip: Payslip & { employee: Employee }): PayslipDocData | null {
  const r = slip.engineResult as unknown as PayrollResult | null;
  if (!r || (slip.status !== "CALCULATED" && slip.status !== "PAID")) return null;

  const frozen = slip.snapshot as unknown as PayslipSnapshot | null;
  const current = snapshotOf(slip.employee);
  // A paid slip is a legal record: reprint it exactly as issued. Unpaid ones show current identity details.
  const identity = slip.status === "PAID" && frozen ? frozen : current;
  // Pay lines must add up to the stored gross. Prefer the snapshot; fall back to the current record only
  // if it still matches, else print a single gross line rather than a breakdown that doesn't add up.
  const pay = frozen ?? current;
  let earnings = earningsOf(pay);
  if (earnings.reduce((s, e) => s + e.amount, 0) !== r.gross_salary) earnings = [{ label: "Salaire brut", amount: r.gross_salary }];

  const fspBase = r.gross_salary - r.employee_deductions.cnss - r.employee_deductions.iuts;
  return {
    company,
    period,
    periodLabel: periodLabel(period),
    status: slip.status,
    paidAt: slip.paidAt?.toISOString() ?? null,
    employee: {
      code: identity.code,
      fullName: identity.fullName,
      role: identity.role,
      department: identity.department,
      cnssNumber: identity.cnssNumber,
      dependents: pay.dependents,
      isExecutive: pay.isExecutive,
      paymentMethod: METHOD_FR[identity.paymentMethod],
      mobileMoneyNumber: identity.mobileMoneyNumber,
    },
    earnings,
    gross: r.gross_salary,
    cnss: { base: r.cnss_base, rate: rateOf(r.employee_deductions.cnss, r.cnss_base), amount: r.employee_deductions.cnss },
    iuts: { ...r.iuts_detail, abatementRate: rateOf(r.iuts_detail.professional_abatement, pay.baseSalary) },
    fsp: { base: fspBase, rate: rateOf(r.employee_deductions.fsp, fspBase), amount: r.employee_deductions.fsp },
    totalDeductions: r.employee_deductions.total,
    net: r.net_salary,
    employer: {
      cnss: r.employer_liabilities.cnss,
      cnssRate: rateOf(r.employer_liabilities.cnss, r.cnss_base),
      tpa: r.employer_liabilities.tpa,
      tpaRate: rateOf(r.employer_liabilities.tpa, r.gross_salary),
      total: r.employer_liabilities.total,
      totalCost: r.total_employer_cost,
    },
  };
}

/** Pay slips of the signed-in user's active company for a period: all calculated/paid ones, or the given employees. */
export async function loadPayslipDocs(period: string, employeeIds?: string[]): Promise<PayslipDocResult> {
  const company = await currentCompany();
  if (!company) return { ok: false, status: 401, message: "Not signed in" };
  if (!/^\d{4}-\d{2}$/.test(period)) return { ok: false, status: 404, message: "Unknown period" };

  const run = await prisma.payrollRun.findUnique({ where: { companyId_period: { companyId: company.id, period } } });
  if (!run) return { ok: false, status: 404, message: "Payroll period not found" };

  const payslips = await prisma.payslip.findMany({
    where: {
      runId: run.id,
      status: { in: ["CALCULATED", "PAID"] },
      ...(employeeIds?.length ? { employeeId: { in: employeeIds } } : {}),
    },
    include: { employee: true },
    orderBy: { employee: { code: "asc" } },
  });
  const slips = payslips.map((p) => toDoc(company, period, p)).filter((d): d is PayslipDocData => d !== null);
  if (slips.length === 0) return { ok: false, status: 404, message: "No calculated pay slips for this selection" };
  return { ok: true, slips, period };
}
