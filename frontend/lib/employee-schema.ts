import { z } from "zod";

import type { Dict } from "./i18n/dictionaries";

export const PAYMENT_METHODS = ["ORANGE_MONEY", "MOOV_MONEY", "WAVE", "BANK_TRANSFER"] as const;

type Validation = Dict["server"]["validation"];

// Form fields arrive as strings; accept "250 000" or "250,000" and store whole francs.
const fcfa = (v: Validation, label: string, { min = 0, max = 100_000_000 } = {}) =>
  z.preprocess(
    (x) => (typeof x === "string" ? x.replace(/[\s  ,]/g, "") || "0" : x),
    z.coerce
      .number({ invalid_type_error: v.notNumber(label) })
      .int(v.wholeFcfa(label))
      .min(min, min > 0 ? v.required(label) : v.negative(label))
      .max(max, v.tooLarge(label)),
  );

/** Burkina numbers: +226 then 8 digits. Spaces and the 00226 prefix are tolerated. */
export const BF_PHONE = /^\+226\d{8}$/;
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[\s.-]/g, "").replace(/^00226/, "+226");
  return /^\d{8}$/.test(digits) ? `+226${digits}` : digits;
}

/** Built per request so error messages come out in the user's language. */
export function employeeSchema(t: Dict) {
  const v = t.server.validation;
  const label = t.employees.form.amounts;
  return z
    .object({
      fullName: z.string().trim().min(2, v.fullName).max(100),
      role: z.string().trim().min(2, v.jobTitle).max(100),
      department: z.string().trim().min(2, v.department).max(60),
      baseSalary: fcfa(v, label.baseSalary, { min: 1 }),
      bonuses: fcfa(v, label.bonuses),
      housingAllowance: fcfa(v, label.housingAllowance),
      transportAllowance: fcfa(v, label.transportAllowance),
      functionAllowance: fcfa(v, label.functionAllowance),
      otherAllowance: fcfa(v, label.otherAllowance),
      dependents: z.coerce.number().int().min(0, v.dependentsNegative).max(20, v.dependentsMax),
      isExecutive: z.preprocess((x) => x === "on" || x === "true" || x === true, z.boolean()),
      paymentMethod: z.enum(PAYMENT_METHODS, { errorMap: () => ({ message: v.paymentMethod }) }),
      cnssNumber: z
        .string()
        .trim()
        .max(30)
        .regex(/^[0-9A-Z ./-]*$/i, v.alnum)
        .transform((x) => x.toUpperCase() || null)
        .nullable()
        .optional()
        .transform((x) => x ?? null),
      mobileMoneyNumber: z
        .string()
        .trim()
        .transform((x) => (x ? normalizePhone(x) : null))
        .nullable()
        .optional(),
    })
    .superRefine((e, ctx) => {
      if (e.paymentMethod === "BANK_TRANSFER") return;
      if (!e.mobileMoneyNumber) {
        ctx.addIssue({ code: "custom", path: ["mobileMoneyNumber"], message: v.mobileRequired });
      } else if (!BF_PHONE.test(e.mobileMoneyNumber)) {
        ctx.addIssue({ code: "custom", path: ["mobileMoneyNumber"], message: v.mobileFormat });
      }
    })
    .transform((e) => ({ ...e, mobileMoneyNumber: e.paymentMethod === "BANK_TRANSFER" ? null : e.mobileMoneyNumber ?? null }));
}

export type EmployeeFormValues = z.infer<ReturnType<typeof employeeSchema>>;
export type FieldErrors = Partial<Record<keyof EmployeeFormValues, string>>;

export function parseEmployeeForm(form: FormData, t: Dict):
  | { ok: true; data: EmployeeFormValues }
  | { ok: false; errors: FieldErrors } {
  const parsed = employeeSchema(t).safeParse(Object.fromEntries(form));
  if (parsed.success) return { ok: true, data: parsed.data };
  const errors: FieldErrors = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0] as keyof EmployeeFormValues;
    errors[key] ??= issue.message;
  }
  return { ok: false, errors };
}
