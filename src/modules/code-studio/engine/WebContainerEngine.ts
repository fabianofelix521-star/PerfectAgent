/**
 * WebContainerEngine — singleton wrapper around the StackBlitz WebContainer.
 *
 * CRITICAL: `WebContainer.boot()` may only be called once per page load.
 * This singleton enforces that and exposes the high-level lifecycle:
 *
 *   init()              → boot the container (idempotent)
 *   mountFiles(...)     → write the project tree
 *   spawn(...)          → run arbitrary processes
 *   startDevServer()    → npm run dev + wait for `server-ready` URL
 *   writeFile(...)      → mutate a single file (Vite picks it up via HMR)
 *   teardown()          → release the container
 */
import { WebContainer } from "@webcontainer/api";
import type {
  EngineEvents,
  EngineState,
  ProcessOutput,
  SpawnOptions,
  WebContainerFileEntry,
  WebContainerFileSystem,
} from "../types";

type AnyProcess = Awaited<ReturnType<WebContainer["spawn"]>>;

class WebContainerEngineImpl {
  private static instance: WebContainerEngineImpl | null = null;

  private container: WebContainer | null = null;
  private bootPromise: Promise<void> | null = null;
  private serverProcess: AnyProcess | null = null;
  private readonly listeners: Array<Partial<EngineEvents>> = [];
  private readonly activeProcesses = new Map<string, AnyProcess>();
  private state: EngineState = {
    status: "idle",
    previewUrl: null,
    error: null,
    bootProgress: 0,
  };

  private constructor() {}

  static getInstance(): WebContainerEngineImpl {
    if (!WebContainerEngineImpl.instance) {
      WebContainerEngineImpl.instance = new WebContainerEngineImpl();
    }
    return WebContainerEngineImpl.instance;
  }

  on(events: Partial<EngineEvents>): () => void {
    this.listeners.push(events);
    return () => {
      const idx = this.listeners.indexOf(events);
      if (idx >= 0) this.listeners.splice(idx, 1);
    };
  }

  getState(): EngineState {
    return { ...this.state };
  }

  getContainer(): WebContainer | null {
    return this.container;
  }

  async init(): Promise<void> {
    if (this.container) return;
    if (this.bootPromise) return this.bootPromise;

    this.setState({ status: "booting", bootProgress: 5, error: null });

    this.bootPromise = (async () => {
      try {
        this.setState({ bootProgress: 25 });
        const container = await WebContainer.boot();
        this.container = container;

        container.on("server-ready", (_port, url) => {
          this.setState({
            status: "running",
            previewUrl: url,
            bootProgress: 100,
          });
          this.emit("onServerReady", url);
        });

        container.on("error", (err) => {
          const error =
            err instanceof Error
              ? err
              : new Error(String((err as { message?: string }).message ?? err));
          this.setState({ status: "error", error: error.message });
          this.emit("onError", error);
        });

        this.setState({ status: "ready", bootProgress: 100 });
        this.emit("onBoot");
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        this.setState({
          status: "error",
          error: error.message,
          bootProgress: 0,
        });
        this.emit("onError", error);
        throw error;
      } finally {
        this.bootPromise = null;
      }
    })();

    return this.bootPromise;
  }

  async mountFiles(
    files: Array<{ path: string; content: string }>,
  ): Promise<void> {
    const container = await this.requireContainer();
    const tree = this.buildFileSystemTree(files);
    await container.mount(tree);
  }

  async writeFile(path: string, content: string): Promise<void> {
    const container = await this.requireContainer();
    const normalized = this.normalizePath(path);
    await this.ensureParentDir(normalized);
    await container.fs.writeFile(normalized, content);
    this.emit("onFileChange", normalized);
  }

  async readFile(path: string): Promise<string> {
    const container = await this.requireContainer();
    return container.fs.readFile(this.normalizePath(path), "utf-8");
  }

  async deleteFile(path: string): Promise<void> {
    const container = await this.requireContainer();
    await container.fs.rm(this.normalizePath(path), { force: true });
    this.emit("onFileChange", path);
  }

  async mkdir(path: string): Promise<void> {
    const container = await this.requireContainer();
    await container.fs.mkdir(this.normalizePath(path), { recursive: true });
  }

  async readdir(path: string): Promise<string[]> {
    const container = await this.requireContainer();
    return container.fs.readdir(this.normalizePath(path));
  }

