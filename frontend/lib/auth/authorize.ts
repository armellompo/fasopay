import "server-only";

import type { Company } from "@prisma/client";

import { prisma } from "../db";
import { getT } from "../i18n/server";
import { getAuth } from "./context";
import { can, type Permission, type Role } from "./permissions";

export type Authorized = { ok: true; company: Company; role: Role; userId: string };
export type Denied = { ok: false; message: string; status: 401 | 403 | 404 };

/** Gate for every mutating action: signed in, active company, and a role that grants `permission`. */
export async function authorize(permission: Permission): Promise<Authorized | Denied> {
  const auth = await getAuth();
  const t = getT();
  if (!auth?.activeCompanyId || !auth.activeRole) return { ok: false, message: t.server.signInAgain, status: 401 };
  if (!can(auth.activeRole, permission)) {
    return { ok: false, message: t.server.roleDenied(t.common.role[auth.activeRole]), status: 403 };
  }
  const company = await prisma.company.findUnique({ where: { id: auth.activeCompanyId } });
  if (!company) return { ok: false, message: t.server.companyNotFound, status: 404 };
  return { ok: true, company, role: auth.activeRole, userId: auth.user.id };
}
