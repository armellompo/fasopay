import "server-only";

import { getT } from "./i18n/server";
import type { PayInput, PayrollResult, StatutoryRates } from "./types";

// Server-side only: the browser talks to Next.js, which talks to the engine.
const ENGINE_URL = process.env.PAYROLL_ENGINE_URL ?? "http://localhost:8000";

export class PayrollApiError extends Error {}

/** POST one employee's pay elements to the compliance engine. */
export async function calculatePayroll(input: PayInput): Promise<PayrollResult> {
  let res: Response;
  try {
    res = await fetch(`${ENGINE_URL}/api/v1/payroll/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      cache: "no-store",
    });
  } catch {
    throw new PayrollApiError(getT().server.engineUnreachable);
  }
  if (!res.ok) {
    const body: unknown = await res.json().catch(() => null);
    const detail = body && typeof body === "object" && "detail" in body ? JSON.stringify(body.detail) : res.statusText;
    throw new PayrollApiError(getT().server.engineRejected(input.employee_id, detail));
  }
  return (await res.json()) as PayrollResult;
}

/** Statutory parameters straight from the engine's config, or null if it is unreachable. */
export async function getRates(): Promise<StatutoryRates | null> {
  try {
    const res = await fetch(`${ENGINE_URL}/api/v1/rates`, { cache: "no-store" });
    return res.ok ? ((await res.json()) as StatutoryRates) : null;
  } catch {
    return null;
  }
}
