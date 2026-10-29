import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const ENGINE_URL = process.env.PAYROLL_ENGINE_URL ?? "http://localhost:8000";

async function check(fn: () => Promise<unknown>): Promise<"ok" | "down"> {
  try {
    await fn();
    return "ok";
  } catch {
    return "down";
  }
}

/** Liveness for Docker and uptime monitors: 200 when the database and the compliance engine both answer. */
export async function GET() {
  const [db, engine] = await Promise.all([
    check(() => prisma.$queryRaw`SELECT 1`),
    check(async () => {
      const res = await fetch(`${ENGINE_URL}/health`, { cache: "no-store", signal: AbortSignal.timeout(2000) });
      if (!res.ok) throw new Error(String(res.status));
    }),
  ]);
  const ok = db === "ok" && engine === "ok";
  return NextResponse.json({ status: ok ? "ok" : "degraded", db, engine }, { status: ok ? 200 : 503 });
}
