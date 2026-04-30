/**
 * ProcessManager — thin wrapper that tracks WebContainer processes and
 * exposes a kill-all helper. All real spawning still goes through
 * `WebContainerEngine.spawn()`.
 */
import { webContainerEngine } from "./WebContainerEngine";
import type { SpawnOptions } from "../types";

interface TrackedProcess {
  id: string;
  command: string;
  startedAt: number;
  kill: () => void;
  exit: Promise<number>;
}

let counter = 0;

export class ProcessManager {
  private readonly processes = new Map<string, TrackedProcess>();

  async run(options: SpawnOptions): Promise<TrackedProcess> {
    const { exitCode, process } = await webContainerEngine.spawn(options);
    const id = `p_${Date.now().toString(36)}_${(++counter).toString(36)}`;
    const tracked: TrackedProcess = {
      id,
      command: `${options.command} ${options.args.join(" ")}`.trim(),
      startedAt: Date.now(),
      kill: () => {
        try {
          process.kill();
        } catch {
          /* noop */
        }
      },
      exit: exitCode.finally(() => this.processes.delete(id)),
    };
    this.processes.set(id, tracked);
    return tracked;
  }

  list(): TrackedProcess[] {
    return Array.from(this.processes.values());
  }

  killAll(): void {
    for (const proc of this.processes.values()) proc.kill();
    this.processes.clear();
  }
}

export const processManager = new ProcessManager();
