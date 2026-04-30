import { create } from "zustand";
import { useEffect } from "react";

export type ToastKind = "success" | "error" | "info";
export interface Toast { id: string; kind: ToastKind; text: string; ttl: number }

interface ToastState {
  toasts: Toast[];
  push: (kind: ToastKind, text: string, ttl?: number) => void;
  dismiss: (id: string) => void;
}

export const useToast = create<ToastState>((set) => ({
  toasts: [],
  push: (kind, text, ttl = 4000) => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    set((s) => ({ toasts: [...s.toasts, { id, kind, text, ttl }] }));
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (text: string) => useToast.getState().push("success", text),
  error:   (text: string) => useToast.getState().push("error", text, 6000),
  info:    (text: string) => useToast.getState().push("info", text),
};

export function ToastViewport() {
  const toasts = useToast((s) => s.toasts);
  const dismiss = useToast((s) => s.dismiss);

  useEffect(() => {
    const timers = toasts.map((t) => window.setTimeout(() => dismiss(t.id), t.ttl));
    return () => { timers.forEach((id) => window.clearTimeout(id)); };
  }, [toasts, dismiss]);

  return (
    <div className="pointer-events-none fixed right-6 top-6 z-[100] flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={
            "pointer-events-auto rounded-2xl border px-4 py-3 text-sm font-semibold shadow-lg backdrop-blur " +
            (t.kind === "success"
              ? "border-emerald-200 bg-emerald-50/95 text-emerald-800"
              : t.kind === "error"
                ? "border-rose-200 bg-rose-50/95 text-rose-800"
                : "border-slate-200 bg-white/95 text-slate-800")
          }
          onClick={() => dismiss(t.id)}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
