import "server-only";

import { prisma } from "../db";
import { employeeSchema, normalizePhone, PAYMENT_METHODS, type EmployeeFormValues } from "../employee-schema";
import type { Dict } from "../i18n/dictionaries";
import { mapHeaders, normalizeHeader, rowToRecord, type ImportField } from "./columns";
import { ImportFileError, parseSpreadsheet } from "./parse";

export interface AnalyzedRow {
  line: number;
  name: string;
  role: string;
  gross: number | null;
  payout: string;
  errors: string[];
  /** Present only when the row passed every check and can be imported. */
  data?: EmployeeFormValues;
}

export type Analysis =
  | { ok: false; message: string }
  | { ok: true; fileName: string; rows: AnalyzedRow[]; ignored: string[]; defaulted: string[] };

const gross = (d: EmployeeFormValues) =>
  d.baseSalary + d.bonuses + d.housingAllowance + d.transportAllowance + d.functionAllowance + d.otherAllowance;

/** Parse an uploaded file and check every row exactly as the employee form would, plus duplicate detection. */
export async function analyzeUpload(file: FormDataEntryValue | null, companyId: string, t: Dict): Promise<Analysis> {
  const ti = t.import;
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: ti.problem.noFile };

  let sheet;
  try {
    sheet = await parseSpreadsheet(new Uint8Array(await file.arrayBuffer()), file.name);
  } catch (err) {
    if (err instanceof ImportFileError) return { ok: false, message: ti.problem[err.problem] };
    throw err;
  }

  const mapping = mapHeaders(sheet.headers);
  if (mapping.missingRequired.length > 0) {
    return { ok: false, message: ti.missingColumns(mapping.missingRequired.map((f) => ti.columns[f]).join(", ")) };
  }

  // Same person already on file (any status) or listed twice in the sheet: flag rather than create twins.
  const existing = new Map(
    (await prisma.employee.findMany({ where: { companyId }, select: { fullName: true, code: true } })).map((e) => [
      normalizeHeader(e.fullName),
      e.code,
    ]),
  );
  const seen = new Map<string, number>();
  const defaulted = new Set<ImportField>();
  const schema = employeeSchema(t);

  const rows = sheet.rows.map(({ line, cells }): AnalyzedRow => {
    const { record, defaulted: d } = rowToRecord(cells, mapping.fields, ti.notSpecified);
    d.forEach((f) => defaulted.add(f));

    const parsed = schema.safeParse(record);
    const errors = parsed.success ? [] : Array.from(new Set(parsed.error.issues.map((i) => i.message)));

    const key = normalizeHeader(record.fullName);
    if (key) {
      const code = existing.get(key);
      const firstLine = seen.get(key);
      if (code) errors.push(ti.duplicateExisting(code));
      else if (firstLine !== undefined) errors.push(ti.duplicateInFile(firstLine));
      else seen.set(key, line);
    }

    const data = parsed.success ? parsed.data : undefined;
    // Show readable values even on rows that failed (a known method code, a normalised number).
    const known = (PAYMENT_METHODS as readonly string[]).includes(record.paymentMethod)
      ? t.common.methodDb[record.paymentMethod as (typeof PAYMENT_METHODS)[number]]
      : record.paymentMethod;
    const method = data ? t.common.methodDb[data.paymentMethod] : known;
    const phone = data ? data.mobileMoneyNumber : record.mobileMoneyNumber && normalizePhone(record.mobileMoneyNumber);
    return {
      line,
      name: record.fullName,
      role: record.role,
      gross: data ? gross(data) : null,
      payout: [method, phone].filter(Boolean).join(" · "),
      errors,
      data: errors.length === 0 ? data : undefined,
    };
  });

  return { ok: true, fileName: file.name, rows, ignored: mapping.ignored, defaulted: [...defaulted].map((f) => ti.columns[f]) };
}
