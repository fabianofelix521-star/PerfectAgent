import type { ChronoJobDefinition, ChronoJobResult } from "@/tools/chrono/ChronoEngine";
import { outputResults, outputsQuality, runTool } from "@/tools/chrono/jobs/jobHelpers";

export const selfEvolutionJob: ChronoJobDefinition = {
  id: "self-evolution",
  name: "System Self-Evolution Engine",
  description: "Analisa performance de agents, runtimes e tools e propoe melhorias incrementais de baixo risco.",
  trigger: {
    type: "cron",
    cronExpression: "0 4 * * 0",
  },
  execution: {
    priority: 5,
    timeoutMs: 1_800_000,
    maxRetries: 0,
    retryBackoffMs: 0,
    allowConcurrent: false,
    preferredRuntime: "nexus-prime",
    preferredAgent: "self-improving-optimizer",
  },
  learning: {
    enabled: true,
    adaptSchedule: false,
    adaptParameters: true,
    memoryWindowSize: 52,
    qualityThreshold: 0.7,
  },
  collaboration: {
    requiresDataFrom: ["market-scan", "swarm-health", "memory-consolidation"],
    shareDataWith: ["knowledge-update"],
  },
  handler: async (ctx): Promise<ChronoJobResult> => {
    const [inspection, optimization, evolution] = await Promise.all([
      runTool("tool-inspector", ctx, { query: "inspect weekly tool runtime metrics failures" }),
      runTool("tool-optimizer", ctx, { query: "optimize pipelines latency quality parameters" }),
      runTool("tool-evolution", ctx, { query: "propose low risk tool ecosystem improvements" }),
    ]);
    const quality = outputsQuality([inspection, optimization, evolution]);
    return {
      success: quality > 0.45,
      data: {
        outputs: outputResults([inspection, optimization, evolution]),
        pendingApproval: [],
      },
      quality,
      insights: [
        `self-evolution quality ${(quality * 100).toFixed(0)}%`,
        "melhorias automaticas limitadas a parametros e schedules",
      ],
      parameterAdjustments: { lastSelfEvolutionAt: Date.now() },
    };
  },
};
