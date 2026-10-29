import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  footnote?: ReactNode;
  tone?: "emerald" | "slate" | "amber";
}

const TONES: Record<NonNullable<StatCardProps["tone"]>, string> = {
  emerald: "bg-emerald-50 text-emerald-600",
  slate: "bg-slate-100 text-slate-600",
  amber: "bg-amber-50 text-amber-600",
};

export function StatCard({ label, value, icon: Icon, footnote, tone = "slate" }: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${TONES[tone]}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</div>
      {footnote && <div className="mt-2 text-xs text-slate-500">{footnote}</div>}
    </div>
  );
}
