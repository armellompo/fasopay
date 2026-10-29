"use client";

import { AlertTriangle, Building2, CreditCard, Loader2, Scale } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { useLocale, useT } from "@/components/I18nProvider";
import { useCan } from "@/components/RoleProvider";
import { Toast, useToast } from "@/components/Toast";
import type { CompanyFormValues } from "@/lib/company-schema";
import { formatFcfa } from "@/lib/format";
import { saveCompany, type CompanyFormState } from "@/lib/settings-actions";
import type { Locale } from "@/lib/i18n/config";
import type { StatutoryRates } from "@/lib/types";

interface SettingsViewProps {
  company: CompanyFormValues;
  rates: StatutoryRates | null;
  subscription: { activeEmployees: number; inactiveEmployees: number; pricePerEmployee: number };
}

const CITIES = ["Ouagadougou", "Bobo-Dioulasso", "Koudougou", "Ouahigouya", "Banfora", "Kaya", "Tenkodogo", "Fada N'Gourma"];
const LEGAL_FORMS = ["SARL", "SA", "SAS", "SNC", "GIE", "EI", "Association"];

/** "0.055" → "5,5 %" (fr) or "5.5%" (en) */
function pct(rate: string, locale: Locale): string {
  const n = (Number(rate) * 100).toLocaleString(locale === "fr" ? "fr-FR" : "en-GB", { maximumFractionDigits: 2 });
  return locale === "fr" ? `${n} %` : `${n}%`;
}

