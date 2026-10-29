import "server-only";

import { getAuth } from "./auth/context";
import type { Role } from "./auth/permissions";
import { prisma } from "./db";

export interface TeamMember {
  membershipId: string;
  name: string;
  email: string;
  role: Role;
  joinedAt: string;
  isYou: boolean;
}

export interface PendingInvite {
  id: string;
  email: string;
  role: Role;
  invitedBy: string;
  expiresAt: string;
  expired: boolean;
}

export interface Team {
  companyName: string;
  myRole: Role;
  members: TeamMember[];
  invites: PendingInvite[];
}

export async function getTeam(): Promise<Team | null> {
  const auth = await getAuth();
  if (!auth?.activeCompanyId || !auth.activeRole) return null;
  const companyId = auth.activeCompanyId;

  const [company, memberships, invitations] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId }, select: { name: true } }),
    prisma.membership.findMany({
      where: { companyId },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.invitation.findMany({
      where: { companyId, acceptedAt: null },
      include: { invitedBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const now = Date.now();
  return {
    companyName: company?.name ?? "",
    myRole: auth.activeRole,
    members: memberships.map((m) => ({
      membershipId: m.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      joinedAt: m.createdAt.toISOString(),
      isYou: m.userId === auth.user.id,
    })),
    invites: invitations.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      invitedBy: i.invitedBy.name,
      expiresAt: i.expiresAt.toISOString(),
      expired: i.expiresAt.getTime() < now,
    })),
  };
}
