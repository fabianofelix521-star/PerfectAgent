import type { HealthStatus, RuntimeLoopSnapshot } from "@/runtimes/_nextgen/RuntimeTypes";

type LoopTask = () => Promise<void>;

export class SafeRuntimeLoop {
  private readonly timers: Array<ReturnType<typeof setInterval>> = [];
  private failureCount = 0;
  private lastRunAt: number | undefined;
  private lastError: string | undefined;

  schedule(intervalMs: number, task: LoopTask): void {
    const timer = setInterval(() => {
      void task()
        .then(() => {
          this.lastRunAt = Date.now();
        })
        .catch((error) => {
          this.failureCount += 1;
          this.lastRunAt = Date.now();
          this.lastError = error instanceof Error ? error.message : String(error);
        });
    }, intervalMs);
    this.timers.push(timer);
  }

  stopAll(): void {
    for (const timer of this.timers) clearInterval(timer);
    this.timers.length = 0;
  }

  snapshot(started: boolean): RuntimeLoopSnapshot {
    return {
      started,
      loopCount: this.timers.length,
      failureCount: this.failureCount,
      lastRunAt: this.lastRunAt,
      lastError: this.lastError,
    };
  }

  health(started: boolean, agentCount: number): HealthStatus {
    if (!started) return "degraded";
    if (agentCount === 0) return "critical";
    if (this.failureCount >= 3) return "critical";
    if (this.failureCount > 0) return "degraded";
    return "healthy";
  }
}