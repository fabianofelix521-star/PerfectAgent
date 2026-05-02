/**
 * WebContainerService — singleton wrapper around @webcontainer/api.
 *
 * Boots once per page session (the SDK enforces a single instance), exposes
 * a high-level API for mounting projects, installing dependencies, starting
 * dev servers, and capturing terminal/preview events.
 *
 * Cross-origin isolation MUST be enabled (Vite is configured with COEP/COOP).
 */
import type {
  FileSystemTree,
  WebContainer,
  WebContainerProcess,
} from "@webcontainer/api";

export interface BootResult {
  ok: boolean;
  error?: string;
  unsupported?: boolean;
}

export interface DevServerResult {
  url: string;
  port: number;
}

export interface PreviewError {
  message: string;
  stack?: string;
  type: "console" | "uncaught" | "unhandledrejection";
  ts: number;
}

export interface WebContainerSupportStatus {
  supported: boolean;
  hasWindow: boolean;
  hasSharedArrayBuffer: boolean;
  crossOriginIsolated: boolean;
  protocol?: string;
  host?: string;
  suggestedLocalUrl?: string;
  sshTunnelCommand?: string;
  requiresSecureOrigin?: boolean;
  inIframe: boolean;
  reason?: string;
}

type LogListener = (chunk: string) => void;
type ErrorListener = (err: PreviewError) => void;
type UrlListener = (url: string, port: number) => void;

class WebContainerServiceImpl {
  private wc: WebContainer | null = null;
  private bootPromise: Promise<BootResult> | null = null;
  private devProcess: WebContainerProcess | null = null;
  private installProcess: WebContainerProcess | null = null;
  private logListeners = new Set<LogListener>();
  private errorListeners = new Set<ErrorListener>();
  private urlListeners = new Set<UrlListener>();
  private currentUrl: string | null = null;
  private currentPort: number | null = null;

  isSupported(): boolean {
    return this.getSupportStatus().supported;
  }

  getSupportStatus(): WebContainerSupportStatus {
    if (typeof window === "undefined") {
      return {
        supported: false,
        hasWindow: false,
        hasSharedArrayBuffer: false,
        crossOriginIsolated: false,
        inIframe: false,
        reason: "WebContainer only runs in the browser.",
      };
    }

    const hasSharedArrayBuffer = typeof SharedArrayBuffer !== "undefined";
    const crossOriginIsolated = window.crossOriginIsolated === true;
    const protocol = window.location.protocol;
    const host = window.location.host;
    const hostname = window.location.hostname;
    const port = window.location.port || (protocol === "https:" ? "443" : "80");
    const isLocalhost =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1";
    const inIframe = window.self !== window.top;
    const supported = hasSharedArrayBuffer && crossOriginIsolated;
    const requiresSecureOrigin = protocol !== "https:" && !isLocalhost;
    const suggestedLocalUrl =
      requiresSecureOrigin && port
        ? `http://localhost:${port}${window.location.pathname}${window.location.search}${window.location.hash}`
        : undefined;
    const sshTunnelCommand =
      requiresSecureOrigin && port && hostname
        ? `ssh -L ${port}:127.0.0.1:${port} usuario@${hostname}`
        : undefined;

    let reason: string | undefined;
    if (!supported) {
      if (inIframe) {
        reason =
          "WebContainer cannot start inside this embedded frame because the top-level page is not cross-origin isolated.";
      } else if (requiresSecureOrigin) {
        reason =
          "WebContainer requires HTTPS or localhost. Em host SSH/LAN, acesse via tunnel local ou sirva HTTPS com COOP/COEP.";
      } else if (!crossOriginIsolated) {
        reason =
          "The page is not cross-origin isolated. Reload from the Vite URL that serves COOP/COEP headers.";
      } else if (!hasSharedArrayBuffer) {
        reason = "SharedArrayBuffer is not available in this browser context.";
      }
    }

    return {
      supported,
      hasWindow: true,
      hasSharedArrayBuffer,
      crossOriginIsolated,
      protocol,
      host,
      suggestedLocalUrl,
      sshTunnelCommand,
      requiresSecureOrigin,
      inIframe,
      reason,
    };
  }

  formatUnsupportedMessage(status = this.getSupportStatus()): string {
    const details = [
      `crossOriginIsolated=${String(status.crossOriginIsolated)}`,
      `SharedArrayBuffer=${String(status.hasSharedArrayBuffer)}`,
      `iframe=${String(status.inIframe)}`,
      status.host ? `host=${status.host}` : undefined,
    ].filter(Boolean);
    return [
      "WebContainer indisponivel: o preview real precisa de cross-origin isolation no navegador.",
      status.reason,
      status.sshTunnelCommand
        ? `Host SSH/LAN detectado: rode '${status.sshTunnelCommand}' na sua maquina e abra ${status.suggestedLocalUrl}.`
        : undefined,
      status.requiresSecureOrigin && !status.sshTunnelCommand
        ? "Alternativa: configure HTTPS no host com COOP/COEP preservados."
        : undefined,
      details.length ? `Diagnostico: ${details.join(", ")}.` : undefined,
    ]
      .filter(Boolean)
      .join(" ");
  }

