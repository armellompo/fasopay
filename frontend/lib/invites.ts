import "server-only";

import type { MemberRole } from "@prisma/client";

import { hashToken, newToken } from "./auth/tokens";
import { prisma } from "./db";

export const INVITE_DAYS = 7;

export interface InviteDetails {
  id: string;
  email: string;
  role: MemberRole;
  companyId: string;
  companyName: string;
  invitedByName: string;
  expiresAt: string;
}

export type InviteLookup =
  | { status: "valid"; invite: InviteDetails }
  | { status: "expired" | "accepted" | "invalid" };

/** Resolve an invite link's token. Revoked invites are deleted, so they come back as "invalid". */
export async function findInvitation(token: string): Promise<InviteLookup> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return { status: "invalid" };
  const inv = await prisma.invitation.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { company: { select: { name: true } }, invitedBy: { select: { name: true } } },
  });
  if (!inv) return { status: "invalid" };
  if (inv.acceptedAt) return { status: "accepted" };
  if (inv.expiresAt < new Date()) return { status: "expired" };
  return {
    status: "valid",
    invite: {
      id: inv.id,
      email: inv.email,
      role: inv.role,
      companyId: inv.companyId,
      companyName: inv.company.name,
      invitedByName: inv.invitedBy.name,
      expiresAt: inv.expiresAt.toISOString(),
    },
  };
}

/** Create an invitation and return the raw token. It is shown once; only its hash is stored. */
export async function issueInvitation(companyId: string, email: string, role: MemberRole, invitedById: string) {
  const token = newToken();
  // One pending invite per email and company: a new one replaces any earlier link.
  await prisma.$transaction([
    prisma.invitation.deleteMany({ where: { companyId, email, acceptedAt: null } }),
    prisma.invitation.create({
      data: {
        companyId,
        email,
        role,
        invitedById,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + INVITE_DAYS * 86_400_000),
      },
    }),
  ]);
  return token;
}

/**
 * Atomically consume an invite: succeeds only if it is still pending and unexpired, so two
 * people racing on the same link can't both join. Pass a transaction client.
 */
export async function consumeInvitation(
  tx: Pick<typeof prisma, "invitation">,
  inviteId: string,
): Promise<boolean> {
  const now = new Date();
  const { count } = await tx.invitation.updateMany({
    where: { id: inviteId, acceptedAt: null, expiresAt: { gt: now } },
    data: { acceptedAt: now },
  });
  return count === 1;
}
