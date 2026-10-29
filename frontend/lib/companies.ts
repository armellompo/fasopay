import "server-only";

import { prisma } from "./db";

/** Create a company owned by the user, with the current month's payroll run already open. */
export async function createCompanyForUser(userId: string, data: { name: string; city: string }) {
  const period = new Date().toISOString().slice(0, 7);
  return prisma.company.create({
    data: {
      ...data,
      members: { create: { userId, role: "OWNER" } },
      runs: { create: { period } },
    },
  });
}
