"use client";

import { FileSpreadsheet, Pencil, Plus, Search, UserX, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";

import { useT } from "@/components/I18nProvider";
import { useCan } from "@/components/RoleProvider";
import { Toast, useToast } from "@/components/Toast";
import { PRICE_PER_EMPLOYEE } from "@/lib/billing";
import { setEmployeeActive } from "@/lib/employee-actions";
import type { PAYMENT_METHODS } from "@/lib/employee-schema";
import { formatFcfa, initials } from "@/lib/format";

import { EmployeeForm } from "./EmployeeForm";

export type DbPaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface EmployeeRecord {
  id: string;
  code: string;
  fullName: string;
  role: string;
  department: string;
  baseSalary: number;
  bonuses: number;
  housingAllowance: number;
  transportAllowance: number;
  functionAllowance: number;
  otherAllowance: number;
  dependents: number;
  isExecutive: boolean;
  paymentMethod: DbPaymentMethod;
  mobileMoneyNumber: string | null;
  cnssNumber: string | null;
  active: boolean;
}

export const METHOD_META: Record<DbPaymentMethod, { label: string; dot: string }> = {
  ORANGE_MONEY: { label: "Orange Money", dot: "bg-orange-500" },
  MOOV_MONEY: { label: "Moov Money", dot: "bg-blue-600" },
  WAVE: { label: "Wave", dot: "bg-sky-400" },
  BANK_TRANSFER: { label: "Bank Transfer", dot: "bg-slate-500" },
};

export function grossOf(e: Pick<EmployeeRecord, "baseSalary" | "bonuses" | "housingAllowance" | "transportAllowance" | "functionAllowance" | "otherAllowance">) {
  return e.baseSalary + e.bonuses + e.housingAllowance + e.transportAllowance + e.functionAllowance + e.otherAllowance;
}

/** "+22670112233" → "+226 70 11 22 33" */
function formatPhone(n: string | null): string {
  const m = n?.match(/^\+226(\d{2})(\d{2})(\d{2})(\d{2})$/);
  return m ? `+226 ${m.slice(1).join(" ")}` : n ?? "";
}

type Editing = { mode: "new" } | { mode: "edit"; employee: EmployeeRecord } | null;
const FILTERS = ["Active", "Inactive", "All"] as const;

export function EmployeesView({ employees }: { employees: EmployeeRecord[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Active");
  const [editing, setEditing] = useState<Editing>(null);
  const [toast, setToast] = useToast();
  const [pending, startTransition] = useTransition();
  const canManage = useCan("employees.manage");
  const t = useT();
  const te = t.employees;

  // Close the drawer with Escape.
  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setEditing(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees.filter(
      (e) =>
        (filter === "All" || e.active === (filter === "Active")) &&
        (!q || [e.fullName, e.department, e.role, e.code].some((v) => v.toLowerCase().includes(q))),
    );
  }, [employees, query, filter]);

  const activeCount = employees.filter((e) => e.active).length;
  const monthlyGross = employees.filter((e) => e.active).reduce((s, e) => s + grossOf(e), 0);

  const toggleActive = (e: EmployeeRecord) =>
    startTransition(async () => {
      const res = await setEmployeeActive(e.id, !e.active);
      setToast(
        res.ok
          ? { kind: "success", text: e.active ? te.deactivated(e.fullName) : te.reactivated(e.fullName) }
          : { kind: "error", text: res.message },
      );
    });

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{te.title}</h1>
          <p className="text-sm text-slate-500">
            {te.summary(activeCount, formatFcfa(monthlyGross), formatFcfa(activeCount * PRICE_PER_EMPLOYEE))}
          </p>
        </div>
        {canManage ? (
        <div className="flex flex-col gap-2 sm:flex-row">
        <Link
          href="/employees/import"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <FileSpreadsheet className="h-4 w-4" />
          {t.import.button}
        </Link>
        <button
          onClick={() => setEditing({ mode: "new" })}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          <Plus className="h-4 w-4" />
          {te.add}
        </button>
        </div>
        ) : (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">{t.common.viewOnly}</span>
        )}
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-fit rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1.5 transition ${
                  filter === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {te.filters[f]}
              </button>
            ))}
          </div>
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={te.search}
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 sm:w-80"
            />
          </label>
        </div>

        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <UserX className="h-8 w-8 text-slate-300" />
            <p className="text-sm font-medium text-slate-700">
              {employees.length === 0 ? te.noneYet : te.noMatch}
            </p>
            <p className="text-sm text-slate-500">
              {employees.length === 0 ? te.addFirst : te.tryAgain}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">{te.col.employee}</th>
                  <th className="px-4 py-3">{te.col.department}</th>
                  <th className="px-4 py-3 text-right">{te.col.base}</th>
                  <th className="px-4 py-3 text-right">{te.col.gross}</th>
                  <th className="px-4 py-3 text-center">{te.col.dependents}</th>
                  <th className="px-4 py-3">{te.col.payout}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((e) => (
                  <tr key={e.id} className={`transition-colors hover:bg-slate-50 ${e.active ? "" : "opacity-60"}`}>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
                          {initials(e.fullName)}
                        </span>
                        <div>
                          <p className="font-medium text-slate-900">
                            {e.fullName}
                            {e.isExecutive && (
                              <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-500">
                                {te.executive}
                              </span>
                            )}
                            {!e.active && (
                              <span className="ml-2 rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium uppercase text-rose-600">
                                {te.inactive}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500">
                            {e.code} · {e.role}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{e.department}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-700">
                      {formatFcfa(e.baseSalary, false)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums text-slate-900">
                      {formatFcfa(grossOf(e), false)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center tabular-nums text-slate-700">{e.dependents}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      <span className="inline-flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${METHOD_META[e.paymentMethod].dot}`} />
                        {t.common.methodDb[e.paymentMethod]}
                      </span>
                      {e.mobileMoneyNumber && (
                        <p className="pl-4 text-xs tabular-nums text-slate-500">{formatPhone(e.mobileMoneyNumber)}</p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {canManage && (
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setEditing({ mode: "edit", employee: e })}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          {t.common.edit}
                        </button>
                        <button
                          onClick={() => toggleActive(e)}
                          disabled={pending}
                          className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
                        >
                          {e.active ? te.deactivate : te.reactivate}
                        </button>
                      </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Drawer */}
      <div
        aria-hidden={!editing}
        onClick={() => setEditing(null)}
        className={`fixed inset-0 z-40 bg-slate-900/40 transition-opacity ${editing ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={editing?.mode === "edit" ? te.editTitle(editing.employee.fullName) : te.add}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-white shadow-xl transition-transform ${
          editing ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-6">
          <h2 className="text-base font-semibold">
            {editing?.mode === "edit" ? te.editTitle(editing.employee.fullName) : te.add}
          </h2>
          <button onClick={() => setEditing(null)} className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label={t.common.close}>
            <X className="h-5 w-5" />
          </button>
        </div>
        {editing && (
          <EmployeeForm
            // Remount per employee so the form starts from that record.
            key={editing.mode === "edit" ? editing.employee.id : "new"}
            employee={editing.mode === "edit" ? editing.employee : null}
            onCancel={() => setEditing(null)}
            onSaved={(text) => {
              setEditing(null);
              setToast({ kind: "success", text });
            }}
          />
        )}
      </aside>

      <Toast toast={toast} />
    </>
  );
}
