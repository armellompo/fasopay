import { z } from "zod";

import { BF_PHONE, normalizePhone } from "./employee-schema";
import type { Dict } from "./i18n/dictionaries";

/** Empty input → null; otherwise trimmed. */
const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)
    .nullable()
    .optional()
    .transform((v) => v ?? null);

/** Built per request so error messages come out in the user's language. */
export function companySchema(t: Dict) {
  const v = t.server.validation;
  // Identifier formats vary across registries, so only shape is checked here (letters, digits, spaces, / . -).
  const identifier = (label: string) =>
    optional(40).refine((x) => x === null || /^[A-Z0-9][A-Z0-9 ./-]*$/i.test(x), v.unexpectedChars(label));

  return z.object({
    name: z.string().trim().min(2, v.companyName).max(120),
    city: z.string().trim().min(2, v.city).max(60),
    legalForm: optional(20),
    ifu: identifier("IFU").transform((x) => x?.toUpperCase().replace(/\s+/g, "") ?? null),
    rccm: identifier("RCCM").transform((x) => x?.toUpperCase() ?? null),
    cnssEmployerNumber: identifier(t.settings.company.cnss),
    address: optional(200),
    phone: optional(30)
      .transform((x) => (x ? normalizePhone(x) : null))
      .refine((x) => x === null || BF_PHONE.test(x), v.phoneFormat),
    email: optional(120).refine((x) => x === null || z.string().email().safeParse(x).success, v.email),
  });
}

export type CompanyFormValues = z.infer<ReturnType<typeof companySchema>>;
export type CompanyFieldErrors = Partial<Record<keyof CompanyFormValues, string>>;

export function parseCompanyForm(form: FormData, t: Dict):
  | { ok: true; data: CompanyFormValues }
  | { ok: false; errors: CompanyFieldErrors } {
  const parsed = companySchema(t).safeParse(Object.fromEntries(form));
  if (parsed.success) return { ok: true, data: parsed.data };
  const errors: CompanyFieldErrors = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0] as keyof CompanyFormValues;
    errors[key] ??= issue.message;
  }
  return { ok: false, errors };
}
