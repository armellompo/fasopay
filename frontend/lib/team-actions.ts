"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { authorize } from "./auth/authorize";
import { assignableRoles, canManageMember, type Role } from "./auth/permissions";
import { prisma } from "./db";
import type { Dict } from "./i18n/dictionaries";
import { getT } from "./i18n/server";
import { issueInvitation } from "./invites";

export type ActionResult = { ok: boolean; message: string };

export type InviteState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: { email?: string; role?: string } }
  | { status: "created"; token: string; email: string; role: Role; companyName: string; nonce: number };

const inviteSchema = (v: Dict["server"]["validation"]) =>
  z.object({
    email: z.string().trim().toLowerCase().email(v.email).max(120),
    role: z.enum(["OWNER", "ADMIN", "ACCOUNTANT"], { errorMap: () => ({ message: v.role }) }),
  });

function revalidate() {
  revalidatePath("/settings/team");
}

async function ownerCount(companyId: string) {
  return prisma.membership.count({ where: { companyId, role: "OWNER" } });
}

export async function inviteMember(_prev: InviteState, form: FormData): Promise<InviteState> {
  const auth = await authorize("team.manage");
  if (!auth.ok) return { status: "error", message: auth.message };

  const t = getT();
  const parsed = inviteSchema(t.server.validation).safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const fieldErrors: { email?: string; role?: string } = {};
    for (const i of parsed.error.issues) fieldErrors[i.path[0] as "email" | "role"] ??= i.message;
    return { status: "error", message: t.server.fixFields, fieldErrors };
  }
  const { email, role } = parsed.data;
  if (!assignableRoles(auth.role).includes(role)) {
    return { status: "error", message: t.server.onlyOwnersInvite(t.common.role[role]), fieldErrors: { role: t.server.notAllowed } };
  }

  const existing = await prisma.membership.findFirst({ where: { companyId: auth.company.id, user: { email } } });
  if (existing) return { status: "error", message: t.server.alreadyMember(email), fieldErrors: { email: t.server.alreadyMemberShort } };

  const token = await issueInvitation(auth.company.id, email, role, auth.userId);
  revalidate();
  return { status: "created", token, email, role, companyName: auth.company.name, nonce: Date.now() };
}

/** Replace a pending invite's link (e.g. the first one was lost). The old link stops working. */
export async function regenerateInvite(inviteId: string): Promise<InviteState> {
  const auth = await authorize("team.manage");
  if (!auth.ok) return { status: "error", message: auth.message };
  const t = getT();
  const invite = await prisma.invitation.findFirst({ where: { id: inviteId, companyId: auth.company.id, acceptedAt: null } });
  if (!invite) return { status: "error", message: t.server.inviteNotFound };
  if (!assignableRoles(auth.role).includes(invite.role)) return { status: "error", message: t.server.ownerInvitesOnly };

  const token = await issueInvitation(auth.company.id, invite.email, invite.role, auth.userId);
  revalidate();
  return { status: "created", token, email: invite.email, role: invite.role, companyName: auth.company.name, nonce: Date.now() };
}

export async function revokeInvite(inviteId: string): Promise<ActionResult> {
  const auth = await authorize("team.manage");
  if (!auth.ok) return auth;
  const t = getT();
  const invite = await prisma.invitation.findFirst({ where: { id: inviteId, companyId: auth.company.id, acceptedAt: null } });
  if (!invite) return { ok: false, message: t.server.inviteNotFound };
  if (!canManageMember(auth.role, invite.role)) return { ok: false, message: t.server.ownerRevokeOnly };
  await prisma.invitation.delete({ where: { id: invite.id } });
  revalidate();
  return { ok: true, message: t.server.inviteRevoked(invite.email) };
}

export async function changeRole(membershipId: string, role: Role): Promise<ActionResult> {
  const auth = await authorize("team.manage");
  if (!auth.ok) return auth;
  const t = getT();
  const member = await prisma.membership.findFirst({
    where: { id: membershipId, companyId: auth.company.id },
    include: { user: { select: { name: true } } },
  });
  if (!member) return { ok: false, message: t.server.memberNotFound };
  if (member.userId === auth.userId) return { ok: false, message: t.server.ownRole };
  if (!canManageMember(auth.role, member.role) || !assignableRoles(auth.role).includes(role)) {
    return { ok: false, message: t.server.ownerChangeOnly };
  }
  if (member.role === "OWNER" && role !== "OWNER" && (await ownerCount(auth.company.id)) <= 1) {
    return { ok: false, message: t.server.needOwner };
  }
  await prisma.membership.update({ where: { id: member.id }, data: { role } });
  revalidate();
  return { ok: true, message: t.server.roleChanged(member.user.name, t.common.role[role]) };
}

export async function removeMember(membershipId: string): Promise<ActionResult> {
  const auth = await authorize("team.manage");
  if (!auth.ok) return auth;
  const t = getT();
  const member = await prisma.membership.findFirst({
    where: { id: membershipId, companyId: auth.company.id },
    include: { user: { select: { name: true } } },
  });
  if (!member) return { ok: false, message: t.server.memberNotFound };
  if (member.userId === auth.userId) return { ok: false, message: t.server.cantRemoveSelf };
  if (!canManageMember(auth.role, member.role)) return { ok: false, message: t.server.ownerRemoveOnly };
  if (member.role === "OWNER" && (await ownerCount(auth.company.id)) <= 1) {
    return { ok: false, message: t.server.needOwner };
  }
  // Their sessions fall back to another company automatically: access is derived from memberships.
  await prisma.membership.delete({ where: { id: member.id } });
  revalidate();
  return { ok: true, message: t.server.memberRemoved(member.user.name, auth.company.name) };
}
