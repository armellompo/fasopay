import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import { prisma } from "../db";
import { SESSION_COOKIE } from "./constants";
import { hashToken, newToken } from "./tokens";

const SESSION_DAYS = 30;

/** Start a session: random token in an httpOnly cookie, only its hash in the database. */
export async function createSession(userId: string, activeCompanyId: string | null): Promise<void> {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await prisma.session.create({ data: { tokenHash: hashToken(token), userId, activeCompanyId, expiresAt } });
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

/** The current request's valid session with the user's memberships, or null. Cached per request. */
export const getSession = cache(async () => {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        include: { memberships: { include: { company: true }, orderBy: { createdAt: "asc" } } },
      },
    },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session;
});

export async function setActiveCompany(companyId: string): Promise<void> {
  const session = await getSession();
  if (session) await prisma.session.update({ where: { id: session.id }, data: { activeCompanyId: companyId } });
}

export async function destroySession(): Promise<void> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  cookies().delete(SESSION_COOKIE);
}
