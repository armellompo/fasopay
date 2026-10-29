"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createCompanyForUser } from "../companies";
import { prisma } from "../db";
import type { Dict } from "../i18n/dictionaries";
import { getT } from "../i18n/server";
import { consumeInvitation, findInvitation } from "../invites";
import { getAuth } from "./context";
import { dummyHash, hashPassword, verifyPassword } from "./password";
import { clearFailures, isLocked, recordFailure } from "./rate-limit";
import { createSession, destroySession, setActiveCompany } from "./session";

export type AuthFormState = { error?: string; fieldErrors?: Record<string, string> };

/** Only same-site relative paths, so the login form can't be used as an open redirect. */
function safeNext(value: FormDataEntryValue | null): string {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : "/";
}

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) out[String(issue.path[0])] ??= issue.message;
  return out;
}

export async function login(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const t = getT();
  if (!email || !password) return { error: t.server.enterCredentials };
  if (isLocked(email)) return { error: t.server.locked };

  const user = await prisma.user.findUnique({
    where: { email },
    include: { memberships: { orderBy: { createdAt: "asc" }, take: 1 } },
  });
  // Always run a hash comparison so unknown emails take as long as wrong passwords.
  const valid = await verifyPassword(password, user?.passwordHash ?? (await dummyHash()));
  if (!user || !valid) {
    recordFailure(email);
    return { error: t.server.badCredentials };
  }

  clearFailures(email);
  await createSession(user.id, user.memberships[0]?.companyId ?? null);
  redirect(safeNext(form.get("next")));
}

const signupSchema = (v: Dict["server"]["validation"]) =>
  z.object({
    name: z.string().trim().min(2, v.yourName).max(100),
    email: z.string().trim().toLowerCase().email(v.email).max(120),
    password: z.string().min(8, v.password8).max(128, v.password128),
    companyName: z.string().trim().min(2, v.companyName).max(120),
    city: z.string().trim().min(2, v.city).max(60),
  });

/** Create an account and its first company, then sign in. */
export async function signup(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const t = getT();
  const parsed = signupSchema(t.server.validation).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: t.server.fixFields, fieldErrors: fieldErrors(parsed.error) };
  const { name, email, password, companyName, city } = parsed.data;

  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    return { error: t.server.emailTaken, fieldErrors: { email: t.server.alreadyRegistered } };
  }

  // One nested write: user, company, ownership and the first payroll run land together or not at all.
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      memberships: {
        create: {
          role: "OWNER",
          company: { create: { name: companyName, city, runs: { create: { period: new Date().toISOString().slice(0, 7) } } } },
        },
      },
    },
    include: { memberships: true },
  });
  await createSession(user.id, user.memberships[0].companyId);
  redirect("/employees");
}

export async function logout(form?: FormData): Promise<void> {
  await destroySession();
  const next = safeNext(form?.get("next") ?? null);
  redirect(next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`);
}

/** Join a company from an invite link while signed in. The account's email must match the invite. */
export async function acceptInvite(form: FormData): Promise<AuthFormState> {
  const token = String(form.get("token") ?? "");
  const auth = await getAuth();
  if (!auth) redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);

  const t = getT();
  const lookup = await findInvitation(token);
  if (lookup.status !== "valid") return { error: t.server.inviteInvalid };
  const { invite } = lookup;
  if (invite.email !== auth.user.email) {
    return { error: t.server.inviteWrongAccount(invite.email, auth.user.email) };
  }

  const joined = await prisma.$transaction(async (tx) => {
    if (!(await consumeInvitation(tx, invite.id))) return false;
    // Already a member (e.g. invited twice): keep the existing role rather than silently changing it.
    await tx.membership.upsert({
      where: { userId_companyId: { userId: auth.user.id, companyId: invite.companyId } },
      create: { userId: auth.user.id, companyId: invite.companyId, role: invite.role },
      update: {},
    });
    return true;
  });
  if (!joined) return { error: t.server.inviteUsed };

  await setActiveCompany(invite.companyId);
  revalidatePath("/", "layout");
  redirect("/");
}

const inviteSignupSchema = (v: Dict["server"]["validation"]) =>
  z.object({
    token: z.string().min(20),
    name: z.string().trim().min(2, v.yourName).max(100),
    password: z.string().min(8, v.password8).max(128, v.password128),
  });

/** Create an account from an invite link. The email comes from the invitation, never from the form. */
export async function signupWithInvite(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const t = getT();
  const parsed = inviteSignupSchema(t.server.validation).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: t.server.fixFields, fieldErrors: fieldErrors(parsed.error) };
  const { token, name, password } = parsed.data;

  const lookup = await findInvitation(token);
  if (lookup.status !== "valid") return { error: t.server.inviteInvalid };
  const { invite } = lookup;

  if (await prisma.user.findUnique({ where: { email: invite.email }, select: { id: true } })) {
    return { error: t.server.inviteAccountExists(invite.email) };
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.$transaction(async (tx) => {
    if (!(await consumeInvitation(tx, invite.id))) return null;
    return tx.user.create({
      data: { name, email: invite.email, passwordHash, memberships: { create: { companyId: invite.companyId, role: invite.role } } },
    });
  });
  if (!user) return { error: t.server.inviteUsed };

  await createSession(user.id, invite.companyId);
  redirect("/");
}

/** Switch the session to another company the user is a member of. */
export async function switchCompany(form: FormData): Promise<void> {
  const companyId = String(form.get("companyId") ?? "");
  const auth = await getAuth();
  if (!auth) redirect("/login");
  if (auth.companies.some((c) => c.id === companyId)) {
    await setActiveCompany(companyId);
    revalidatePath("/", "layout");
  }
  redirect("/");
}

const companySchema = (v: Dict["server"]["validation"]) =>
  z.object({
    name: z.string().trim().min(2, v.companyName).max(120),
    city: z.string().trim().min(2, v.city).max(60),
  });

/** Add another company to the signed-in account (e.g. an accounting firm's new client) and switch to it. */
export async function addCompany(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const auth = await getAuth();
  if (!auth) redirect("/login");
  const t = getT();
  const parsed = companySchema(t.server.validation).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: t.server.fixFields, fieldErrors: fieldErrors(parsed.error) };

  const company = await createCompanyForUser(auth.user.id, parsed.data);
  await setActiveCompany(company.id);
  revalidatePath("/", "layout");
  redirect("/settings");
}
