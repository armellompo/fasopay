import Link from "next/link";

import { AuthCard } from "@/components/auth/AuthCard";
import { AcceptInviteForm } from "@/components/auth/AuthForms";
import { logout } from "@/lib/auth/actions";
import { getAuth } from "@/lib/auth/context";
import { formatDate } from "@/lib/format";
import { getLocale, getT } from "@/lib/i18n/server";
import { findInvitation } from "@/lib/invites";

export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: { token: string } }) {
  const [lookup, auth] = await Promise.all([findInvitation(params.token), getAuth()]);
  const here = `/invite/${params.token}`;
  const t = getT();
  const ti = t.auth.invite;

  if (lookup.status !== "valid") {
    return (
      <AuthCard title={ti.unavailable} subtitle={ti.problem[lookup.status]}>
        <Link href={auth ? "/" : "/login"} className="text-sm font-medium text-emerald-700 hover:underline">
          {auth ? ti.goToApp : t.auth.login.submit}
        </Link>
      </AuthCard>
    );
  }

  const { invite } = lookup;
  const expires = formatDate(invite.expiresAt, getLocale(), { day: "numeric", month: "long" });

  return (
    <AuthCard title={ti.join(invite.companyName)} subtitle={ti.invited(invite.invitedByName, invite.email)}>
      <div className="mb-6 rounded-lg bg-slate-50 p-4 text-sm">
        <p>
          {ti.role} <span className="font-semibold">{t.common.role[invite.role]}</span>
        </p>
        <p className="mt-1 text-slate-500">{t.common.roleDescription[invite.role]}</p>
        <p className="mt-2 text-xs text-slate-400">{ti.validUntil(expires)}</p>
      </div>

      {auth && auth.user.email === invite.email ? (
        <AcceptInviteForm token={params.token} />
      ) : auth ? (
        <div className="space-y-4 text-sm">
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800">
            {ti.wrongAccount(auth.user.email, invite.email)}
          </p>
          <form action={logout}>
            <input type="hidden" name="next" value={here} />
            <button type="submit" className="w-full rounded-lg border border-slate-300 px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-50">
              {ti.switchAccount(invite.email)}
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-3">
          <Link
            href={`/signup?invite=${encodeURIComponent(params.token)}`}
            className="block w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-emerald-700"
          >
            {ti.createMine}
          </Link>
          <Link
            href={`/login?next=${encodeURIComponent(here)}`}
            className="block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {ti.haveAccount}
          </Link>
        </div>
      )}
    </AuthCard>
  );
}
