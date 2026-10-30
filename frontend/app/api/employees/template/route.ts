import { NextResponse } from "next/server";

import { getLocale, getT } from "@/lib/i18n/server";
import { buildTemplate } from "@/lib/import/template";
import { currentCompany } from "@/lib/payroll-service";

/** The employee import template (.xlsx), headers and instructions in the user's language. */
export async function GET() {
  if (!(await currentCompany())) return NextResponse.json({ error: getT().server.signInAgain }, { status: 401 });

  const file = await buildTemplate(getT());
  const name = getLocale() === "fr" ? "fasopay-modele-salaries.xlsx" : "fasopay-employee-template.xlsx";
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
