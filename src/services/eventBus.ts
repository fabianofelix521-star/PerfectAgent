/**
 * Lightweight pipeline event bus + timing collector.
 *
 * Components publish structured events with `eventBus.emit(...)`, anyone
 * (e.g. the TimingHUD) can `subscribe(...)`. The collector also tracks the
 * lifecycle of a single "run" (from `generationStarted` to
 * `generationCompleted`) and persists the last 10 runs to localStorage so
 * the user can inspect timings across reloads.
 */

export type PipelineEventName =
  | "generationStarted"
  | "planReady"
  | "actReady"
  | "verifyReady"
  | "filesWritten"
  | "staticPreviewShown"
  | "runtimeBootStarted"
  | "installFinished"
  | "serverReady"
  | "iframeLoaded"
  | "generationCompleted"
  | "previewError";

export interface PipelineEventData {
  name: PipelineEventName;
  ts: number;
  runId?: string;
  payload?: Record<string, unknown>;
}

type Listener = (ev: PipelineEventData) => void;

export interface RunRecord {
  runId: string;
  startedAt: number;
  endedAt?: number;
  status?: "ok" | "error" | "timeout";
  events: PipelineEventData[];
  metrics: {
    tStaticMs?: number;
    tRuntimeMs?: number;
    tIframeMs?: number;
    tTotalMs?: number;
    files?: number;
  };
}

const HISTORY_KEY = "perfectagent.pipeline.history.v1";
const HISTORY_MAX = 10;

class EventBus {
  private listeners = new Set<Listener>();
  private currentRun: RunRecord | null = null;

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  startRun(runId = `run-${Date.now().toString(36)}`): RunRecord {
    this.currentRun = { runId, startedAt: Date.now(), events: [], metrics: {} };
    this.emit("generationStarted", { runId });
    return this.currentRun;
  }

  endRun(status: RunRecord["status"] = "ok", payload?: Record<string, unknown>) {
    if (!this.currentRun) return;
    this.currentRun.endedAt = Date.now();
    this.currentRun.status = status;
    this.currentRun.metrics.tTotalMs = this.currentRun.endedAt - this.currentRun.startedAt;
    this.emit("generationCompleted", { runId: this.currentRun.runId, status, ...payload });
    this.persistRun(this.currentRun);
    this.currentRun = null;
  }

  getCurrentRun(): RunRecord | null { return this.currentRun; }

  emit(name: PipelineEventName, payload: Record<string, unknown> = {}) {
    const ev: PipelineEventData = {
      name,
      ts: Date.now(),
      runId: this.currentRun?.runId ?? (typeof payload.runId === "string" ? payload.runId : undefined),
      payload,
    };
    if (this.currentRun) {
      this.currentRun.events.push(ev);
      const t = ev.ts - this.currentRun.startedAt;
      if (name === "staticPreviewShown") this.currentRun.metrics.tStaticMs = t;
      if (name === "serverReady") this.currentRun.metrics.tRuntimeMs = t;
      if (name === "iframeLoaded") this.currentRun.metrics.tIframeMs = t;
      if (name === "filesWritten" && typeof payload.count === "number") this.currentRun.metrics.files = payload.count;
    }
    this.listeners.forEach((fn) => {
      try { fn(ev); } catch { /* listener errors must not break the bus */ }
    });
  }

  loadHistory(): RunRecord[] {
    if (typeof localStorage === "undefined") return [];
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      return raw ? (JSON.parse(raw) as RunRecord[]) : [];
    } catch {
      return [];
    }
  }

  private persistRun(run: RunRecord) {
    if (typeof localStorage === "undefined") return;
    try {
      const hist = this.loadHistory();
      hist.unshift(run);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(hist.slice(0, HISTORY_MAX)));
    } catch { /* quota or serialization issue — silently ignore */ }
  }
}

export const eventBus = new EventBus();
