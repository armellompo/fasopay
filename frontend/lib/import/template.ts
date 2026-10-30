// Builds the downloadable employee import template (.xlsx) in the user's language.
import ExcelJS from "exceljs";

import type { Dict } from "../i18n/dictionaries";
import { IMPORT_FIELDS, REQUIRED_FIELDS, type ImportField } from "./columns";

const AMOUNTS: ImportField[] = ["baseSalary", "bonuses", "housingAllowance", "transportAllowance", "functionAllowance", "otherAllowance"];
const TEXT: ImportField[] = ["cnssNumber", "mobileMoneyNumber"];
const DATA_ROWS = 1000;

export async function buildTemplate(t: Dict): Promise<Buffer> {
  const ti = t.import;
  const wb = new ExcelJS.Workbook();
  wb.creator = "FasoPay";

  // Data sheet: headers only. Examples live on the Instructions sheet so an unedited template never
  // imports fake employees (who would also be billed).
  const ws = wb.addWorksheet(ti.template.sheet, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = IMPORT_FIELDS.map((f) => ({
    header: ti.columns[f],
    key: f,
    width: Math.max(14, ti.columns[f].length + 4),
    style: AMOUNTS.includes(f) ? { numFmt: "#,##0" } : TEXT.includes(f) ? { numFmt: "@" } : {},
  }));
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FF064E3B" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };
  header.height = 22;

  const methods = [t.common.methodDb.ORANGE_MONEY, t.common.methodDb.MOOV_MONEY, t.common.methodDb.WAVE, t.common.methodDb.BANK_TRANSFER];
  const yesNo = [ti.template.yes.toLowerCase(), ti.template.no.toLowerCase()];
  const col = (f: ImportField) => IMPORT_FIELDS.indexOf(f) + 1;
  for (let r = 2; r <= DATA_ROWS + 1; r++) {
    ws.getCell(r, col("paymentMethod")).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`"${methods.join(",")}"`],
    };
    ws.getCell(r, col("isExecutive")).dataValidation = { type: "list", allowBlank: true, formulae: [`"${yesNo.join(",")}"`] };
    for (const f of AMOUNTS) {
      ws.getCell(r, col(f)).dataValidation = { type: "whole", operator: "greaterThanOrEqual", allowBlank: true, formulae: [0] };
    }
  }

  // Instructions sheet: what each column means, then a filled-in example.
  const help = wb.addWorksheet(ti.template.instructions);
  help.columns = [{ width: 28 }, { width: 14 }, { width: 80 }];
  help.addRow([ti.template.instructionsTitle]).font = { bold: true, size: 14 };
  help.addRow([ti.template.note]).font = { italic: true, color: { argb: "FF475569" } };
  help.addRow([]);
  const h = help.addRow([ti.template.colHeader, ti.template.requiredHeader, ti.template.descHeader]);
  h.font = { bold: true };
  h.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  for (const f of IMPORT_FIELDS) {
    help.addRow([ti.columns[f], REQUIRED_FIELDS.includes(f) ? ti.template.yes : ti.template.no, ti.template.desc[f]]);
  }
  help.addRow([]);
  const exampleTitle = help.addRow([ti.template.example]);
  exampleTitle.font = { bold: true };
  help.addRow(IMPORT_FIELDS.map((f) => ti.columns[f])).font = { bold: true, color: { argb: "FF64748B" } };
  help.addRow([
    "Issa Kaboré", "Magasinier", "Opérations", "0512 3344", 200000, 0, 30000, 15000, 0, 0, 2,
    yesNo[1], t.common.methodDb.ORANGE_MONEY, "70 12 34 56",
  ]);

  return Buffer.from(await wb.xlsx.writeBuffer());
}
