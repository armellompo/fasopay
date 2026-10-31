export type PaymentMethod = "Orange Money" | "Moov Money" | "Wave" | "Bank Transfer";

export type PayStatus = "Draft" | "Calculated" | "Paid";

/** Request body for POST /api/v1/payroll/calculate (mirrors backend PayrollInput). */
export interface PayInput {
  employee_id: string;
  base_salary: number;
  bonuses?: number;
  allowances?: { housing?: number; transport?: number; function?: number; other?: number };
  dependents?: number;
  is_executive?: boolean;
}

/** Response of POST /api/v1/payroll/calculate (mirrors backend PayrollResult). */
export interface PayrollResult {
  employee_id: string;
  gross_salary: number;
  cnss_base: number;
  employee_deductions: { cnss: number; iuts: number; fsp: number; total: number };
  iuts_detail: {
    exempt_allowances: number;
    /** Employee CNSS deducted from the IUTS base (capped at 8% of base salary). Absent on payslips calculated before it existed. */
    pension_deduction?: number;
    professional_abatement: number;
    taxable_base: number;
    gross_tax: number;
    family_reduction: number;
    net_tax: number;
  };
  net_salary: number;
  employer_liabilities: { cnss: number; tpa: number; total: number };
  total_employer_cost: number;
}

export interface EmployeePayRow {
  id: string;
  code: string;
  name: string;
  role: string;
  department: string;
  grossSalary: number;
  netPayout: number;
  employeeDeductions: number;
  employerCharges: number;
  paymentMethod: PaymentMethod;
  mobileMoneyNumber: string | null;
  status: PayStatus;
  /** ISO date, set once the payslip is paid. */
  paidAt: string | null;
}

export interface Company {
  name: string;
  city: string;
  activeEmployees: number;
}

export interface DashboardData {
  company: Company;
  /** "YYYY-MM" */
  period: string;
  rows: EmployeePayRow[];
  /** Gross + employer CNSS + TPA across calculated and paid payslips. */
  totalMonthlyOutlay: number;
  /** Earliest filing deadline for the period (IUTS, TPA and FSP: the 10th of the next month), ISO date. */
  nextDeadline: string;
}

export interface RunPayrollResponse {
  calculated: number;
  data: DashboardData;
}

/** Response of GET /api/v1/rates. Rates are decimal strings, e.g. "0.055". */
export interface StatutoryRates {
  cnss_ceiling: number;
  cnss_employee_rate: string;
  cnss_employer_rate: string;
  tpa_rate: string;
  fsp_rate: string;
  iuts_abatement_executive: string;
  iuts_abatement_non_executive: string;
  iuts_brackets: { up_to: number | null; rate: string }[];
  iuts_family_reduction: Record<string, string>;
}
