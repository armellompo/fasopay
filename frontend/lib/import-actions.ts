"use server";

import { revalidatePath } from "next/cache";

import { authorize } from "./auth/authorize";
import { prisma } from "./db";
import { codeAllocator } from "./employee-codes";
import { getT } from "./i18n/server";
import { analyzeUpload, type AnalyzedRow } from "./import/analyze";

export type ImportRowView = Omit<AnalyzedRow, "data">;

export type ImportPreviewState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "preview"; fileName: string; rows: ImportRowView[]; valid: number; invalid: number; ignored: string[]; defaulted: string[] };

export type ImportCommitResult = { ok: true; imported: number; skipped: number } | { ok: false; message: string };

/** Check an uploaded file and show what would be imported. Nothing is saved. */
export async function previewImport(_prev: ImportPreviewState, form: FormData): Promise<ImportPreviewState> {
  const auth = await authorize("employees.manage");
  if (!auth.ok) return { status: "error", message: auth.message };

  const analysis = await analyzeUpload(form.get("file"), auth.company.id, getT());
  if (!analysis.ok) return { status: "error", message: analysis.message };

  const valid = analysis.rows.filter((r) => r.data).length;
  return {
    status: "preview",
    fileName: analysis.fileName,
    rows: analysis.rows.map(({ data: _data, ...view }) => view),
    valid,
    invalid: analysis.rows.length - valid,
    ignored: analysis.ignored,
    defaulted: analysis.defaulted,
  };
}

/**
 * Import the valid rows. The file is analysed again here rather than trusting anything the browser sends
 * back from the preview, and all rows are created in one statement: either every valid row lands or none.
 */
export async function commitImport(form: FormData): Promise<ImportCommitResult> {
  const auth = await authorize("employees.manage");
  if (!auth.ok) return auth;
  const t = getT();

  const analysis = await analyzeUpload(form.get("file"), auth.company.id, t);
  if (!analysis.ok) return { ok: false, message: analysis.message };

  const valid = analysis.rows.flatMap((r) => (r.data ? [r.data] : []));
  if (valid.length === 0) return { ok: false, message: t.import.nothingToImport };

  const next = await codeAllocator(auth.company.id);
  await prisma.employee.createMany({
    data: valid.map((d) => ({ ...d, code: next(), companyId: auth.company.id })),
  });

  revalidatePath("/");
  revalidatePath("/employees");
  revalidatePath("/runs");
  return { ok: true, imported: valid.length, skipped: analysis.rows.length - valid.length };
}
