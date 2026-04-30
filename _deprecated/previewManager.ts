import type { ProjectFile, StudioProject } from "@/types";
import { eventBus } from "@/services/eventBus";
import { webContainerService } from "@/services/webcontainer";
import {
  filesToStaticFallbackHtml,
  inlineStaticAssets,
} from "@/services/projectArtifacts";

export type PreviewStatus =
  | "idle"
  | "preparing"
  | "booting"
  | "running"
  | "error"
  | "fallback";

export type PreviewSession = {
  id: string;
  projectId: string;
  status: PreviewStatus;
  url?: string;
  mode: "webcontainer" | "static-iframe" | "external-runtime" | "fallback";
  startedAt: number;
  firstPreviewAt?: number;
  generationStartedAt?: number;
  timeToFirstPreviewMs?: number;
  logs: string[];
  errors: string[];
};

export type PreviewState = PreviewSession & {
  staticSrcDoc?: string;
  liveUrl?: string;
  port?: number;
  message?: string;
  staticAt?: number;
  liveAt?: number;
};

type Listener = (state: PreviewState) => void;

const FIRST_PREVIEW_SLA_MS = 60_000;
const FALLBACK_AT_MS = 45_000;

function createIdleState(): PreviewState {
  return {
    id: "preview-idle",
    projectId: "none",
    status: "idle",
    mode: "fallback",
    startedAt: 0,
    logs: [],
    errors: [],
    message: "No active preview",
  };
}

class PreviewManager {
  private state: PreviewState = createIdleState();
  private listeners = new Set<Listener>();
  private fallbackTimer: ReturnType<typeof setTimeout> | null = null;
  private slaTimer: ReturnType<typeof setTimeout> | null = null;
  private objectUrl: string | null = null;

  getState(): PreviewState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  startCycle(
    projectId = `project-${Date.now().toString(36)}`,
    generationStartedAt = Date.now(),
  ) {
    this.clearTimers();
    this.revokeObjectUrl();
    const id = `preview-${generationStartedAt.toString(36)}`;
    this.setState({
      id,
      projectId,
      status: "preparing",
      mode: "fallback",
      startedAt: generationStartedAt,
      generationStartedAt,
      firstPreviewAt: undefined,
      timeToFirstPreviewMs: undefined,
      url: undefined,
      staticSrcDoc: undefined,
      liveUrl: undefined,
      port: undefined,
      staticAt: undefined,
      liveAt: undefined,
      logs: ["Preparing project shell..."],
      errors: [],
      message: "Preparing project shell...",
    });

    this.fallbackTimer = setTimeout(() => {
      if (!this.state.firstPreviewAt) {
        this.setStatic(filesToStaticFallbackHtml([], "Preview fallback"), {
          mode: "fallback",
          message:
            "Static fallback preview opened because live runtime is still booting.",
        });
      }
    }, FALLBACK_AT_MS);

    this.slaTimer = setTimeout(() => {
      if (!this.state.firstPreviewAt) {
        const message = "Preview did not open within 60 seconds.";
        this.setError(message);
        eventBus.emit("previewError", {
          reason: "first-preview-timeout",
          message,
        });
      }
    }, FIRST_PREVIEW_SLA_MS);
  }

  prepareProject(
    project: Pick<StudioProject, "id" | "name" | "files">,
    message = "Mounting files...",
  ) {
    if (this.state.status === "idle" || this.state.projectId !== project.id)
      this.startCycle(project.id);
    this.appendLog(message);
    const flattened = flattenProjectToSrcDoc(project.files, project.name);
    const srcDoc =
      flattened ?? filesToStaticFallbackHtml(project.files, project.name);
    this.setStatic(srcDoc, {
      mode: flattened ? "static-iframe" : "fallback",
      message: "Static preview ready",
    });
  }

  setPreparing(message: string) {
    this.appendLog(message);
    this.setState({ status: "preparing", message });
  }

  setBooting(message = "Starting dev server...") {
    this.appendLog(message);
    this.setState({ status: "booting", message });
  }

  setStatic(
    srcDoc: string,
    options: { mode?: "static-iframe" | "fallback"; message?: string } = {},
  ) {
    if (!srcDoc) return;
    const now = Date.now();
    const firstPreviewAt = this.state.firstPreviewAt ?? now;
    const timingBase =
      this.state.generationStartedAt || this.state.startedAt || firstPreviewAt;
    const url = this.createUrl(srcDoc);
    const mode = options.mode ?? "static-iframe";
    const message =
      options.message ??
      (mode === "fallback"
        ? "Static fallback preview ready"
        : "Static iframe preview ready");
    this.setState({
      status: mode === "fallback" ? "fallback" : "running",
      mode,
      url,
      staticSrcDoc: srcDoc,
      staticAt: this.state.staticAt ?? now,
      firstPreviewAt,
      timeToFirstPreviewMs: Math.max(0, firstPreviewAt - timingBase),
      message,
      logs: appendLimited(this.state.logs, message),
    });
    if (firstPreviewAt === now) {
      this.clearSlaTimer();
      eventBus.emit("staticPreviewShown", {
        ms: this.state.timeToFirstPreviewMs ?? 0,
        mode,
      });
    }
  }

