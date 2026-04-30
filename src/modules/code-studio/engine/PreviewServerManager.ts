/**
 * PreviewServerManager — captures the `server-ready` URL emitted by the
 * WebContainer, exposes it to listeners, and supports waitForReady / reconnect.
 */
import { webContainerEngine } from "./WebContainerEngine";

export interface ServerInfo {
  url: string;
  port: number;
  ready: boolean;
}

type ServerReadyListener = (info: ServerInfo) => void;
type ServerErrorListener = (error: Error) => void;

export class PreviewServerManager {
  private currentUrl: string | null = null;
  private port: number | null = null;
  private isReady = false;
  private readonly readyListeners: ServerReadyListener[] = [];
  private readonly errorListeners: ServerErrorListener[] = [];
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT = 3;
  private detach: (() => void) | null = null;

  async start(): Promise<string> {
    this.attach();
    const url = await webContainerEngine.startDevServer();
    this.handleServerReady(url);
    return url;
  }

  getUrl(): string | null {
    return this.currentUrl;
  }

  getServerInfo(): ServerInfo | null {
    if (!this.currentUrl || this.port === null) return null;
    return { url: this.currentUrl, port: this.port, ready: this.isReady };
  }

  async ping(): Promise<boolean> {
    if (!this.currentUrl) return false;
    try {
      const res = await fetch(this.currentUrl, {
        method: "HEAD",
        mode: "no-cors",
      });
      return res.ok || res.type === "opaque";
    } catch {
      return false;
    }
  }

  async waitForReady(timeout = 60_000): Promise<string> {
    if (this.currentUrl && this.isReady) return this.currentUrl;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        off();
        reject(
          new Error(`Preview server did not become ready within ${timeout}ms.`),
        );
      }, timeout);

      const off = this.onReady((info) => {
        clearTimeout(timer);
        off();
        resolve(info.url);
      });
    });
  }

  async reconnect(): Promise<string> {
    if (this.reconnectAttempts >= this.MAX_RECONNECT) {
      throw new Error("Max reconnect attempts reached.");
    }
    this.reconnectAttempts++;
    await webContainerEngine.stopDevServer();
    return this.start();
  }

  reset(): void {
    this.currentUrl = null;
    this.port = null;
    this.isReady = false;
    this.reconnectAttempts = 0;
    if (this.detach) {
      this.detach();
      this.detach = null;
    }
  }

  onReady(listener: ServerReadyListener): () => void {
    this.readyListeners.push(listener);
    return () => {
      const idx = this.readyListeners.indexOf(listener);
      if (idx >= 0) this.readyListeners.splice(idx, 1);
    };
  }

  onError(listener: ServerErrorListener): () => void {
    this.errorListeners.push(listener);
    return () => {
      const idx = this.errorListeners.indexOf(listener);
      if (idx >= 0) this.errorListeners.splice(idx, 1);
    };
  }

  // -----------------------------------------------------------------------

  private attach(): void {
    if (this.detach) return;
    this.detach = webContainerEngine.on({
      onServerReady: (url) => this.handleServerReady(url),
      onError: (err) => this.handleServerError(err),
    });
  }

  private handleServerReady(url: string): void {
    this.currentUrl = url;
    this.port = this.extractPort(url);
    this.isReady = true;
    this.reconnectAttempts = 0;
    const info: ServerInfo = { url, port: this.port, ready: true };
    for (const l of this.readyListeners) {
      try {
        l(info);
      } catch {
        /* noop */
      }
    }
  }

  private handleServerError(error: Error): void {
    this.isReady = false;
    for (const l of this.errorListeners) {
      try {
        l(error);
      } catch {
        /* noop */
      }
    }
  }

  private extractPort(url: string): number {
    try {
      const parsed = new URL(url);
      const port = parsed.port
        ? Number.parseInt(parsed.port, 10)
        : parsed.protocol === "https:"
          ? 443
          : 80;
      return Number.isFinite(port) ? port : 0;
    } catch {
      return 0;
    }
  }
}

export const previewServerManager = new PreviewServerManager();
