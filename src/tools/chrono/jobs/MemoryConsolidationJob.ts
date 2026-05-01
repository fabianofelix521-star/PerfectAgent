import type { ChronoJobDefinition, ChronoJobResult } from "@/tools/chrono/ChronoEngine";
import { ToolMemory } from "@/tools/core/ToolMemory";
import { runTool } from "@/tools/chrono/jobs/jobHelpers";

export const memoryConsolidationJob: ChronoJobDefinition = {
  id: "memory-consolidation",
  name: "Memory Consolidation Engine",
  description: "Consolida memoria de curto prazo em longo prazo, remove redundancia e reforca padroes uteis.",
  trigger: {
    type: "cron",
    cronExpression: "0 3 * * *",
  },
  execution: {
    priority: 4,
    timeoutMs: 300_000,
    maxRetries: 1,
    retryBackoffMs: 60_000,
    allowConcurrent: false,
  },
  learning: {
    enabled: true,
    adaptSchedule: false,
    adaptParameters: true,
    memoryWindowSize: 30,
    qualityThreshold: 0.6,
  },
  collaboration: {
    cascadeOnSuccess: ["knowledge-update"],
    shareDataWith: ["self-evolution"],
  },
  handler: async (ctx): Promise<ChronoJobResult> => {
    const memory = new ToolMemory();
    const before = memory.getRecords();
    const consolidation = await runTool("memory-consolidator", ctx, {
      query: `consolidate ${before.length} memory records and extract durable semantic links`,
    });
    const duplicateEstimate = Math.max(0, before.length - new Set(before.map((record) => record.id)).size);
    return {
      success: true,
      data: {
        totalRecords: before.length,
        duplicateEstimate,
        consolidation: consolidation?.result,
      },
      quality: consolidation?.quality ?? 0.75,
      insights: [
        `${before.length} memorias avaliadas`,
        `${duplicateEstimate} redundancias estimadas`,
      ],
      parameterAdjustments: { lastConsolidationAt: Date.now() },
    };
  },
};
