// Maps spreadsheet headers to employee fields and turns a row of cells into the same string record the
// employee form submits, so imports go through exactly the same validation (employeeSchema).
import { dictionaries } from "../i18n/dictionaries";

export const IMPORT_FIELDS = [
  "fullName",
  "role",
  "department",
  "cnssNumber",
  "baseSalary",
  "bonuses",
  "housingAllowance",
  "transportAllowance",
  "functionAllowance",
  "otherAllowance",
  "dependents",
  "isExecutive",
  "paymentMethod",
  "mobileMoneyNumber",
] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];

export const REQUIRED_FIELDS: ImportField[] = ["fullName", "baseSalary"];

/** Lowercase, no accents, punctuation to spaces: "N° CNSS (immatriculation)" → "n cnss immatriculation". */
export function normalizeHeader(h: string): string {
  return h
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Variants seen in real payroll sheets, besides the template's own headers (added below in both languages).
// Note "fonction" alone means job title in Burkina; the allowance is "indemnité de fonction".
const EXTRA_ALIASES: Record<ImportField, string[]> = {
  fullName: ["nom", "noms", "nom complet", "nom et prenom", "nom et prenoms", "nom prenom", "nom prenoms", "nom s et prenom s",
    "salarie", "employe", "agent", "name", "full name", "employee", "employee name"],
  role: ["emploi", "poste", "fonction", "intitule du poste", "qualification", "job", "job title", "position", "title", "role"],
  department: ["service", "departement", "direction", "section", "department", "dept", "team"],
  cnssNumber: ["cnss", "n cnss", "no cnss", "num cnss", "numero cnss", "matricule cnss", "immatriculation cnss", "cnss number", "cnss no"],
  baseSalary: ["salaire de base", "salaire base", "base", "salaire", "salaire mensuel de base", "base salary", "basic salary", "salary"],
  bonuses: ["primes", "prime", "primes imposables", "gratifications", "bonus", "bonuses", "taxable bonuses"],
  housingAllowance: ["indemnite de logement", "logement", "ind logement", "housing", "housing allowance"],
  transportAllowance: ["indemnite de transport", "transport", "ind transport", "transport allowance"],
  functionAllowance: ["indemnite de fonction", "ind fonction", "function allowance", "responsibility allowance"],
  otherAllowance: ["autres indemnites", "autre indemnite", "autres", "other allowances", "other allowance", "other"],
  dependents: ["charges de famille", "personnes a charge", "nombre de personnes a charge", "enfants a charge", "nb charges",
    "dependents", "dependants", "number of dependents"],
  isExecutive: ["cadre", "categorie cadre", "statut cadre", "executive", "manager"],
  paymentMethod: ["mode de paiement", "paiement", "moyen de paiement", "mode de reglement", "payment method", "payment", "payout"],
  mobileMoneyNumber: ["numero mobile money", "mobile money", "telephone", "tel", "numero de telephone", "contact",
    "phone", "phone number", "mobile", "msisdn"],
};

const ALIAS_TO_FIELD = (() => {
  const map = new Map<string, ImportField>();
  for (const field of IMPORT_FIELDS) {
    for (const lang of ["fr", "en"] as const) map.set(normalizeHeader(dictionaries[lang].import.columns[field]), field);
    for (const alias of EXTRA_ALIASES[field]) if (!map.has(alias)) map.set(alias, field);
  }
  return map;
})();

export interface HeaderMapping {
  /** Field for each column, or null when the column is ignored. */
  fields: (ImportField | null)[];
  ignored: string[];
  missingRequired: ImportField[];
}

export function mapHeaders(headers: string[]): HeaderMapping {
  const seen = new Set<ImportField>();
  const ignored: string[] = [];
  const fields = headers.map((h) => {
    const field = ALIAS_TO_FIELD.get(normalizeHeader(h)) ?? null;
    if (!field || seen.has(field)) {
      if (h.trim()) ignored.push(h.trim());
      return null;
    }
    seen.add(field);
    return field;
  });
  return { fields, ignored, missingRequired: REQUIRED_FIELDS.filter((f) => !seen.has(f)) };
}

/**
 * "200 000", "200.000", "200 000 FCFA", 200000.00 → "200000". Anything with real decimals is left in a form the
 * schema rejects ("200000.5"), never silently rounded or misread as thousands.
 */
export function normalizeAmount(raw: string): string {
  let x = raw.trim().toLowerCase().replace(/\s*(f\s*cfa|fcfa|xof|cfa|f)\s*$/, "");
  x = x.replace(/[\s\u00a0\u202f]/g, "");
  if (/^\d{1,3}(\.\d{3})+$/.test(x)) x = x.replace(/\./g, ""); // 200.000
  if (/^\d{1,3}(,\d{3})+$/.test(x)) x = x.replace(/,/g, ""); // 200,000
  x = x.replace(/^(\d+)[.,]0{1,2}$/, "$1"); // 200000.00
  if (/^\d+,\d+$/.test(x)) x = x.replace(",", "."); // 200000,50 → fails "whole FCFA" instead of becoming 20000050
  return x;
}

const YES = new Set(["oui", "o", "yes", "y", "x", "1", "true", "vrai", "cadre"]);

/** Free-text payment method → PaymentMethod enum value; unknown text is passed through so validation flags it. */
export function normalizePaymentMethod(raw: string, hasPhone: boolean): string {
  const v = normalizeHeader(raw.replace(/_/g, " "));
  if (!v) return hasPhone ? "" : "BANK_TRANSFER";
  if (v === "om" || v.includes("orange")) return "ORANGE_MONEY";
  if (v.includes("moov") || v.includes("flooz")) return "MOOV_MONEY";
  if (v.includes("wave")) return "WAVE";
  if (/(virement|banque|bancaire|bank|transfer|rib)/.test(v)) return "BANK_TRANSFER";
  return raw.trim();
}

const AMOUNT_FIELDS: ImportField[] = ["baseSalary", "bonuses", "housingAllowance", "transportAllowance", "functionAllowance", "otherAllowance"];

/**
 * One spreadsheet row → the record the employee form would submit. Missing job title / department become
 * `notSpecified` so a sheet without those columns still imports; the user can fill them in later.
 */
export function rowToRecord(cells: string[], fields: (ImportField | null)[], notSpecified: string) {
  const raw: Partial<Record<ImportField, string>> = {};
  fields.forEach((f, i) => {
    if (f) raw[f] = (cells[i] ?? "").trim();
  });

  const record: Record<string, string> = {};
  for (const f of IMPORT_FIELDS) {
    const v = raw[f] ?? "";
    if (AMOUNT_FIELDS.includes(f)) record[f] = normalizeAmount(v);
    else record[f] = v;
  }
  const defaulted: ("role" | "department")[] = [];
  for (const f of ["role", "department"] as const) {
    if (!record[f]) {
      record[f] = notSpecified;
      defaulted.push(f);
    }
  }
  record.dependents = record.dependents || "0";
  record.isExecutive = YES.has(normalizeHeader(record.isExecutive)) ? "true" : "false";
  record.paymentMethod = normalizePaymentMethod(record.paymentMethod, record.mobileMoneyNumber !== "");
  return { record, defaulted };
}
