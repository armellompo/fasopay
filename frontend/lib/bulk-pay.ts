import type { EmployeePayRow } from "./types";

/** Bulk-payout CSV grouped by operator, for the Orange Money / Moov / Wave business portals. */
export function toBulkPayCsv(rows: EmployeePayRow[], period: string): string {
  const header = "employee_id,name,payment_method,msisdn,amount_fcfa,reference";
  const lines = rows
    .filter((r) => r.status !== "Draft")
    .sort((a, b) => a.paymentMethod.localeCompare(b.paymentMethod) || a.code.localeCompare(b.code))
    .map((r) =>
      [r.code, `"${r.name}"`, r.paymentMethod, r.mobileMoneyNumber ?? "", r.netPayout, `SAL-${period}-${r.code}`].join(","),
    );
  return [header, ...lines].join("\n");
}

/** Trigger a browser download of a text file. */
export function downloadText(filename: string, content: string, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
