"use client";

import { Calculator, Loader2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFormState, useFormStatus } from "react-dom";

import {
  previewPayslip,
  saveEmployee,
  type EmployeeFormState,
  type PreviewState,
} from "@/lib/employee-actions";
import { useT } from "@/components/I18nProvider";
import { PAYMENT_METHODS, type FieldErrors } from "@/lib/employee-schema";
import { formatFcfa } from "@/lib/format";

import type { DbPaymentMethod, EmployeeRecord } from "./EmployeesView";

// Labels come from the dictionary (employees.form.amounts), keyed by field name.
const AMOUNT_FIELDS = [
  ["baseSalary"],
  ["bonuses"],
  ["housingAllowance"],
  ["transportAllowance"],
  ["functionAllowance"],
  ["otherAllowance"],
] as const;

type AmountField = (typeof AMOUNT_FIELDS)[number][0];

const toNumber = (v: FormDataEntryValue | null) => Number(String(v ?? "").replace(/[\s\u00a0\u202f,]/g, "")) || 0;

interface EmployeeFormProps {
  employee: EmployeeRecord | null;
  onCancel: () => void;
  onSaved: (message: string) => void;
}

export function EmployeeForm({ employee, onCancel, onSaved }: EmployeeFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useFormState<EmployeeFormState, FormData>(
    saveEmployee.bind(null, employee?.id ?? null),
    { status: "idle" },
  );
  const [method, setMethod] = useState<DbPaymentMethod>(employee?.paymentMethod ?? "ORANGE_MONEY");
  const [gross, setGross] = useState(() =>
    employee ? AMOUNT_FIELDS.reduce((s, [f]) => s + employee[f], 0) : 0,
  );
  const [preview, setPreview] = useState<PreviewState>({ status: "idle" });
  const [previewing, setPreviewing] = useState(false);
  const t = useT();
  const f = t.employees.form;

  useEffect(() => {
    if (state.status === "saved") onSaved(state.message);
  }, [state, onSaved]);

  // Field errors come from whichever action ran last (save or preview).
  const errors: FieldErrors =
    (preview.status === "error" && preview.errors) || (state.status === "error" && state.errors) || {};

  const recompute = () => {
    if (!formRef.current) return;
    const data = new FormData(formRef.current);
    setGross(AMOUNT_FIELDS.reduce((s, [f]) => s + toNumber(data.get(f)), 0));
    // Any edit makes an earlier preview stale.
    setPreview((p) => (p.status === "ok" ? { status: "idle" } : p));
  };

  const runPreview = async () => {
    if (!formRef.current) return;
    setPreviewing(true);
    setPreview(await previewPayslip(new FormData(formRef.current)));
    setPreviewing(false);
  };

  return (
    <form ref={formRef} action={formAction} onInput={recompute} className="flex min-h-0 flex-1 flex-col" noValidate>
      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
        {state.status === "error" && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.message}</p>
        )}

        <Fieldset title={f.identity}>
          <Field label={f.fullName} name="fullName" error={errors.fullName} className="sm:col-span-2">
            <input name="fullName" defaultValue={employee?.fullName} placeholder={f.fullNamePh} className={input(errors.fullName)} />
          </Field>
          <Field label={f.role} name="role" error={errors.role}>
            <input name="role" defaultValue={employee?.role} placeholder={f.rolePh} className={input(errors.role)} />
          </Field>
          <Field label={f.department} name="department" error={errors.department}>
            <input
              name="department"
              defaultValue={employee?.department}
              list="departments"
              placeholder={f.departmentPh}
              className={input(errors.department)}
            />
            <datalist id="departments">
              {["Direction", "Finance", "Opérations", "Transport", "Commercial", "Ressources Humaines"].map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </Field>
          <Field label={f.cnssNumber} name="cnssNumber" error={errors.cnssNumber}>
            <input
              name="cnssNumber"
              defaultValue={employee?.cnssNumber ?? ""}
              placeholder={f.cnssNumberPh}
              className={`${input(errors.cnssNumber)} uppercase`}
            />
          </Field>
        </Fieldset>

        <Fieldset title={f.pay}>
          {AMOUNT_FIELDS.map(([name]) => (
            <Field key={name} label={f.amounts[name]} name={name} error={errors[name as AmountField]}>
              <input
                name={name}
                inputMode="numeric"
                defaultValue={employee ? employee[name] : name === "baseSalary" ? "" : 0}
                className={`${input(errors[name as AmountField])} text-right tabular-nums`}
              />
            </Field>
          ))}
          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm sm:col-span-2">
            <span className="text-slate-500">{f.monthlyGross}</span>
            <span className="font-semibold tabular-nums">{formatFcfa(gross)}</span>
          </div>
          <Field label={f.dependents} name="dependents" error={errors.dependents}>
            <input
              name="dependents"
              type="number"
              min={0}
              max={20}
              defaultValue={employee?.dependents ?? 0}
              className={input(errors.dependents)}
            />
          </Field>
          <label className="flex items-center gap-3 self-end rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <input
              type="checkbox"
              name="isExecutive"
              defaultChecked={employee?.isExecutive}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>
              {f.executive} <span className="text-slate-500">{f.executiveHint}</span>
            </span>
          </label>
        </Fieldset>

        <Fieldset title={f.payout}>
          <Field label={f.method} name="paymentMethod" error={errors.paymentMethod}>
            <select
              name="paymentMethod"
              value={method}
              onChange={(e) => setMethod(e.target.value as DbPaymentMethod)}
              className={input(errors.paymentMethod)}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {t.common.methodDb[m]}
                </option>
              ))}
            </select>
          </Field>
          {method !== "BANK_TRANSFER" && (
            <Field label={f.number(t.common.methodDb[method])} name="mobileMoneyNumber" error={errors.mobileMoneyNumber}>
              <input
                name="mobileMoneyNumber"
                type="tel"
                defaultValue={employee?.mobileMoneyNumber ?? ""}
                placeholder="+226 70 11 22 33"
                className={input(errors.mobileMoneyNumber)}
              />
            </Field>
          )}
        </Fieldset>

        <PreviewPanel preview={preview} previewing={previewing} onPreview={runPreview} />
      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 bg-white px-6 py-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          {t.common.cancel}
        </button>
        <SubmitButton label={employee ? f.save : f.create} />
      </div>
    </form>
  );
}

