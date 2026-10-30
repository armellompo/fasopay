// Reads an uploaded .xlsx or .csv into header + string rows. Pure (no DB, no server-only) so it can be
// tested directly. Everything comes back as strings; validation happens later with the employee schema.
import ExcelJS from "exceljs";

export const MAX_BYTES = 2 * 1024 * 1024;
export const MAX_ROWS = 1000;

export type ImportFileProblem = "unsupported" | "legacyXls" | "empty" | "tooLarge" | "tooManyRows" | "unreadable";

export class ImportFileError extends Error {
  constructor(public problem: ImportFileProblem) {
    super(problem);
  }
}

export interface ParsedSheet {
  headers: string[];
  /** `line` is the row number as the user sees it in Excel (header row included). */
  rows: { line: number; cells: string[] }[];
}

export async function parseSpreadsheet(bytes: Uint8Array, filename: string): Promise<ParsedSheet> {
  if (bytes.byteLength > MAX_BYTES) throw new ImportFileError("tooLarge");
  const ext = filename.toLowerCase().split(".").pop();
  if (ext === "xls") throw new ImportFileError("legacyXls");
  if (ext !== "xlsx" && ext !== "csv") throw new ImportFileError("unsupported");

  const grid = ext === "xlsx" ? await readXlsx(bytes) : readCsv(bytes);

  const headerIndex = grid.findIndex((r) => r.cells.some((c) => c.trim() !== ""));
  if (headerIndex === -1) throw new ImportFileError("empty");
  const headers = grid[headerIndex].cells.map((c) => c.trim());
  const rows = grid.slice(headerIndex + 1).filter((r) => r.cells.some((c) => c.trim() !== ""));
  if (rows.length === 0) throw new ImportFileError("empty");
  if (rows.length > MAX_ROWS) throw new ImportFileError("tooManyRows");
  return { headers, rows };
}

// ---------- XLSX ----------

async function readXlsx(bytes: Uint8Array): Promise<ParsedSheet["rows"]> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(Buffer.from(bytes) as unknown as ArrayBuffer);
  } catch {
    throw new ImportFileError("unreadable");
  }
  // First sheet that has any content (the FasoPay template puts the data sheet first).
  const sheet = wb.worksheets.find((ws) => ws.actualRowCount > 0);
  if (!sheet) throw new ImportFileError("empty");

  const out: ParsedSheet["rows"] = [];
  const width = sheet.columnCount;
  sheet.eachRow({ includeEmpty: false }, (row, line) => {
    const cells: string[] = [];
    for (let c = 1; c <= width; c++) cells.push(cellText(row.getCell(c).value));
    out.push({ line, cells });
  });
  return out;
}

function cellText(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((r) => r.text).join("");
    if ("result" in v) return cellText(v.result as ExcelJS.CellValue); // formula: use its computed value
    if ("text" in v) return String(v.text); // hyperlink
  }
  return "";
}

// ---------- CSV ----------

function readCsv(bytes: Uint8Array): ParsedSheet["rows"] {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    // French Excel's "CSV (séparateur: point-virgule)" is Windows-1252, not UTF-8.
    text = new TextDecoder("windows-1252").decode(bytes);
  }
  text = text.replace(/^﻿/, "");
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = [";", ",", "\t"].reduce((best, d) => (count(firstLine, d) > count(firstLine, best) ? d : best), ";");
  return parseCsv(text, delimiter).map((cells, i) => ({ line: i + 1, cells }));
}

function count(s: string, ch: string): number {
  return s.split(ch).length - 1;
}

/** RFC 4180-style: quoted fields may contain the delimiter, newlines and doubled quotes. */
function parseCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"' && field === "") {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
