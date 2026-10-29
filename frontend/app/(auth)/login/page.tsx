import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/AuthForms";
import { getAuth } from "@/lib/auth/context";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  const next = searchParams.next;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
  if (await getAuth()) redirect(safeNext);
  const t = getT().auth.login;
  return (
    <AuthCard
      title={t.title}
      subtitle={t.subtitle}
      footer={
        <>
          {t.newHere}{" "}
          <Link href="/signup" className="font-medium text-emerald-700 hover:underline">
            {t.createAccount}
          </Link>
          {process.env.NODE_ENV !== "production" && (
            <p className="mt-2 text-xs text-slate-400">{t.devHint}</p>
          )}
        </>
      }
    >
      <LoginForm next={searchParams.next} />
    </AuthCard>
  );
}
