import "server-only";

import { cache } from "react";

import type { Role } from "./permissions";
import { getSession } from "./session";

export interface AuthCompany {
  id: string;
  name: string;
  city: string;
  role: Role;
}

export interface AuthContext {
  user: { id: string; name: string; email: string };
  companies: AuthCompany[];
  /** Always one of `companies`, so tenant access is checked by construction. */
  activeCompanyId: string | null;
  /** The user's role in the active company. */
  activeRole: Role | null;
}

/** Who is signed in and which company they are working on. Cached per request. */
export const getAuth = cache(async (): Promise<AuthContext | null> => {
  const session = await getSession();
  if (!session) return null;
  const companies = session.user.memberships.map(({ company, role }) => ({ id: company.id, name: company.name, city: company.city, role }));
  const active = companies.find((c) => c.id === session.activeCompanyId) ?? companies[0] ?? null;
  return {
    user: { id: session.user.id, name: session.user.name, email: session.user.email },
    companies,
    activeCompanyId: active?.id ?? null,
    activeRole: active?.role ?? null,
  };
});
