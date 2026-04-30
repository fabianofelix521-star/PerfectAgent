import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, X } from "lucide-react";
import { eventBus, type RunRecord, type PipelineEventData } from "@/services/eventBus";

/**
 * Tiny floating dev-mode HUD that shows live timing for the current
 * generation run plus the previous run for comparison. Only shown when
 * `import.meta.env.DEV` is true.
 */
export function TimingHUD() {
  const isDev = typeof import.meta !== "undefined" && (import.meta as any).env?.DEV;
  const [open, setOpen] = useState(true);
  const [run, setRun] = useState<RunRecord | null>(null);
  const [last, setLast] = useState<RunRecord | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!isDev) return;
    const off = eventBus.subscribe((ev: PipelineEventData) => {
      if (ev.name === "generationStarted") {
        setRun(eventBus.getCurrentRun());
      }
      if (ev.name === "generationCompleted") {
        const finished = eventBus.getCurrentRun() ?? run;
        if (finished) setLast(finished);
        setRun(null);
      }
      // force re-render so elapsed timer updates
      setTick((n) => n + 1);
    });
    const id = setInterval(() => setTick((n) => n + 1), 250);
    setLast(eventBus.loadHistory()[0] ?? null);
    return () => { off(); clearInterval(id); };
  }, [isDev, run]);

  if (!isDev || !open) return null;

  const live = eventBus.getCurrentRun() ?? run;
  const elapsed = live ? Date.now() - live.startedAt : 0;

  return (
    <AnimatePresence>
      <motion.div
        key="hud"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        className="fixed bottom-4 right-4 z-[60] w-[260px] rounded-2xl border border-slate-200/80 bg-white/90 p-3 text-[11px] shadow-2xl backdrop-blur"
        data-testid="timing-hud"
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 font-bold text-slate-700">
            <Activity className="h-3.5 w-3.5 text-emerald-600" /> Pipeline Timing
          </div>
          <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700"><X className="h-3 w-3" /></button>
        </div>

        {live ? (
          <Row label="Live (elapsed)" value={fmt(elapsed)} hot />
        ) : (
          <Row label="No active run" value="—" />
        )}
        {live && <Row label="T_static" value={fmt(live.metrics.tStaticMs)} />}
        {live && <Row label="T_runtime" value={fmt(live.metrics.tRuntimeMs)} />}
        {live && <Row label="T_iframe" value={fmt(live.metrics.tIframeMs)} />}
        {live && <Row label="files" value={live.metrics.files != null ? String(live.metrics.files) : "—"} />}

        <div className="my-2 h-px bg-slate-200" />
        <div className="font-bold text-slate-500">Last run</div>
        {last ? (
          <>
            <Row label="status" value={last.status ?? "—"} />
            <Row label="T_total" value={fmt(last.metrics.tTotalMs)} />
            <Row label="T_static" value={fmt(last.metrics.tStaticMs)} />
            <Row label="T_runtime" value={fmt(last.metrics.tRuntimeMs)} />
            <Row label="files" value={last.metrics.files != null ? String(last.metrics.files) : "—"} />
          </>
        ) : (
          <div className="text-slate-400">—</div>
        )}
        <div className="mt-1 text-[10px] text-slate-400">tick {tick}</div>
      </motion.div>
    </AnimatePresence>
  );
}

function Row({ label, value, hot }: { label: string; value: string; hot?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={hot ? "font-mono font-bold text-emerald-700" : "font-mono text-slate-800"}>{value}</span>
    </div>
  );
}

function fmt(ms: number | undefined): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}