  setLive(
    url: string,
    port?: number,
    mode: "webcontainer" | "external-runtime" = "webcontainer",
  ) {
    const now = Date.now();
    const firstPreviewAt = this.state.firstPreviewAt ?? now;
    const timingBase =
      this.state.generationStartedAt || this.state.startedAt || firstPreviewAt;
    const message =
      mode === "webcontainer"
        ? "Live runtime preview ready"
        : "External runtime preview ready";
    this.clearTimers();
    this.setState({
      status: "running",
      mode,
      url,
      liveUrl: url,
      port,
      liveAt: now,
      firstPreviewAt,
      timeToFirstPreviewMs: Math.max(0, firstPreviewAt - timingBase),
      message,
      logs: appendLimited(this.state.logs, message),
    });
    eventBus.emit("serverReady", {
      url,
      port,
      ms: now - (this.state.generationStartedAt ?? this.state.startedAt ?? now),
    });
  }

  setError(message: string) {
    this.clearTimers();
    this.setState({
      status: "error",
      message,
      errors: appendLimited(this.state.errors, message, 40),
      logs: appendLimited(this.state.logs, `Error: ${message}`),
    });
  }

  appendLog(message: string) {
    this.setState({
      logs: appendLimited(this.state.logs, message),
      message: this.state.message,
    });
  }

  appendError(message: string) {
    this.setState({
      errors: appendLimited(this.state.errors, message, 40),
      logs: appendLimited(this.state.logs, `Error: ${message}`),
    });
  }

  reset() {
    this.clearTimers();
    this.revokeObjectUrl();
    this.state = createIdleState();
    this.notify();
  }

  async ensureFirstPreviewWithin60s(
    project: Pick<StudioProject, "id" | "name" | "files">,
  ): Promise<PreviewSession> {
    if (this.state.status === "idle" || this.state.projectId !== project.id)
      this.startCycle(project.id);
    if (!this.state.firstPreviewAt)
      this.prepareProject(project, "Creating first runnable preview...");
    if (!this.state.firstPreviewAt) {
      const fallback = filesToStaticFallbackHtml(project.files, project.name);
      this.setStatic(fallback, {
        mode: "fallback",
        message: "Fallback preview ready",
      });
    }
    if (!this.state.firstPreviewAt)
      this.setError("Preview did not open within 60 seconds.");
    return this.toSession(this.state);
  }

  private createUrl(srcDoc: string): string | undefined {
    this.revokeObjectUrl();
    if (
      typeof URL === "undefined" ||
      typeof Blob === "undefined" ||
      typeof URL.createObjectURL !== "function"
    )
      return undefined;
    this.objectUrl = URL.createObjectURL(
      new Blob([srcDoc], { type: "text/html" }),
    );
    return this.objectUrl;
  }

  private revokeObjectUrl() {
    if (
      this.objectUrl &&
      typeof URL !== "undefined" &&
      typeof URL.revokeObjectURL === "function"
    )
      URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
  }

  private toSession(state: PreviewState): PreviewSession {
    return {
      id: state.id,
      projectId: state.projectId,
      status: state.status,
      url: state.url,
      mode: state.mode,
      startedAt: state.startedAt,
      firstPreviewAt: state.firstPreviewAt,
      generationStartedAt: state.generationStartedAt,
      timeToFirstPreviewMs: state.timeToFirstPreviewMs,
      logs: state.logs,
      errors: state.errors,
    };
  }

  private setState(patch: Partial<PreviewState>) {
    this.state = { ...this.state, ...patch };
    this.notify();
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.state);
      } catch {
        /* listener errors are isolated */
      }
    });
  }

  private clearTimers() {
    if (this.fallbackTimer) clearTimeout(this.fallbackTimer);
    if (this.slaTimer) clearTimeout(this.slaTimer);
    this.fallbackTimer = null;
    this.slaTimer = null;
  }

  private clearSlaTimer() {
    if (this.slaTimer) clearTimeout(this.slaTimer);
    this.slaTimer = null;
  }
}

function appendLimited(items: string[], next: string, limit = 120): string[] {
  return [...items, next].slice(-limit);
}

export const previewManager = new PreviewManager();

export function flattenProjectToSrcDoc(
  files: ProjectFile[] | undefined,
  projectName = "preview",
): string | null {
  if (!files || files.length === 0) return null;
  const html =
    files.find((file) => file.path.toLowerCase() === "index.html") ??
    files.find((file) => file.path.toLowerCase().endsWith("/index.html")) ??
    files.find((file) => file.path.toLowerCase().endsWith(".html"));
  if (!html) return null;

  const referencesViteEntry =
    /<script[^>]+src=["']\/?src\/main\.(tsx|jsx|ts|js)["']/i.test(html.content);
  const hasInlineBody = hasMeaningfulHtmlBody(html.content);
  if (referencesViteEntry && !hasInlineBody) return null;

  return inlineStaticAssets(html.content, files, projectName);
}

function hasMeaningfulHtmlBody(html: string): boolean {
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
  const cleaned = body
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<div\s+id=["']root["']\s*><\/div>/gi, "")
    .replace(/<div\s+id=["']app["']\s*><\/div>/gi, "")
    .replace(/<!--([\s\S]*?)-->/g, "")
    .replace(/\s+/g, "")
    .trim();
  return cleaned.length > 0;
}

export async function ensureFirstPreviewWithin60s(
  project: Pick<StudioProject, "id" | "name" | "files">,
): Promise<PreviewSession> {
  return previewManager.ensureFirstPreviewWithin60s(project);
}

export async function prewarmWebContainer(): Promise<void> {
  if (!webContainerService.isSupported()) return;
  webContainerService.boot().catch(() => {
    /* prewarm is opportunistic */
  });
}
