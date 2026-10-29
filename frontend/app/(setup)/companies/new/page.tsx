import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth/AuthCard";
import { AddCompanyForm } from "@/components/auth/AuthForms";
import { getAuth } from "@/lib/auth/context";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function NewCompanyPage() {
  const auth = await getAuth();
  if (!auth) redirect("/login?next=/companies/new");
  const t = getT();
  return (
    <AuthCard
      title={t.auth.newCompany.title}
      subtitle={t.auth.newCompany.subtitle}
      footer={
        auth.companies.length > 0 ? (
          <Link href="/" className="font-medium text-slate-600 hover:underline">
            {t.common.cancel}
          </Link>
        ) : undefined
      }
    >
      <AddCompanyForm />
    </AuthCard>
  );
}
