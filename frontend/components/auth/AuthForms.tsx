"use client";

import { Loader2 } from "lucide-react";

import { useT } from "@/components/I18nProvider";
import { useFormState, useFormStatus } from "react-dom";

import { acceptInvite, addCompany, login, signup, signupWithInvite, type AuthFormState } from "@/lib/auth/actions";

import { AuthField, authInput } from "./AuthCard";

const CITIES = ["Ouagadougou", "Bobo-Dioulasso", "Koudougou", "Ouahigouya", "Banfora", "Kaya", "Tenkodogo", "Fada N'Gourma"];

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-70"
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {label}
    </button>
  );
}

function FormError({ state }: { state: AuthFormState }) {
  return state.error ? (
    <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
      {state.error}
    </p>
  ) : null;
}

function CityField({ error }: { error?: string }) {
  const t = useT().auth;
  return (
    <AuthField label={t.city} error={error}>
      <input name="city" list="bf-cities" defaultValue="Ouagadougou" required className={authInput(error)} />
      <datalist id="bf-cities">{CITIES.map((c) => <option key={c} value={c} />)}</datalist>
    </AuthField>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const t = useT().auth;
  const [state, action] = useFormState(login, {});
  return (
    <form action={action} className="space-y-4">
      <FormError state={state} />
      <input type="hidden" name="next" value={next ?? "/"} />
      <AuthField label={t.email}>
        <input name="email" type="email" autoComplete="email" required autoFocus className={authInput()} />
      </AuthField>
      <AuthField label={t.password}>
        <input name="password" type="password" autoComplete="current-password" required className={authInput()} />
      </AuthField>
      <Submit label={t.login.submit} />
    </form>
  );
}

export function SignupForm() {
  const t = useT().auth;
  const [state, action] = useFormState(signup, {});
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError state={state} />
      <AuthField label={t.fullName} error={e.name}>
        <input name="name" autoComplete="name" required autoFocus className={authInput(e.name)} />
      </AuthField>
      <AuthField label={t.workEmail} error={e.email}>
        <input name="email" type="email" autoComplete="email" required className={authInput(e.email)} />
      </AuthField>
      <AuthField label={t.password} error={e.password}>
        <input name="password" type="password" autoComplete="new-password" minLength={8} required className={authInput(e.password)} />
      </AuthField>
      <div className="border-t border-slate-100 pt-4" />
      <AuthField label={t.companyName} error={e.companyName}>
        <input name="companyName" autoComplete="organization" required className={authInput(e.companyName)} />
      </AuthField>
      <CityField error={e.city} />
      <Submit label={t.signup.submit} />
      <p className="text-center text-xs text-slate-400">{t.signup.pricing}</p>
    </form>
  );
}

export function AddCompanyForm() {
  const t = useT().auth;
  const [state, action] = useFormState(addCompany, {});
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError state={state} />
      <AuthField label={t.companyName} error={e.name}>
        <input name="name" autoComplete="organization" required autoFocus className={authInput(e.name)} />
      </AuthField>
      <CityField error={e.city} />
      <Submit label={t.newCompany.submit} />
    </form>
  );
}

export function InviteSignupForm({ token, email }: { token: string; email: string }) {
  const t = useT().auth;
  const [state, action] = useFormState(signupWithInvite, {});
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError state={state} />
      <input type="hidden" name="token" value={token} />
      <AuthField label={t.email}>
        <input value={email} readOnly className={`${authInput()} bg-slate-50 text-slate-500`} />
      </AuthField>
      <AuthField label={t.fullName} error={e.name}>
        <input name="name" autoComplete="name" required autoFocus className={authInput(e.name)} />
      </AuthField>
      <AuthField label={t.choosePassword} error={e.password}>
        <input name="password" type="password" autoComplete="new-password" minLength={8} required className={authInput(e.password)} />
      </AuthField>
      <Submit label={t.invite.signupSubmit} />
    </form>
  );
}

export function AcceptInviteForm({ token }: { token: string }) {
  const t = useT().auth;
  // acceptInvite takes FormData only; adapt it to useFormState's (prev, form) signature.
  const [state, action] = useFormState((_: AuthFormState, form: FormData) => acceptInvite(form), {});
  return (
    <form action={action} className="space-y-4">
      <FormError state={state} />
      <input type="hidden" name="token" value={token} />
      <Submit label={t.invite.accept} />
    </form>
  );
}
