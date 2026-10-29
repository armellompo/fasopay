"use server";

import { revalidatePath } from "next/cache";

import { PayrollApiError } from "./api";
import { authorize } from "./auth/authorize";
import { prisma } from "./db";
import { getT } from "./i18n/server";
import { runPayroll } from "./payroll-service";
import { listRuns } from "./runs-service";

export type ActionResult = { ok: boolean; message: string };

function revalidate(period?: string) {
  revalidatePath("/");
  revalidatePath("/runs");
  revalidatePath("/tax");
  if (period) revalidatePath(`/runs/${period}`);
}

/** Open the month after the latest run, with a draft payslip for every active employee. */
export async function openNextRun(): Promise<ActionResult> {
  const auth = await authorize("runs.open");
  if (!auth.ok) return auth;
  const { company } = auth;

  const { next, blockedBy } = await listRuns();
  if (blockedBy > 0) {
    return { ok: false, message: getT().server.runBlocked(blockedBy) };
  }

  const employees = await prisma.employee.findMany({ where: { companyId: company.id, active: true }, select: { id: true } });
  await prisma.payrollRun.create({
    data: {
      companyId: company.id,
      period: next,
      payslips: { create: employees.map((e) => ({ employeeId: e.id, status: "DRAFT" as const })) },
    },
  });
  revalidate(next);
  return { ok: true, message: getT().server.runOpened(next, employees.length) };
}

export async function calculateRun(period: string): Promise<ActionResult> {
  const auth = await authorize("payroll.calculate");
  if (!auth.ok) return auth;
  try {
    const n = await runPayroll(period);
    revalidate(period);
    const t = getT();
    return { ok: true, message: n === 0 ? t.server.allPaid : t.server.calculated(n) };
  } catch (err) {
    return { ok: false, message: err instanceof PayrollApiError ? err.message : getT().server.calcFailed };
  }
}

/** Record that calculated payslips were paid out. Paid payslips are final and are never recalculated. */
export async function markPaid(period: string, employeeIds: string[]): Promise<ActionResult> {
  const auth = await authorize("runs.markPaid");
  if (!auth.ok) return auth;
  const { company } = auth;
  const t = getT();
  if (employeeIds.length === 0) return { ok: false, message: t.server.nothingSelected };
  const run = await prisma.payrollRun.findUnique({ where: { companyId_period: { companyId: company.id, period } } });
  if (!run) return { ok: false, message: t.server.periodNotFound };

  const { count } = await prisma.payslip.updateMany({
    where: { runId: run.id, employeeId: { in: employeeIds }, status: "CALCULATED" },
    data: { status: "PAID", paidAt: new Date() },
  });
  revalidate(period);
  return count === 0
    ? { ok: false, message: t.server.noneAwaiting }
    : { ok: true, message: t.server.markedPaid(count) };
}