function PreviewPanel({ preview, previewing, onPreview }: { preview: PreviewState; previewing: boolean; onPreview: () => void }) {
  const p = useT().employees.preview;
  const r = preview.status === "ok" ? preview.result : null;
  return (
    <section className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{p.title}</h3>
          <p className="text-xs text-slate-500">{p.hint}</p>
        </div>
        <button
          type="button"
          onClick={onPreview}
          disabled={previewing}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-emerald-700 ring-1 ring-inset ring-emerald-300 hover:bg-emerald-50 disabled:opacity-60"
        >
          {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
          {p.button}
        </button>
      </div>

      {preview.status === "error" && <p className="mt-3 text-sm text-rose-700">{preview.message}</p>}

      {r && (
        <dl className="mt-4 space-y-1.5 text-sm">
          <Line label={p.gross} value={r.gross_salary} strong />
          <Line label={p.cnss(formatFcfa(r.cnss_base, false))} value={-r.employee_deductions.cnss} />
          <Line label={p.iuts(formatFcfa(r.iuts_detail.taxable_base, false))} value={-r.employee_deductions.iuts} />
          <Line label={p.fsp} value={-r.employee_deductions.fsp} />
          <div className="my-2 border-t border-emerald-200" />
          <Line label={p.net} value={r.net_salary} strong accent />
          <div className="my-2 border-t border-emerald-200" />
          <Line label={p.employerCnss} value={r.employer_liabilities.cnss} muted />
          <Line label={p.tpa} value={r.employer_liabilities.tpa} muted />
          <Line label={p.total} value={r.total_employer_cost} strong />
        </dl>
      )}
    </section>
  );
}

function Line({ label, value, strong, accent, muted }: { label: string; value: number; strong?: boolean; accent?: boolean; muted?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className={muted ? "text-slate-500" : "text-slate-600"}>{label}</dt>
      <dd
        className={`tabular-nums ${strong ? "font-semibold" : ""} ${accent ? "text-emerald-700" : value < 0 ? "text-rose-600" : "text-slate-900"}`}
      >
        {value < 0 ? "−" : ""}
        {formatFcfa(Math.abs(value))}
      </dd>
    </div>
  );
}

function SubmitButton({ label }: { label: string }) {
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

function Fieldset({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</legend>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Field({ label, error, className = "", children }: { label: string; name: string; error?: string; className?: string; children: ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
    </label>
  );
}

const input = (error?: string) =>
  `block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
    error ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500" : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
  }`;