  async spawn(
    options: SpawnOptions,
  ): Promise<{ exitCode: Promise<number>; process: AnyProcess }> {
    const container = await this.requireContainer();
    const proc = await container.spawn(options.command, options.args, {
      cwd: options.cwd,
      env: options.env,
    });

    const id = `${options.command}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.activeProcesses.set(id, proc);

    proc.output
      .pipeTo(
        new WritableStream<string>({
          write: (data) => {
            const output: ProcessOutput = {
              type: "stdout",
              data,
              timestamp: Date.now(),
            };
            this.emit("onProcessOutput", output);
          },
        }),
      )
      .catch(() => {
        // stream closed
      });

    const exitCode = proc.exit.then((code) => {
      this.activeProcesses.delete(id);
      return code;
    });

    return { exitCode, process: proc };
  }

  async startDevServer(): Promise<string> {
    if (this.serverProcess) {
      // Already running — return existing URL if present.
      if (this.state.previewUrl) return this.state.previewUrl;
    }

    this.setState({ status: "building", error: null });
    const { process: proc } = await this.spawn({
      command: "npm",
      args: ["run", "dev"],
    });
    this.serverProcess = proc;

    return new Promise((resolve, reject) => {
      const off = this.on({
        onServerReady: (url) => {
          off();
          resolve(url);
        },
        onError: (err) => {
          off();
          reject(err);
        },
      });

      // Safety timeout
      const timer = setTimeout(() => {
        off();
        reject(new Error("Dev server failed to become ready within 60s."));
      }, 60_000);

      proc.exit.then((code) => {
        clearTimeout(timer);
        if (code !== 0) {
          reject(new Error(`Dev server exited with code ${code}.`));
        }
      });
    });
  }

  async stopDevServer(): Promise<void> {
    if (!this.serverProcess) return;
    try {
      this.serverProcess.kill();
    } catch {
      // ignore
    }
    this.serverProcess = null;
    this.setState({ status: "ready", previewUrl: null });
  }

  async teardown(): Promise<void> {
    await this.stopDevServer();
    for (const proc of this.activeProcesses.values()) {
      try {
        proc.kill();
      } catch {
        /* noop */
      }
    }
    this.activeProcesses.clear();
    if (this.container) {
      try {
        this.container.teardown();
      } catch {
        /* noop */
      }
      this.container = null;
    }
    this.setState({
      status: "idle",
      previewUrl: null,
      error: null,
      bootProgress: 0,
    });
  }

  // -----------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------

  private async requireContainer(): Promise<WebContainer> {
    if (!this.container) {
      await this.init();
    }
    if (!this.container) throw new Error("WebContainer is not initialized.");
    return this.container;
  }

  private normalizePath(path: string): string {
    let p = path.replace(/\\/g, "/");
    if (p.startsWith("./")) p = p.slice(2);
    if (p.startsWith("/")) p = p.slice(1);
    return p;
  }

  private async ensureParentDir(path: string): Promise<void> {
    const idx = path.lastIndexOf("/");
    if (idx <= 0) return;
    const dir = path.slice(0, idx);
    try {
      await this.mkdir(dir);
    } catch {
      // already exists
    }
  }

  private buildFileSystemTree(
    files: Array<{ path: string; content: string }>,
  ): WebContainerFileSystem {
    const root: WebContainerFileSystem = {};

    for (const { path, content } of files) {
      const normalized = this.normalizePath(path);
      const segments = normalized.split("/").filter(Boolean);
      if (segments.length === 0) continue;

      let cursor = root;
      for (let i = 0; i < segments.length - 1; i++) {
        const seg = segments[i];
        const existing = cursor[seg];
        if (!existing || !("directory" in existing)) {
          const dir: WebContainerFileEntry = { directory: {} };
          cursor[seg] = dir;
          cursor = dir.directory as WebContainerFileSystem;
        } else {
          cursor = existing.directory as WebContainerFileSystem;
        }
      }
      const filename = segments[segments.length - 1];
      cursor[filename] = { file: { contents: content } };
    }

    return root;
  }

  private setState(partial: Partial<EngineState>): void {
    this.state = { ...this.state, ...partial };
  }

  private emit<K extends keyof EngineEvents>(
    event: K,
    ...args: Parameters<EngineEvents[K]>
  ): void {
    for (const listener of this.listeners) {
      const handler = listener[event] as
        | ((...a: unknown[]) => void)
        | undefined;
      if (handler) {
        try {
          handler(...(args as unknown[]));
        } catch {
          // listener errors are swallowed
        }
      }
    }
  }
}

export type WebContainerEngine = WebContainerEngineImpl;
export const webContainerEngine = WebContainerEngineImpl.getInstance();
