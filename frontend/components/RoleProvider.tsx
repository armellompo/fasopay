"use client";

import { createContext, useContext, type ReactNode } from "react";

import { can, type Permission, type Role } from "@/lib/auth/permissions";

// Defaults to the least-privileged role so a missing provider hides controls rather than showing them.
const RoleContext = createContext<Role>("ACCOUNTANT");

export function RoleProvider({ role, children }: { role: Role; children: ReactNode }) {
  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>;
}

export function useRole(): Role {
  return useContext(RoleContext);
}

/** UI hint only: the server enforces the same table on every action. */
export function useCan(permission: Permission): boolean {
  return can(useContext(RoleContext), permission);
}
