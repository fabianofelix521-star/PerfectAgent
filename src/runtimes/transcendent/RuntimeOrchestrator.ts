import type { IRuntime } from "@/runtimes/_nextgen/RuntimeTypes";

const runtimes = new Map<string, IRuntime>();

export class RuntimeOrchestrator {
  static register(runtime: IRuntime): void {
    runtimes.set(runtime.id, runtime);
  }

  static get(id: string): IRuntime | undefined {
    return runtimes.get(id);
  }

  static list(): IRuntime[] {
    return Array.from(runtimes.values());
  }
}