  async boot(): Promise<BootResult> {
    if (this.wc) return { ok: true };
    if (this.bootPromise) return this.bootPromise;

    const support = this.getSupportStatus();
    if (!support.supported) {
      return {
        ok: false,
        unsupported: true,
        error: this.formatUnsupportedMessage(support),
      };
    }

    this.bootPromise = (async () => {
      try {
        const mod = await import("@webcontainer/api");
        const wc = await mod.WebContainer.boot({
          workdirName: "perfectagent",
          forwardPreviewErrors: true,
        });
        this.wc = wc;
        wc.on("server-ready", (port, url) => {
          this.currentPort = port;
          this.currentUrl = url;
          this.urlListeners.forEach((fn) => fn(url, port));
        });
        wc.on("preview-message", (msg: unknown) => {
          const m = msg as Record<string, unknown>;
          const type = (m.type as string) ?? "console";
          const message = String(
            m.message ?? m.text ?? JSON.stringify(m).slice(0, 500),
          );
          const stack = typeof m.stack === "string" ? m.stack : undefined;
          this.errorListeners.forEach((fn) =>
            fn({
              type:
                type === "PREVIEW_UNCAUGHT_EXCEPTION" || type === "uncaught"
                  ? "uncaught"
                  : type === "PREVIEW_UNHANDLED_REJECTION" ||
                      type === "unhandledrejection"
                    ? "unhandledrejection"
                    : "console",
              message,
              stack,
              ts: Date.now(),
            }),
          );
        });
        wc.on("error", (err: unknown) => {
          const message = (err as Error)?.message ?? String(err);
          this.errorListeners.forEach((fn) =>
            fn({ type: "uncaught", message, ts: Date.now() }),
          );
        });
        return { ok: true };
      } catch (err) {
        const msg = (err as Error).message;
        return { ok: false, error: msg };
      }
    })();

    const result = await this.bootPromise;
    if (!result.ok) this.bootPromise = null;
    return result;
  }

  ensureBooted(): WebContainer {
    if (!this.wc)
      throw new Error("WebContainer not booted. Call boot() first.");
    return this.wc;
  }

  async mount(tree: FileSystemTree): Promise<void> {
    const wc = this.ensureBooted();
    await wc.mount(tree);
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const wc = this.ensureBooted();
    // Ensure parent directory exists.
    const dir = filePath.split("/").slice(0, -1).join("/");
    if (dir) {
      try {
        await wc.fs.mkdir(dir, { recursive: true });
      } catch {
        /* exists */
      }
    }
    await wc.fs.writeFile(filePath, content);
  }

  async readFile(filePath: string): Promise<string> {
    const wc = this.ensureBooted();
    return await wc.fs.readFile(filePath, "utf-8");
  }

  async readDir(dirPath: string): Promise<string[]> {
    const wc = this.ensureBooted();
    return await wc.fs.readdir(dirPath);
  }

  async spawn(cmd: string, args: string[] = []): Promise<WebContainerProcess> {
    const wc = this.ensureBooted();
    const proc = await wc.spawn(cmd, args);
    proc.output
      .pipeTo(
        new WritableStream({
          write: (chunk) => this.logListeners.forEach((fn) => fn(chunk)),
        }),
      )
      .catch(() => {});
    return proc;
  }

  async installDeps(
    packageJson?: string,
  ): Promise<{ success: boolean; exitCode: number; cached?: boolean }> {
    if (this.installProcess) {
      try {
        this.installProcess.kill();
      } catch {
        /* noop */
      }
    }
    this.emit("\n$ npm install\n");
    const proc = await this.spawn("npm", ["install"]);
    this.installProcess = proc;
    const exitCode = await proc.exit;
    this.installProcess = null;
    void packageJson;
    return { success: exitCode === 0, exitCode };
  }

  async startDevServer(script = "dev"): Promise<DevServerResult> {
    if (this.devProcess) {
      try {
        this.devProcess.kill();
      } catch {
        /* noop */
      }
      this.devProcess = null;
      this.currentUrl = null;
    }
    this.emit(`\n$ npm run ${script}\n`);
    const proc = await this.spawn("npm", ["run", script]);
    this.devProcess = proc;

    // Wait for server-ready event (max 60s).
    return await new Promise<DevServerResult>((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(
          new Error(
            "Dev server did not become ready within 60s. Check terminal output.",
          ),
        );
      }, 60_000);
      const handler = (url: string, port: number) => {
        cleanup();
        resolve({ url, port });
      };
      const cleanup = () => {
        clearTimeout(timeout);
        this.urlListeners.delete(handler);
      };
      this.urlListeners.add(handler);
      // If already ready (race), resolve.
      if (this.currentUrl && this.currentPort) {
        cleanup();
        resolve({ url: this.currentUrl, port: this.currentPort });
      }
    });
  }

  stopDevServer(): void {
    if (this.devProcess) {
      try {
        this.devProcess.kill();
      } catch {
        /* noop */
      }
      this.devProcess = null;
      this.currentUrl = null;
      this.currentPort = null;
    }
  }

  getPreviewUrl(): string | null {
    return this.currentUrl;
  }

  onLog(fn: LogListener): () => void {
    this.logListeners.add(fn);
    return () => this.logListeners.delete(fn);
  }
  onPreviewError(fn: ErrorListener): () => void {
    this.errorListeners.add(fn);
    return () => this.errorListeners.delete(fn);
  }
  onUrl(fn: UrlListener): () => void {
    this.urlListeners.add(fn);
    return () => this.urlListeners.delete(fn);
  }

  private emit(chunk: string): void {
    this.logListeners.forEach((fn) => fn(chunk));
  }

  async teardown(): Promise<void> {
    this.stopDevServer();
    this.logListeners.clear();
    this.errorListeners.clear();
    this.urlListeners.clear();
    if (this.wc) {
      try {
        this.wc.teardown();
      } catch {
        /* noop */
      }
      this.wc = null;
    }
    this.bootPromise = null;
  }
}

export const webContainerService = new WebContainerServiceImpl();
export type { FileSystemTree };
