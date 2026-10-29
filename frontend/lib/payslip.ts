import type { Employee, PaymentMethod as DbPaymentMethod, Payslip, PayslipStatus, Prisma } from "@prisma/client";

import type { EmployeePayRow, PayInput, PaymentMethod, PayrollResult, PayStatus } from "./types";

const METHOD_LABEL: Record<DbPaymentMethod, PaymentMethod> = {
  ORANGE_MONEY: "Orange Money",
  MOOV_MONEY: "Moov Money",
  WAVE: "Wave",
  BANK_TRANSFER: "Bank Transfer",
};

const STATUS_LABEL: Record<PayslipStatus, PayStatus> = {
  DRAFT: "Draft",
  CALCULATED: "Calculated",
  PAID: "Paid",
};

type PayElements = Pick<
  Employee,
  | "code"
  | "baseSalary"
  | "bonuses"
  | "housingAllowance"
  | "transportAllowance"
  | "functionAllowance"
  | "otherAllowance"
  | "dependents"
  | "isExecutive"
>;

/** Employee row → compliance engine request body. */
export function toPayInput(e: PayElements): PayInput {
  return {
    employee_id: e.code,
    base_salary: e.baseSalary,
    bonuses: e.bonuses,
    allowances: {
      housing: e.housingAllowance,
      transport: e.transportAllowance,
      function: e.functionAllowance,
      other: e.otherAllowance,
    },
    dependents: e.dependents,
    is_executive: e.isExecutive,
  };
}

/** What a pay slip prints besides the engine figures, frozen when the payslip is calculated. */
export interface PayslipSnapshot {
  code: string;
  fullName: string;
  role: string;
  department: string;
  cnssNumber: string | null;
  baseSalary: number;
  bonuses: number;
  housingAllowance: number;
  transportAllowance: number;
  functionAllowance: number;
  otherAllowance: number;
  dependents: number;
  isExecutive: boolean;
  paymentMethod: DbPaymentMethod;
  mobileMoneyNumber: string | null;
}

export function snapshotOf(e: Employee): PayslipSnapshot {
  return {
    code: e.code,
    fullName: e.fullName,
    role: e.role,
    department: e.department,
    cnssNumber: e.cnssNumber,
    baseSalary: e.baseSalary,
    bonuses: e.bonuses,
    housingAllowance: e.housingAllowance,
    transportAllowance: e.transportAllowance,
    functionAllowance: e.functionAllowance,
    otherAllowance: e.otherAllowance,
    dependents: e.dependents,
    isExecutive: e.isExecutive,
    paymentMethod: e.paymentMethod,
    mobileMoneyNumber: e.mobileMoneyNumber,
  };
}

/** Compliance engine response + the employee it was computed for → Payslip columns (status left to the caller). */
export function payslipFields(res: PayrollResult, employee: Employee) {
  return {
    snapshot: snapshotOf(employee) as unknown as Prisma.InputJsonValue,
    grossSalary: res.gross_salary,
    cnssEmployee: res.employee_deductions.cnss,
    iuts: res.employee_deductions.iuts,
    fsp: res.employee_deductions.fsp,
    totalDeductions: res.employee_deductions.total,
    netSalary: res.net_salary,
    cnssEmployer: res.employer_liabilities.cnss,
    tpa: res.employer_liabilities.tpa,
    totalEmployerCost: res.total_employer_cost,
    engineResult: res as unknown as Prisma.InputJsonValue,
    calculatedAt: new Date(),
  } satisfies Partial<Prisma.PayslipUncheckedCreateInput>;
}

/** Employee + its payslip for the period → dashboard table row. */
export function toRow(e: Employee, slip: Payslip | undefined): EmployeePayRow {
  const gross = slip?.grossSalary ?? toGross(e);
  return {
    id: e.id,
    code: e.code,
    name: e.fullName,
    role: e.role,
    department: e.department,
    grossSalary: gross,
    netPayout: slip?.netSalary ?? 0,
    employeeDeductions: slip?.totalDeductions ?? 0,
    employerCharges: slip?.totalEmployerCost != null ? slip.totalEmployerCost - gross : 0,
    paymentMethod: METHOD_LABEL[e.paymentMethod],
    mobileMoneyNumber: e.mobileMoneyNumber,
    status: STATUS_LABEL[slip?.status ?? "DRAFT"],
    paidAt: slip?.paidAt?.toISOString() ?? null,
  };
}

function toGross(e: PayElements): number {
  return (
    e.baseSalary + e.bonuses + e.housingAllowance + e.transportAllowance + e.functionAllowance + e.otherAllowance
  );
}
