"use server";

import { revalidatePath } from "next/cache";

import { authorize } from "./auth/authorize";
import { parseCompanyForm, type CompanyFieldErrors } from "./company-schema";
import { prisma } from "./db";
import { getT } from "./i18n/server";

export type CompanyFormState =
  | { status: "idle" }
  | { status: "error"; message: string; errors?: CompanyFieldErrors }
  | { status: "saved"; message: string; at: number };

export async function saveCompany(_prev: CompanyFormState, form: FormData): Promise<CompanyFormState> {
  const auth = await authorize("settings.manage");
  if (!auth.ok) return { status: "error", message: auth.message };

  const t = getT();
  const parsed = parseCompanyForm(form, t);
  if (!parsed.ok) return { status: "error", message: t.server.fixFields, errors: parsed.errors };

  await prisma.company.update({ where: { id: auth.company.id }, data: parsed.data });
  // The company name and city appear in the shared header on every page.
  revalidatePath("/", "layout");
  return { status: "saved", message: t.server.companySaved, at: Date.now() };
}