export function SettingsView({ company, rates, subscription }: SettingsViewProps) {
  const [state, formAction] = useFormState<CompanyFormState, FormData>(saveCompany, { status: "idle" });
  const [toast, setToast] = useToast();
  const canEdit = useCan("settings.manage");
  const t = useT().settings;
  const locale = useLocale();
  const p = (rate: string) => pct(rate, locale);
  const errors = state.status === "error" ? state.errors ?? {} : {};

  useEffect(() => {
    if (state.status === "saved") setToast({ kind: "success", text: state.message });
    if (state.status === "error") setToast({ kind: "error", text: state.message });
  }, [state, setToast]);

  const monthly = subscription.activeEmployees * subscription.pricePerEmployee;

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-3">
        <form action={formAction} noValidate className="rounded-xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
          <CardHeader icon={Building2} title={t.company.title} subtitle={t.company.subtitle} />
          {/* A disabled fieldset makes every input read-only for roles that can't edit. */}
          <fieldset disabled={!canEdit} className="grid gap-4 p-5 disabled:opacity-80 sm:grid-cols-2">
            <Field label={t.company.name} error={errors.name} className="sm:col-span-2">
              <input name="name" defaultValue={company.name} className={input(errors.name)} />
            </Field>
            <Field label={t.company.legalForm} error={errors.legalForm}>
              <input name="legalForm" defaultValue={company.legalForm ?? ""} list="legal-forms" className={input(errors.legalForm)} />
              <datalist id="legal-forms">{LEGAL_FORMS.map((f) => <option key={f} value={f} />)}</datalist>
            </Field>
            <Field label={t.company.city} error={errors.city}>
              <input name="city" defaultValue={company.city} list="cities" className={input(errors.city)} />
              <datalist id="cities">{CITIES.map((c) => <option key={c} value={c} />)}</datalist>
            </Field>
            <Field label={t.company.address} error={errors.address} className="sm:col-span-2">
              <input name="address" defaultValue={company.address ?? ""} placeholder={t.company.addressPh} className={input(errors.address)} />
            </Field>
            <Field label={t.company.phone} error={errors.phone}>
              <input name="phone" type="tel" defaultValue={company.phone ?? ""} placeholder="+226 25 30 12 34" className={input(errors.phone)} />
            </Field>
            <Field label={t.company.email} error={errors.email}>
              <input name="email" type="email" defaultValue={company.email ?? ""} placeholder="rh@entreprise.bf" className={input(errors.email)} />
            </Field>

            <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:col-span-2">{t.company.registrations}</p>
            <Field label={t.company.ifu} hint={t.company.ifuHint} error={errors.ifu}>
              <input name="ifu" defaultValue={company.ifu ?? ""} className={`${input(errors.ifu)} uppercase`} />
            </Field>
            <Field label={t.company.cnss} hint={t.company.cnssHint} error={errors.cnssEmployerNumber}>
              <input name="cnssEmployerNumber" defaultValue={company.cnssEmployerNumber ?? ""} className={input(errors.cnssEmployerNumber)} />
            </Field>
            <Field label={t.company.rccm} hint={t.company.rccmHint} error={errors.rccm} className="sm:col-span-2">
              <input name="rccm" defaultValue={company.rccm ?? ""} placeholder="BF OUA 2019 B 1234" className={`${input(errors.rccm)} uppercase`} />
            </Field>
          </fieldset>
          <div className="flex justify-end border-t border-slate-200 px-5 py-4">
            {canEdit ? <SaveButton label={t.company.save} /> : <p className="text-sm text-slate-500">{t.company.readOnly}</p>}
          </div>
        </form>

        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <CardHeader icon={CreditCard} title={t.subscription.title} subtitle={t.subscription.subtitle} />
            <div className="space-y-3 p-5 text-sm">
              <Row label={t.subscription.price} value={t.subscription.priceValue(formatFcfa(subscription.pricePerEmployee))} />
              <Row label={t.subscription.active} value={String(subscription.activeEmployees)} />
              {subscription.inactiveEmployees > 0 && (
                <Row label={t.subscription.inactive} value={String(subscription.inactiveEmployees)} muted />
              )}
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="font-medium text-slate-700">{t.subscription.total}</span>
                <span className="text-lg font-semibold tabular-nums text-emerald-700">{formatFcfa(monthly)}</span>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <CardHeader icon={Scale} title={t.rates.title} subtitle={t.rates.subtitle} />
            {rates ? (
              <div className="space-y-4 p-5 text-sm">
                <div className="space-y-2">
                  <Row label={t.rates.cnssEmployee} value={p(rates.cnss_employee_rate)} />
                  <Row label={t.rates.cnssEmployer} value={p(rates.cnss_employer_rate)} />
                  <Row label={t.rates.cnssCeiling} value={t.rates.perMonth(formatFcfa(rates.cnss_ceiling))} />
                  <Row label={t.rates.tpa} value={p(rates.tpa_rate)} />
                  <Row label={t.rates.fsp} value={p(rates.fsp_rate)} />
                  <Row
                    label={t.rates.abatement}
                    value={t.rates.abatementValue(p(rates.iuts_abatement_executive), p(rates.iuts_abatement_non_executive))}
                  />
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{t.rates.bareme}</p>
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-slate-100">
                      {rates.iuts_brackets.map((b, i) => {
                        const from = i === 0 ? 0 : (rates.iuts_brackets[i - 1].up_to ?? 0) + 1;
                        return (
                          <tr key={i}>
                            <td className="py-1.5 tabular-nums text-slate-600">
                              {b.up_to === null ? t.rates.above(formatFcfa(from - 1, false)) : `${formatFcfa(from, false)} – ${formatFcfa(b.up_to, false)}`}
                            </td>
                            <td className="py-1.5 text-right font-medium tabular-nums">{p(b.rate)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{t.rates.family}</p>
                  <p className="text-xs tabular-nums text-slate-600">
                    {Object.entries(rates.iuts_family_reduction)
                      .filter(([n]) => n !== "0")
                      .map(([n, r]) => t.rates.familyValue(n, p(r)))
                      .join(" · ")}
                  </p>
                </div>
                <p className="text-xs text-slate-400">
                  {t.rates.note}
                </p>
              </div>
            ) : (
              <p className="flex items-start gap-2 p-5 text-sm text-amber-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {t.rates.unreachable}
              </p>
            )}
          </section>
        </div>
      </div>

      <Toast toast={toast} />
    </>
  );
}

function CardHeader({ icon: Icon, title, subtitle }: { icon: typeof Building2; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className={`text-right tabular-nums ${muted ? "text-slate-400" : "font-medium text-slate-900"}`}>{value}</span>
    </div>
  );
}

function Field({ label, hint, error, className = "", children }: { label: string; hint?: string; error?: string; className?: string; children: ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {hint && <span className="ml-1 font-normal text-slate-400">· {hint}</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
    </label>
  );
}

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-70"
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {label}
    </button>
  );
}

const input = (error?: string) =>
  `block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
    error ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500" : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
  }`;
