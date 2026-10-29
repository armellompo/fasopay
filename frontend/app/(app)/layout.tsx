import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/AppShell";
import { getAuth } from "@/lib/auth/context";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const auth = await getAuth();
  if (!auth) redirect("/login");
  if (!auth.activeCompanyId) redirect("/companies/new");

  const active = auth.companies.find((c) => c.id === auth.activeCompanyId)!;
  return (
    <AppShell user={auth.user} companies={auth.companies} active={active}>
      {children}
    </AppShell>
  );
}
