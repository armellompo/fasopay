import "server-only";

import { prisma } from "./db";

/** Hands out the company's next EMP-### codes in sequence (one call per new employee). */
export async function codeAllocator(companyId: string): Promise<() => string> {
  const codes = await prisma.employee.findMany({ where: { companyId }, select: { code: true } });
  let max = codes.reduce((m, { code }) => Math.max(m, Number(code.replace(/\D/g, "")) || 0), 0);
  return () => `EMP-${String(++max).padStart(3, "0")}`;
}
