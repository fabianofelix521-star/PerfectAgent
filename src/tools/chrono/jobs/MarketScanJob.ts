import type { ChronoJobDefinition, ChronoJobResult } from "@/tools/chrono/ChronoEngine";
import { outputResults, outputsQuality, runTool } from "@/tools/chrono/jobs/jobHelpers";

export const marketScanJob: ChronoJobDefinition = {
  id: "market-scan",
  name: "Market Intelligence Scanner",
  description: "Varre mercados cripto em busca de oportunidades emergentes e ajusta a propria frequencia.",
  trigger: {
    type: "market-aware",
    intervalMs: 30_000,
  },
  execution: {
    priority: 1,
    timeoutMs: 25_000,
    maxRetries: 3,
    retryBackoffMs: 2000,
    allowConcurrent: false,
    preferredRuntime: "prometheus",
  },
  learning: {
    enabled: true,
    adaptSchedule: true,
    adaptParameters: true,
    memoryWindowSize: 50,
    qualityThreshold: 0.7,
  },
  collaboration: {
    cascadeOnSuccess: ["knowledge-update"],
    cascadeOnFailure: ["swarm-health"],
    shareDataWith: ["self-evolution", "knowledge-update"],
  },
  handler: async (ctx): Promise<ChronoJobResult> => {
    const [darkPool, blockchain, social] = await Promise.all([
      runTool("dark-pool-detector", ctx, { asset: "SOL", lookbackHours: 6, type: "dark-pool" }),
      runTool("blockchain-scanner", ctx, { chains: ["solana", "ethereum", "base"], alertThreshold: 0.7 }),
      runTool("social-radar", ctx, { query: "crypto market social narrative memecoin solana volume" }),
    ]);
    const quality = outputsQuality([darkPool, blockchain, social]);
    const results = outputResults([darkPool, blockchain, social]);
    const signalCount = results.length + (quality > 0.75 ? 2 : 0);
    return {
      success: quality >= 0.45,
      data: { results, signalCount, timestamp: Date.now() },
      quality,
      insights: [
        `${signalCount} sinais de mercado consolidados`,
        `qualidade media ${(quality * 100).toFixed(0)}%`,
      ],
      scheduleAdjustment:
        quality > 0.8
          ? { newIntervalMs: 15_000, reason: "atividade informacional alta" }
          : quality < 0.55
            ? { newIntervalMs: 60_000, reason: "sinal fraco; reduzir carga" }
            : undefined,
      triggerCascades: quality > 0.75 ? ["knowledge-update"] : [],
    };
  },
};
