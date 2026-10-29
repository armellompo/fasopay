import { NextResponse, type NextRequest } from "next/server";

import { loadPayslipDocs } from "@/lib/payslip-documents";
import { pdfResponse, renderPayslips, slug } from "@/lib/pdf/render";

/** All pay slips of a run in one PDF (one page each), or only ?employees=id1,id2. */
export async function GET(req: NextRequest, { params }: { params: { period: string } }) {
  const ids = req.nextUrl.searchParams.get("employees")?.split(",").filter(Boolean);
  const result = await loadPayslipDocs(params.period, ids);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });

  const company = result.slips[0].company.name;
  const pdf = await renderPayslips(result.slips, `Bulletins de paie ${result.period} – ${company}`);
  const download = req.nextUrl.searchParams.get("download") === "1";
  return pdfResponse(pdf, `bulletins-${result.period}-${slug(company)}.pdf`, download);
}
