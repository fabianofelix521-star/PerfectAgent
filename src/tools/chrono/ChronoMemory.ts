import type { ChronoExecution } from "@/tools/chrono/ChronoEngine";

export class ChronoMemory {
  private readonly executions = new Map<string, ChronoExecution[]>();

  record(execution: ChronoExecution): void {
    const current = this.executions.get(execution.jobId) ?? [];
    this.executions.set(execution.jobId, [execution, ...current].slice(0, 500));
  }

  get(jobId: string): ChronoExecution[] {
    return [...(this.executions.get(jobId) ?? [])];
  }

  getAll(): Map<string, ChronoExecution[]> {
    return new Map(this.executions);
  }
}
