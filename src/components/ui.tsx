import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useState } from "react";
import { cn } from "@/utils/cn";

/* Visual primitives shared across pages — extracted to keep the original look. */

export function WorkspaceShell({
  eyebrow, title, description, action, children,
}: { eyebrow: string; title: string; description: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="chat-surface app-scrollbar fx-fade-in flex h-full min-h-0 flex-col overflow-y-auto rounded-[22px] border border-white/70 p-3 sm:p-5 lg:rounded-[28px] lg:p-7">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">{eyebrow}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl md:text-4xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Surface({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("fx-card rounded-[22px] border border-white/70 bg-white/55 p-3 shadow-[0_18px_50px_rgba(90,105,150,0.10)] backdrop-blur-xl sm:p-4", className)}>
      {children}
    </div>
  );
}

export function HeaderAction({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick?: () => void }) {
  return (
    <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={onClick}
      className="fx-press inline-flex min-h-[36px] items-center gap-2 rounded-full bg-[#17172d] px-3.5 py-2 text-xs font-bold text-white shadow-[0_14px_36px_rgba(23,23,45,0.22)] sm:text-sm">
      <Icon className="h-4 w-4" />{label}
    </motion.button>
  );
}

export function SectionTitle({ icon: Icon, title, desc }: { icon: LucideIcon; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/80 text-slate-900 shadow-sm">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <h2 className="text-sm font-semibold text-slate-950 sm:text-base">{title}</h2>
        <p className="mt-0.5 text-xs font-medium leading-5 text-slate-500">{desc}</p>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone = ["Running", "Conectado", "Installed", "Active", "ready", "success", "ok"].includes(status)
    ? "bg-emerald-100 text-emerald-700"
    : ["Paused", "Pending", "pending", "paused", "warning"].includes(status)
      ? "bg-amber-100 text-amber-700"
      : ["Error", "error", "failed", "Erro"].includes(status)
        ? "bg-rose-100 text-rose-700"
        : "bg-slate-200 text-slate-700";
  return <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider", tone)}>{status}</span>;
}

export function EditableField({
  label, value, onChange, type = "text", placeholder,
}: { label: string; value: string; onChange: (v: string) => void; type?: "text" | "password"; placeholder?: string }) {
  const [shown, setShown] = useState(false);
  const isPwd = type === "password";
  return (
    <label className="block rounded-[14px] border border-white/70 bg-white/65 px-3 py-2 transition focus-within:border-blue-300 focus-within:bg-white">
      <span className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
        {label}
        {isPwd ? (
          <button type="button" onClick={() => setShown((s) => !s)} className="text-slate-400 hover:text-slate-700">
            {shown ? "hide" : "show"}
          </button>
        ) : null}
      </span>
      <input
        type={isPwd && !shown ? "password" : "text"}
        value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-xs font-bold text-slate-800 outline-none sm:text-sm"
      />
    </label>
  );
}

export function SelectControl<T extends string>({
  label, value, onChange, options,
}: { label: string; value: T; onChange: (v: T) => void; options: Array<T | { value: T; label: string }> }) {
  return (
    <label className="block rounded-[14px] border border-white/70 bg-white/65 px-3 py-2 transition focus-within:border-blue-300 focus-within:bg-white">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}
        className="w-full bg-transparent text-xs font-bold text-slate-800 outline-none sm:text-sm">
        {options.map((opt) => {
          const v = typeof opt === "string" ? opt : opt.value;
          const l = typeof opt === "string" ? opt : opt.label;
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
    </label>
  );
}

export function ToggleRow({
  title, desc, active, onToggle,
}: { title: string; desc?: string; active: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="fx-press flex w-full items-center justify-between gap-3 rounded-[16px] border border-white/70 bg-white/65 p-3 text-left">
      <span>
        <span className="block text-xs font-semibold text-slate-950 sm:text-sm">{title}</span>
        {desc ? <span className="mt-0.5 block text-[11px] font-medium leading-4 text-slate-500">{desc}</span> : null}
      </span>
      <span className={cn("relative h-5 w-9 shrink-0 rounded-full transition", active ? "bg-[#17172d]" : "bg-slate-300")}>
        <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition", active ? "left-[18px]" : "left-0.5")} />
      </span>
    </button>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-slate-950/5 px-2 py-0.5 text-[11px] font-bold text-slate-600">{children}</span>;
}

export function Spinner({ size = 14 }: { size?: number }) {
  return (
    <span aria-hidden="true" className="inline-block animate-spin rounded-full border-2 border-slate-300 border-t-[#17172d]"
      style={{ width: size, height: size }} />
  );
}

export function Modal({
  open, onClose, title, children, footer, width = 480,
}: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; width?: number }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur sm:p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        className="glass max-h-[92vh] w-full overflow-hidden rounded-[20px] shadow-2xl"
        style={{ maxWidth: width }} onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-slate-100/60 px-4 py-3 sm:px-5">
          <h3 className="text-sm font-semibold text-slate-950 sm:text-base">{title}</h3>
        </div>
        <div className="app-scrollbar max-h-[68vh] overflow-y-auto p-4 sm:p-5">{children}</div>
        {footer ? <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100/60 bg-slate-50/40 px-4 py-3 sm:px-5">{footer}</div> : null}
      </motion.div>
    </div>
  );
}

export function confirmDialog(message: string): boolean {
  if (typeof window === "undefined") return false;
  return window.confirm(message);
}
