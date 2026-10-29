"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

export type ToastMessage = { kind: "success" | "error"; text: string };

/** Toast state that clears itself (errors linger longer). */
export function useToast() {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.kind === "error" ? 6000 : 3500);
    return () => clearTimeout(t);
  }, [toast]);
  return [toast, setToast] as const;
}

export function Toast({ toast }: { toast: ToastMessage | null }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 right-6 z-50 flex max-w-sm items-center gap-3 rounded-lg px-4 py-3 text-sm text-white shadow-lg transition-all ${
        toast?.kind === "error" ? "bg-rose-700" : "bg-slate-900"
      } ${toast ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"}`}
    >
      {toast?.kind === "error" ? (
        <AlertTriangle className="h-5 w-5 shrink-0 text-rose-200" />
      ) : (
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
      )}
      {toast?.text}
    </div>
  );
}
