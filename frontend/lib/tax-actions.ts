"use server";

import type { TaxAuthority } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { authorize } from "./auth/authorize";
import { prisma } from "./db";
import { getT } from "./i18n/server";
import { getTaxDeclaration } from "./tax-service";

export type FilingResult = { ok: true; message: string } | { ok: false; message: string };

const AUTHORITIES: TaxAuthority[] = ["DGI", "CNSS", "FSP"];

function runFor(companyId: string, period: string) {
  return prisma.payrollRun.findUnique({ where: { companyId_period: { companyId, period } } });
}

/** Record that a remittance was declared and paid. The amount is recomputed here, never taken from the client. */
export async function markFiled(period: string, authority: TaxAuthority, reference: string): Promise<FilingResult> {
  const auth = await authorize("tax.file");
  if (!auth.ok) return auth;
  const t = getT();
  if (!AUTHORITIES.includes(authority)) return { ok: false, message: t.server.unknownAuthority };
  const ref = reference.trim().slice(0, 64) || null;

  const [run, declaration] = await Promise.all([runFor(auth.company.id, period), getTaxDeclaration(period)]);
  if (!run || !declaration || declaration.period !== period) return { ok: false, message: t.server.periodNotFound };
  if (declaration.pending.length > 0) {
    return {
      ok: false,
      message: t.server.fileIncomplete(declaration.pending.join(", ")),
    };
  }
  const amount = declaration.remittances.find((r) => r.authority === authority)!.amount;

  await prisma.taxFiling.upsert({
    where: { runId_authority: { runId: run.id, authority } },
    create: { runId: run.id, authority, amount, reference: ref },
    update: { amount, reference: ref, filedAt: new Date() },
  });
  revalidatePath("/tax");
  return { ok: true, message: t.server.filed(authority, period) };
}

export async function undoFiling(period: string, authority: TaxAuthority): Promise<FilingResult> {
  const auth = await authorize("tax.file");
  if (!auth.ok) return auth;
  const t = getT();
  const run = await runFor(auth.company.id, period);
  if (!run) return { ok: false, message: t.server.periodNotFound };
  await prisma.taxFiling.deleteMany({ where: { runId: run.id, authority } });
  revalidatePath("/tax");
  return { ok: true, message: t.server.reopened(authority, period) };
}
