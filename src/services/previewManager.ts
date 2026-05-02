/**
 * WebContainer Preview Manager
 *
 * Single source of truth for the live preview iframe state. Code Studio
 * previews are served only from the WebContainer `server-ready` URL.
 */
import type { ProjectFile } from "@/types";
import { eventBus } from "@/services/eventBus";
import type { FileSystemTree } from "@/services/webcontainer";

export type PreviewStatus =
  | "idle"
  | "preparing"
  | "booting"
  | "running"
  | "error";

export type PreviewMode =
  | "none"
  | "webcontainer";

export interface PreviewState {
  status: PreviewStatus;
  mode: PreviewMode;
  /** Live WebContainer URL for the iframe src */
  url?: string;
  /** Live WebContainer URL */
  liveUrl?: string;
  port?: number;
  /** Timing */
  startedAt: number;
  liveAt?: number;
  timeToLiveMs?: number;
  /** Logs & errors */
  logs: string[];
  errors: string[];
  message?: string;
  projectId?: string;
}

type Listener = (state: PreviewState) => void;

const MAX_LOG_LINES = 200;

function createIdle(): PreviewState {
  return {
    status: "idle",
    mode: "none",
    startedAt: 0,
    logs: [],
    errors: [],
    message: "No active preview",
  };
}

class PreviewManager {
  private state: PreviewState = createIdle();
  private listeners = new Set<Listener>();

  /* ---- public API ---- */

  getState(): PreviewState {
    return this.state;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }

  /** Start a new preview cycle (called when user sends a message). */
  startCycle(projectId?: string) {
    const now = Date.now();
    this.patch({
      status: "preparing",
      mode: "none",
      url: undefined,
      liveUrl: undefined,
      port: undefined,
      startedAt: now,
      liveAt: undefined,
      timeToLiveMs: undefined,
      logs: ["Preparing preview..."],
      errors: [],
      message: "Preparing preview...",
      projectId,
    });
    eventBus.startRun(`run-${now.toString(36)}`);
  }

  /** Set live WebContainer preview from the `server-ready` event URL. */
  setLive(url: string, port?: number) {
    const now = Date.now();
    const timeToLiveMs = now - this.state.startedAt;
    this.patch({
      status: "running",
      mode: "webcontainer",
      url,
      liveUrl: url,
      port,
      liveAt: now,
      timeToLiveMs,
      message: "Live preview ready",
      logs: [...this.state.logs, `Live preview ready at ${url}`],
    });
    eventBus.emit("serverReady", { url, port, ms: timeToLiveMs });
    eventBus.endRun("ok", { mode: "webcontainer" });
  }

  setBooting(message?: string) {
    const msg = message ?? "Booting runtime...";
    this.patch({
      status: "booting",
      message: msg,
      logs: [...this.state.logs, msg],
    });
  }

  setError(message: string) {
    this.patch({
      status: "error",
      mode: "none",
      url: undefined,
      liveUrl: undefined,
      port: undefined,
      message,
      errors: [...this.state.errors, message],
      logs: [...this.state.logs, `Error: ${message}`],
    });
    eventBus.endRun("error", { error: message });
  }

  appendLog(message: string) {
    const logs = [...this.state.logs, message].slice(-MAX_LOG_LINES);
    this.patch({ logs });
  }

  appendError(message: string) {
    const errors = [...this.state.errors, message].slice(-MAX_LOG_LINES);
    const logs = [...this.state.logs, `Error: ${message}`].slice(-MAX_LOG_LINES);
    this.patch({ errors, logs });
  }

  reset() {
    this.state = createIdle();
    this.notify();
  }

  /* ---- private ---- */

  private patch(partial: Partial<PreviewState>) {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  private notify() {
    for (const fn of this.listeners) {
      try { fn(this.state); } catch { /* isolate listener errors */ }
    }
  }
}

export const previewManager = new PreviewManager();

/** Convert ProjectFile[] to WebContainer FileSystemTree. */
export function filesToWebContainerTree(files: ProjectFile[]): FileSystemTree {
  const root: FileSystemTree = {};
  for (const f of files) {
    const parts = f.path.split("/").filter(Boolean);
    let cur: FileSystemTree = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const dir = parts[i];
      if (!cur[dir]) cur[dir] = { directory: {} };
      cur = (cur[dir] as { directory: FileSystemTree }).directory;
    }
    cur[parts[parts.length - 1]] = { file: { contents: f.content } };
  }
  return root;
}
