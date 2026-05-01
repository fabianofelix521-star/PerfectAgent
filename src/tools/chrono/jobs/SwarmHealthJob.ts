import type { ChronoJobDefinition, ChronoJobResult } from "@/tools/chrono/ChronoEngine";
import { ensureToolsRegistered, runTool } from "@/tools/chrono/jobs/jobHelpers";
import { ToolRegistry } from "@/tools/core/ToolRegistry";
import { mean } from "@/tools/core/toolUtils";

export const swarmHealthJob: ChronoJobDefinition = {
  id: "swarm-health",
  name: "Swarm Health Monitor",
  description: "Monitora saude de tools, jobs e runtimes a partir de metricas locais.",
  trigger: {
    type: "interval",
    intervalMs: 10_000,
  },
  execution: {
    priority: 1,
    timeoutMs: 8000,
    maxRetries: 0,
    retryBackoffMs: 0,
    allowConcurrent: false,
  },
  learning: {
    enabled: true,
    adaptSchedule: true,
    adaptParameters: false,
    memoryWindowSize: 100,
    qualityThreshold: 0.5,
  },
  collaboration: {
    cascadeOnFailure: ["self-evolution"],
    shareDataWith: ["self-evolution"],
  },
  handler: async (ctx): Promise<ChronoJobResult> => {
    ensureToolsRegistered();
    const metrics = [...ToolRegistry.getMetrics().entries()];
    const quality = metrics.length ? mean(metrics.map(([, metric]) => metric.successRate * 0.6 + metric.avgQuality * 0.4)) : 1;
    const weakTools = metrics
      .filter(([, metric]) => metric.totalExecutions > 0 && metric.successRate < 0.6)
      .map(([toolId]) => toolId);
    const inspection = await runTool("tool-inspector", ctx, {
      query: `inspect swarm health weak tools ${weakTools.join(" ")}`,
    });
    return {
      success: quality > 0.35,
      data: { metrics: Object.fromEntries(metrics), weakTools, inspection: inspection?.result },
      quality,
      insights: weakTools.length
        ? weakTools.map((toolId) => `${toolId}: success rate abaixo do esperado`)
        : ["swarm saudavel"],
      scheduleAdjustment:
        weakTools.length > 0
          ? { newIntervalMs: 2000, reason: "ferramentas fracas detectadas" }
          : { newIntervalMs: 10_000, reason: "saude nominal" },
    };
  },
};
