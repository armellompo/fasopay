import { NextResponse } from "next/server";

import { PayrollApiError } from "@/lib/api";
import { authorize } from "@/lib/auth/authorize";
import { getT } from "@/lib/i18n/server";
import { getDashboard, runPayroll } from "@/lib/payroll-service";
import type { RunPayrollResponse } from "@/lib/types";

export async function POST() {
  const auth = await authorize("payroll.calculate");
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  try {
    const calculated = await runPayroll();
    const data = await getDashboard();
    if (!data) throw new Error("Dashboard data missing after run");
    return NextResponse.json<RunPayrollResponse>({ calculated, data });
  } catch (err) {
    const engineDown = err instanceof PayrollApiError;
    console.error("[payroll/run]", err);
    return NextResponse.json(
      { error: engineDown ? err.message : getT().server.calcFailed },
      { status: engineDown ? 502 : 500 },
    );
  }
}
