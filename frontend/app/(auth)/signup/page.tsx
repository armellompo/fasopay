import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth/AuthCard";
import { InviteSignupForm, SignupForm } from "@/components/auth/AuthForms";
import { getAuth } from "@/lib/auth/context";
import { getT } from "@/lib/i18n/server";
import { findInvitation } from "@/lib/invites";

export const dynamic = "force-dynamic";

export default async function SignupPage({ searchParams }: { searchParams: { invite?: string } }) {
  const t = getT();
  if (searchParams.invite) {
    if (await getAuth()) redirect(`/invite/${encodeURIComponent(searchParams.invite)}`);
    const lookup = await findInvitation(searchParams.invite);
    if (lookup.status !== "valid") redirect(`/invite/${encodeURIComponent(searchParams.invite)}`);
    const { invite } = lookup;
    return (
      <AuthCard
        title={t.auth.invite.signupTitle(invite.companyName)}
        subtitle={t.auth.invite.signupSubtitle(t.common.role[invite.role])}
      >
        <InviteSignupForm token={searchParams.invite} email={invite.email} />
      </AuthCard>
    );
  }

  if (await getAuth()) redirect("/");
  return (
    <AuthCard
      title={t.auth.signup.title}
      subtitle={t.auth.signup.subtitle}
      footer={
        <>
          {t.auth.signup.haveAccount}{" "}
          <Link href="/login" className="font-medium text-emerald-700 hover:underline">
            {t.auth.signup.signIn}
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthCard>
  );
}
