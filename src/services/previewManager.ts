/**
 * Dual-Track Preview Manager
 *
 * Track 1 — INSTANT static preview (< 10s): srcdoc for HTML-only projects
 * Track 2 — LIVE runtime preview (≤ 60s): WebContainer dev server
 *
 * Single source of truth for the preview iframe state.
 */
import type { ProjectFile } from "@/types";
import { eventBus } from "@/services/eventBus";
import { webContainerService } from "@/services/webcontainer";
import type { FileSystemTree } from "@/services/webcontainer";

export type PreviewStatus =
  | "idle"
  | "preparing"
  | "booting"
  | "running"
  | "error"
  | "fallback";

export type PreviewMode =
  | "none"
  | "static-iframe"
  | "webcontainer"
  | "fallback";

export interface PreviewState {
  status: PreviewStatus;
  mode: PreviewMode;
  /** Object URL or live URL for the iframe src */
  url?: string;
  /** Static srcdoc content */
  staticSrcDoc?: string;
  /** Live WebContainer URL */
  liveUrl?: string;
  port?: number;
  /** Timing */
  startedAt: number;
  staticAt?: number;
  liveAt?: number;
  timeToStaticMs?: number;
  timeToLiveMs?: number;
  /** Logs & errors */
  logs: string[];
  errors: string[];
  message?: string;
  projectId?: string;
}

type Listener = (state: PreviewState) => void;

const LIVE_PREVIEW_TIMEOUT_MS = 60_000;
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
  private objectUrl: string | null = null;
  private timeoutHandle: ReturnType<typeof setTimeout> | null = null;

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
    this.clearTimeout();
    this.revokeObjectUrl();
    const now = Date.now();
    this.patch({
      status: "preparing",
      mode: "none",
      url: undefined,
      staticSrcDoc: undefined,
      liveUrl: undefined,
      port: undefined,
      startedAt: now,
      staticAt: undefined,
      liveAt: undefined,
      timeToStaticMs: undefined,
      timeToLiveMs: undefined,
      logs: ["Preparing preview..."],
      errors: [],
      message: "Preparing preview...",
      projectId,
    });
    eventBus.startRun(`run-${now.toString(36)}`);

    // Hard timeout for live preview
    this.timeoutHandle = setTimeout(() => {
      if (this.state.mode !== "webcontainer") {
        this.appendLog("Live preview timeout (60s). Static preview remains.");
        eventBus.endRun("timeout", { reason: "live-preview-timeout" });
      }
    }, LIVE_PREVIEW_TIMEOUT_MS);
  }

  /** Track 1: Set static preview immediately. */
  setStatic(srcDoc: string, message?: string) {
    if (!srcDoc) return;
    const now = Date.now();
    const url = this.createObjectUrl(srcDoc);
    const timeToStaticMs = this.state.staticAt
      ? undefined
      : now - this.state.startedAt;
    this.patch({
      status: "running",
      mode: "static-iframe",
      url,
      staticSrcDoc: srcDoc,
      staticAt: this.state.staticAt ?? now,
      timeToStaticMs: timeToStaticMs ?? this.state.timeToStaticMs,
      message: message ?? "Static preview ready",
      logs: [...this.state.logs, message ?? "Static preview ready"],
    });
    eventBus.emit("staticPreviewShown", { ms: timeToStaticMs });
  }

  /** Track 2: Set live WebContainer preview. */
  setLive(url: string, port?: number) {
    const now = Date.now();
    const timeToLiveMs = now - this.state.startedAt;
    this.clearTimeout();
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
    this.clearTimeout();
    this.patch({
      status: "error",
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
    this.clearTimeout();
    this.revokeObjectUrl();
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

  private createObjectUrl(srcDoc: string): string | undefined {
    this.revokeObjectUrl();
    if (typeof URL === "undefined" || typeof Blob === "undefined") return undefined;
    this.objectUrl = URL.createObjectURL(new Blob([srcDoc], { type: "text/html" }));
    return this.objectUrl;
  }

  private revokeObjectUrl() {
    if (this.objectUrl && typeof URL !== "undefined") {
      try { URL.revokeObjectURL(this.objectUrl); } catch { /* noop */ }
    }
    this.objectUrl = null;
  }

  private clearTimeout() {
    if (this.timeoutHandle) clearTimeout(this.timeoutHandle);
    this.timeoutHandle = null;
  }
}

export const previewManager = new PreviewManager();

/* ---- Static preview helpers ---- */

/**
 * Try to flatten a project into a single HTML srcdoc.
 * Returns null if the project needs a runtime (Vite/React).
 */
export function flattenProjectToSrcDoc(
  files: ProjectFile[],
  projectName = "Preview",
): string | null {
  if (!files.length) return null;
  const html = files.find((f) => f.path === "index.html")
    ?? files.find((f) => f.path.endsWith("/index.html"))
    ?? files.find((f) => f.path.endsWith(".html"));
  if (!html) return null;

  // If it references a Vite entry script, it needs a runtime
  const refsVite = /<script[^>]+src=["']\/?src\/main\.(tsx|jsx|ts|js)["']/i.test(html.content);
  const hasBody = hasMeaningfulBody(html.content);
  if (refsVite && !hasBody) return null;

  return inlineAssets(html.content, files, projectName);
}

function hasMeaningfulBody(html: string): boolean {
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
  const cleaned = body
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<div\s+id=["'](root|app)["']\s*><\/div>/gi, "")
    .replace(/<!--([\s\S]*?)-->/g, "")
    .replace(/\s+/g, "")
    .trim();
  return cleaned.length > 0;
}

function inlineAssets(html: string, files: ProjectFile[], projectName: string): string {
  const styles = files
    .filter((f) => f.path.endsWith(".css"))
    .map((f) => `<style data-src="${esc(f.path)}">${f.content}</style>`)
    .join("\n");
  const scripts = files
    .filter((f) => /\.(mjs|js)$/.test(f.path) && !f.path.endsWith(".min.js"))
    .map((f) => `<script type="module" data-src="${esc(f.path)}">${f.content}<\/script>`)
    .join("\n");

  let doc = html;
  if (!/<html[\s>]/i.test(doc))
    doc = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(projectName)}</title></head><body>${doc}</body></html>`;
  doc = doc.replace(/<\/head>/i, `${styles}\n</head>`);
  doc = doc.replace(/<\/body>/i, `${scripts}\n</body>`);
  return doc;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Build a fallback static HTML for when no index.html exists. */
export function filesToStaticFallbackHtml(files: ProjectFile[], projectName: string): string {
  const list = files.map((f) => `<li>${esc(f.path)}</li>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(projectName)}</title><style>body{margin:0;font-family:system-ui;background:#0f172a;color:#e2e8f0;padding:32px}main{max-width:760px;margin:auto}.badge{display:inline-block;border:1px solid #334155;border-radius:999px;padding:6px 10px;color:#93c5fd;font-size:12px}</style></head><body><main><span class="badge">Static preview</span><h1>${esc(projectName)}</h1><p>Runtime preview is booting. Files mounted:</p><ul>${list}</ul></main></body></html>`;
}

/** Pre-warm WebContainer on page mount. */
export async function prewarmWebContainer(): Promise<void> {
  if (!webContainerService.isSupported()) return;
  webContainerService.boot().catch(() => { /* opportunistic */ });
}

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
