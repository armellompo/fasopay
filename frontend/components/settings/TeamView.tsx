"use client";

import { Check, Copy, Link2, Loader2, MessageCircle, RefreshCw, Trash2, UserPlus, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Toast, useToast } from "@/components/Toast";
import { useLocale, useT } from "@/components/I18nProvider";
import { assignableRoles, canManageMember, type Role } from "@/lib/auth/permissions";
import { formatDate } from "@/lib/format";
import { initials } from "@/lib/format";
import {
  changeRole,
  inviteMember,
  regenerateInvite,
  removeMember,
  revokeInvite,
  type InviteState,
} from "@/lib/team-actions";
import type { Team } from "@/lib/team-service";

const ROLE_BADGE: Record<Role, string> = {
  OWNER: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  ADMIN: "bg-sky-50 text-sky-700 ring-sky-200",
  ACCOUNTANT: "bg-violet-50 text-violet-700 ring-violet-200",
};

type CreatedInvite = Extract<InviteState, { status: "created" }>;

export function TeamView({ team }: { team: Team }) {
  const [toast, setToast] = useToast();
  const [pending, startTransition] = useTransition();
  const [created, setCreated] = useState<CreatedInvite | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const roles = assignableRoles(team.myRole);
  const tAll = useT();
  const t = tAll.settings.team;
  const roleLabel = tAll.common.role;
  const locale = useLocale();
  const canInvite = roles.length > 0;

  const run = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    startTransition(async () => {
      const res = await fn();
      setToast({ kind: res.ok ? "success" : "error", text: res.message });
    });

  const newLink = (id: string) =>
    startTransition(async () => {
      const res = await regenerateInvite(id);
      if (res.status === "created") setCreated(res);
      else if (res.status === "error") setToast({ kind: "error", text: res.message });
    });

  return (
    <>
      {canInvite ? (
        <InviteForm roles={roles} onCreated={setCreated} onError={(text) => setToast({ kind: "error", text })} />
      ) : (
        <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {t.readOnly(roleLabel[team.myRole], team.companyName)}
        </p>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold">{t.members(team.companyName)}</h2>
          <p className="text-xs text-slate-500">{t.withAccess(team.members.length)}</p>
        </div>
        <ul className="divide-y divide-slate-100">
          {team.members.map((m) => {
            const manageable = !m.isYou && canManageMember(team.myRole, m.role);
            return (
              <li key={m.membershipId} className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                    {initials(m.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {m.name}
                      {m.isYou && <span className="ml-2 text-xs font-normal text-slate-400">{t.you}</span>}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {m.email} · {t.joined(formatDate(m.joinedAt, locale))}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {manageable ? (
                    <select
                      value={m.role}
                      disabled={pending}
                      onChange={(e) => run(() => changeRole(m.membershipId, e.target.value as Role))}
                      aria-label={t.roleFor(m.name)}
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      {/* Keep the current role listed even if this actor couldn't grant it. */}
                      {Array.from(new Set<Role>([m.role, ...roles])).map((r) => (
                        <option key={r} value={r}>
                          {roleLabel[r]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${ROLE_BADGE[m.role]}`}>
                      {roleLabel[m.role]}
                    </span>
                  )}
                  {manageable &&
                    (confirmRemove === m.membershipId ? (
                      <span className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setConfirmRemove(null);
                            run(() => removeMember(m.membershipId));
                          }}
                          className="rounded-md bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                        >
                          {t.removeAccess}
                        </button>
                        <button onClick={() => setConfirmRemove(null)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100" aria-label={tAll.common.cancel}>
                          <X className="h-4 w-4" />
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmRemove(m.membershipId)}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        aria-label={t.remove(m.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ))}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {team.invites.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-semibold">{t.pending}</h2>
            <p className="text-xs text-slate-500">{t.pendingHint}</p>
          </div>
          <ul className="divide-y divide-slate-100">
            {team.invites.map((i) => {
              const manageable = canManageMember(team.myRole, i.role);
              return (
                <li key={i.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{i.email}</p>
                    <p className="text-xs text-slate-500">
                      {roleLabel[i.role]} · {t.invitedBy(i.invitedBy)} ·{" "}
                      {i.expired ? (
                        <span className="font-medium text-rose-600">{t.expired}</span>
                      ) : (
                        <>{t.expires(formatDate(i.expiresAt, locale))}</>
                      )}
                    </p>
                  </div>
                  {manageable && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => newLink(i.id)}
                        disabled={pending}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> {t.newLink}
                      </button>
                      <button
                        onClick={() => run(() => revokeInvite(i.id))}
                        disabled={pending}
                        className="rounded-md px-2 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                      >
                        {t.revoke}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">{t.rolesTitle}</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          {(Object.keys(roleLabel) as Role[]).map((r) => (
            <div key={r}>
              <dt>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${ROLE_BADGE[r]}`}>{roleLabel[r]}</span>
              </dt>
              <dd className="mt-2 text-slate-600">{tAll.common.roleDescription[r]}</dd>
            </div>
          ))}
        </dl>
      </section>

      {created && <InviteLinkDialog invite={created} onClose={() => setCreated(null)} />}
      <Toast toast={toast} />
    </>
  );
}

function InviteForm({ roles, onCreated, onError }: { roles: Role[]; onCreated: (i: CreatedInvite) => void; onError: (t: string) => void }) {
  const tAll = useT();
  const t = tAll.settings.team;
  const [state, action] = useFormState(inviteMember, { status: "idle" });
  const [formKey, setFormKey] = useState(0);
  const handled = useRef<InviteState>(state);
  const errors = state.status === "error" ? state.fieldErrors ?? {} : {};

  useEffect(() => {
    // React to each server response once, however often the parent re-renders.
    if (handled.current === state) return;
    handled.current = state;
    if (state.status === "created") {
      onCreated(state);
      setFormKey((k) => k + 1); // clear the form for the next invite
    } else if (state.status === "error" && !state.fieldErrors) {
      onError(state.message);
    }
  }, [state, onCreated, onError]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
          <UserPlus className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-sm font-semibold">{t.inviteTitle}</h2>
          <p className="text-xs text-slate-500">{t.inviteHint}</p>
        </div>
      </div>
      <form key={formKey} action={action} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <label className="flex-1">
          <span className="sr-only">{t.email}</span>
          <input
            name="email"
            type="email"
            placeholder={t.emailPh}
            className={`block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
              errors.email ? "border-rose-400 focus:ring-rose-500" : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
            }`}
          />
          {errors.email && <span className="mt-1 block text-xs text-rose-600">{errors.email}</span>}
        </label>
        <label>
          <span className="sr-only">{t.role}</span>
          <select
            name="role"
            defaultValue={roles.includes("ACCOUNTANT") ? "ACCOUNTANT" : roles[0]}
            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 sm:w-40"
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {tAll.common.role[r]}
              </option>
            ))}
          </select>
          {errors.role && <span className="mt-1 block text-xs text-rose-600">{errors.role}</span>}
        </label>
        <InviteButton label={t.createLink} />
      </form>
    </section>
  );
}

function InviteButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-70"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
      {label}
    </button>
  );
}

function InviteLinkDialog({ invite, onClose }: { invite: CreatedInvite; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const tAll = useT();
  const t = tAll.settings.team;
  const url = `${window.location.origin}/invite/${invite.token}`;
  const message =
    t.whatsappMessage(invite.companyName, tAll.common.role[invite.role], invite.email, url);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-link-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="invite-link-title" className="text-base font-semibold">
              {t.linkTitle(invite.email)}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {t.linkHint(tAll.common.role[invite.role])}
            </p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label={tAll.common.close}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <input
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            aria-label={t.linkAria}
            className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700"
          />
          <button
            onClick={copy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            {copied ? t.copied : t.copy}
          </button>
        </div>

        <a
          href={`https://wa.me/?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:brightness-95"
        >
          <MessageCircle className="h-4 w-4" />
          {t.whatsapp}
        </a>
      </div>
    </div>
  );
}
