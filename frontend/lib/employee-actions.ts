"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { calculatePayroll, PayrollApiError } from "./api";
import { authorize } from "./auth/authorize";
import { prisma } from "./db";
import { getT } from "./i18n/server";
import { parseEmployeeForm, type FieldErrors } from "./employee-schema";
import { currentRun } from "./payroll-service";
import { toPayInput } from "./payslip";
import type { PayrollResult } from "./types";

export type EmployeeFormState =
  | { status: "idle" }
  | { status: "error"; message: string; errors?: FieldErrors }
  | { status: "saved"; message: string };

const PAY_FIELDS = [
  "baseSalary",
  "bonuses",
  "housingAllowance",
  "transportAllowance",
  "functionAllowance",
  "otherAllowance",
  "dependents",
  "isExecutive",
] as const;

function revalidate() {
  revalidatePath("/");
  revalidatePath("/employees");
}

/** Next free EMP-### code for the company. */
async function nextCode(companyId: string): Promise<string> {
  const codes = await prisma.employee.findMany({ where: { companyId }, select: { code: true } });
  const max = codes.reduce((m, { code }) => Math.max(m, Number(code.replace(/\D/g, "")) || 0), 0);
  return `EMP-${String(max + 1).padStart(3, "0")}`;
}

export async function saveEmployee(
  employeeId: string | null,
  _prev: EmployeeFormState,
  form: FormData,
): Promise<EmployeeFormState> {
  const auth = await authorize("employees.manage");
  if (!auth.ok) return { status: "error", message: auth.message };
  const { company } = auth;
  const t = getT();

  const parsed = parseEmployeeForm(form, t);
  if (!parsed.ok) return { status: "error", message: t.server.fixFields, errors: parsed.errors };

  if (!employeeId) {
    const code = await nextCode(company.id);
    await prisma.employee.create({ data: { ...parsed.data, code, companyId: company.id } });
    revalidate();
    return { status: "saved", message: t.server.employeeAdded(parsed.data.fullName, code) };
  }

  const existing = await prisma.employee.findFirst({ where: { id: employeeId, companyId: company.id } });
  if (!existing) return { status: "error", message: t.server.employeeNotFound };

  const payChanged = PAY_FIELDS.some((f) => existing[f] !== parsed.data[f]);
  const run = payChanged ? (await currentRun())?.run : null;

  await prisma.$transaction([
    prisma.employee.update({ where: { id: employeeId }, data: parsed.data }),
    // A calculated (unpaid) payslip no longer matches the new pay elements: send it back to draft.
    ...(run
      ? [
          prisma.payslip.updateMany({
            where: { runId: run.id, employeeId, status: "CALCULATED" },
            data: {
              status: "DRAFT",
              grossSalary: null, cnssEmployee: null, iuts: null, fsp: null, totalDeductions: null,
              netSalary: null, cnssEmployer: null, tpa: null, totalEmployerCost: null,
              engineResult: Prisma.DbNull, snapshot: Prisma.DbNull, calculatedAt: null,
            },
          }),
        ]
      : []),
  ]);
  revalidate();
  return {
    status: "saved",
    message: payChanged ? t.server.employeeUpdatedRerun(parsed.data.fullName) : t.server.employeeUpdated(parsed.data.fullName),
  };
}

export async function setEmployeeActive(employeeId: string, active: boolean): Promise<{ ok: boolean; message: string }> {
  const auth = await authorize("employees.manage");
  if (!auth.ok) return auth;
  const { company } = auth;
  await prisma.$transaction([
    prisma.employee.updateMany({ where: { id: employeeId, companyId: company.id }, data: { active } }),
    // Drafts carry no figures; dropping them keeps a departed employee from blocking the month.
    ...(active
      ? []
      : [prisma.payslip.deleteMany({ where: { employeeId, status: "DRAFT", employee: { companyId: company.id } } })]),
  ]);
  revalidatePath("/runs");
  revalidate();
  const t = getT();
  return { ok: true, message: active ? t.server.employeeReactivated : t.server.employeeDeactivated };
}

export type PreviewState =
  | { status: "idle" }
  | { status: "error"; message: string; errors?: FieldErrors }
  | { status: "ok"; result: PayrollResult };

/** Run the form's current values through the compliance engine without saving anything. */
export async function previewPayslip(form: FormData): Promise<PreviewState> {
  const t = getT();
  const parsed = parseEmployeeForm(form, t);
  if (!parsed.ok) return { status: "error", message: t.server.fixFieldsPreview, errors: parsed.errors };
  try {
    const result = await calculatePayroll(toPayInput({ ...parsed.data, code: "PREVIEW" }));
    return { status: "ok", result };
  } catch (err) {
    return { status: "error", message: err instanceof PayrollApiError ? err.message : t.server.previewFailed };
  }
}
