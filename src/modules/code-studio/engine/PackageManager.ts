/**
 * PackageManager — runs `npm install` inside the WebContainer and parses
 * its progress in real time.
 */
import { webContainerEngine } from "./WebContainerEngine";

export interface InstallOptions {
  cwd?: string;
  packageManager?: "npm" | "yarn";
  env?: Record<string, string>;
}

export interface InstallProgress {
  phase: "resolving" | "fetching" | "linking" | "auditing" | "complete";
  progress: number;
  message: string;
}

type ProgressListener = (progress: InstallProgress) => void;
type OutputListener = (line: string) => void;

const PHASE_PROGRESS: Record<InstallProgress["phase"], number> = {
  resolving: 20,
  fetching: 50,
  linking: 80,
  auditing: 95,
  complete: 100,
};

export class PackageManager {
  private readonly progressListeners: ProgressListener[] = [];
  private readonly outputListeners: OutputListener[] = [];

  async install(options: InstallOptions = {}): Promise<void> {
    const pm = options.packageManager ?? "npm";
    const args =
      pm === "yarn"
        ? ["install"]
        : ["install", "--no-audit", "--no-fund", "--loglevel=error"];

    this.emitProgress({
      phase: "resolving",
      progress: 5,
      message: "Starting install…",
    });

    const { exitCode, process } = await webContainerEngine.spawn({
      command: pm,
      args,
      cwd: options.cwd,
      env: options.env,
    });

    process.output
      .pipeTo(
        new WritableStream<string>({
          write: (chunk) => this.consumeOutput(chunk),
        }),
      )
      .catch(() => undefined);

    const code = await exitCode;
    if (code !== 0) {
      throw new Error(`${pm} install exited with code ${code}.`);
    }
    this.emitProgress({
      phase: "complete",
      progress: 100,
      message: "Install complete.",
    });
  }

  async add(packageName: string, isDev = false): Promise<void> {
    const args = ["install", packageName];
    if (isDev) args.push("--save-dev");
    args.push("--no-audit", "--no-fund");

    const { exitCode } = await webContainerEngine.spawn({
      command: "npm",
      args,
    });
    const code = await exitCode;
    if (code !== 0)
      throw new Error(`npm install ${packageName} exited with code ${code}.`);
  }

  async remove(packageName: string): Promise<void> {
    const { exitCode } = await webContainerEngine.spawn({
      command: "npm",
      args: ["uninstall", packageName, "--no-audit", "--no-fund"],
    });
    const code = await exitCode;
    if (code !== 0)
      throw new Error(`npm uninstall ${packageName} exited with code ${code}.`);
  }

  async getDependencies(): Promise<{
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  }> {
    try {
      const raw = await webContainerEngine.readFile("package.json");
      const pkg = JSON.parse(raw) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      return {
        dependencies: pkg.dependencies ?? {},
        devDependencies: pkg.devDependencies ?? {},
      };
    } catch {
      return { dependencies: {}, devDependencies: {} };
    }
  }

  async depsChanged(
    prev: Record<string, string>,
    current: Record<string, string>,
  ): Promise<boolean> {
    const prevKeys = Object.keys(prev);
    const curKeys = Object.keys(current);
    if (prevKeys.length !== curKeys.length) return true;
    for (const key of curKeys) {
      if (prev[key] !== current[key]) return true;
    }
    return false;
  }

  onProgress(listener: ProgressListener): () => void {
    this.progressListeners.push(listener);
    return () => {
      const idx = this.progressListeners.indexOf(listener);
      if (idx >= 0) this.progressListeners.splice(idx, 1);
    };
  }

  onOutput(listener: OutputListener): () => void {
    this.outputListeners.push(listener);
    return () => {
      const idx = this.outputListeners.indexOf(listener);
      if (idx >= 0) this.outputListeners.splice(idx, 1);
    };
  }

  // -----------------------------------------------------------------------

  private consumeOutput(chunk: string): void {
    const lines = chunk.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      this.emitOutput(trimmed);
      const update = this.parseNpmOutput(trimmed);
      if (update?.phase) {
        this.emitProgress({
          phase: update.phase,
          progress: update.progress ?? PHASE_PROGRESS[update.phase],
          message: update.message ?? trimmed,
        });
      }
    }
  }

  private parseNpmOutput(line: string): Partial<InstallProgress> | null {
    const lower = line.toLowerCase();
    if (lower.includes("idealtree") || lower.includes("resolving")) {
      return { phase: "resolving" };
    }
    if (lower.includes("fetch") || lower.includes("downloading")) {
      return { phase: "fetching" };
    }
    if (lower.includes("linking") || lower.includes("building")) {
      return { phase: "linking" };
    }
    if (lower.includes("audit")) {
      return { phase: "auditing" };
    }
    const addedMatch = line.match(/added\s+(\d+)\s+packages?/i);
    if (addedMatch) {
      return { phase: "complete", message: line };
    }
    return null;
  }

  private emitProgress(progress: InstallProgress): void {
    for (const l of this.progressListeners) {
      try {
        l(progress);
      } catch {
        /* noop */
      }
    }
  }

  private emitOutput(line: string): void {
    for (const l of this.outputListeners) {
      try {
        l(line);
      } catch {
        /* noop */
      }
    }
  }
}

export const packageManager = new PackageManager();
