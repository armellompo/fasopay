import { NextResponse, type NextRequest } from "next/server";

import { loadPayslipDocs } from "@/lib/payslip-documents";
import { pdfResponse, renderPayslips, slug } from "@/lib/pdf/render";

/** One employee's pay slip for a period. */
export async function GET(req: NextRequest, { params }: { params: { period: string; employeeId: string } }) {
  const result = await loadPayslipDocs(params.period, [params.employeeId]);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });

  const [slip] = result.slips;
  const pdf = await renderPayslips(result.slips, `Bulletin de paie ${slip.periodLabel} – ${slip.employee.fullName}`);
  const download = req.nextUrl.searchParams.get("download") === "1";
  return pdfResponse(pdf, `bulletin-${result.period}-${slip.employee.code}-${slug(slip.employee.fullName)}.pdf`, download);
}
