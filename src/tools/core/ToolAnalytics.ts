import type { ToolMetrics } from "@/tools/core/NexusToolBase";
import type { ToolMemoryRecord } from "@/tools/core/ToolMemory";

export interface ToolExecutionAnalytics {
  toolId: string;
  latencyMs: number;
  quality: number;
  confidence: number;
  success: boolean;
  failureReason?: string;
}

export class ToolAnalytics {
  private readonly events: ToolExecutionAnalytics[] = [];

  record(event: ToolExecutionAnalytics): void {
    this.events.push(event);
    if (this.events.length > 2000) this.events.shift();
  }

  deriveMetrics(toolId: string, current: ToolMetrics): ToolMetrics {
    const events = this.events.filter((event) => event.toolId === toolId);
    if (!events.length) return current;
    const failures = events.filter((event) => !event.success);
    return {
      ...current,
      totalExecutions: events.length,
      successRate: mean(events.map((event) => (event.success ? 1 : 0))),
      avgLatencyMs: mean(events.map((event) => event.latencyMs)),
      avgQuality: mean(events.map((event) => event.quality)),
      avgConfidence: mean(events.map((event) => event.confidence)),
      topFailureReasons: topItems(
        failures.map((event) => event.failureReason ?? "unknown"),
      ),
    };
  }

  summarizeMemory(records: ToolMemoryRecord[]): {
    avgQuality: number;
    failureRate: number;
    recentFailures: string[];
  } {
    const recent = records.slice(0, 50);
    const failures = recent.filter((record) => record.error);
    return {
      avgQuality: mean(recent.map((record) => record.quality)),
      failureRate: failures.length / Math.max(1, recent.length),
      recentFailures: topItems(failures.map((record) => record.error ?? "unknown")),
    };
  }
}

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function topItems(values: string[]): string[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([value]) => value);
}
