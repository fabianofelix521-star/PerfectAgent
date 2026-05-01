import type { ChronoJobDefinition, ChronoJobResult } from "@/tools/chrono/ChronoEngine";
import { outputResults, outputsQuality, runTool } from "@/tools/chrono/jobs/jobHelpers";

export const audienceModelRefreshJob: ChronoJobDefinition = {
  id: "audience-model-refresh",
  name: "Audience Model Refresh",
  description: "Atualiza modelos de audiencia, objecoes e linguagem de mercado para o runtime Hermes.",
  trigger: {
    type: "cron",
    cronExpression: "30 4 * * *",
  },
  execution: {
    priority: 4,
    timeoutMs: 120_000,
    maxRetries: 1,
    retryBackoffMs: 20_000,
    allowConcurrent: false,
    preferredRuntime: "hermes",
  },
  learning: {
    enabled: true,
    adaptSchedule: true,
    adaptParameters: true,
    memoryWindowSize: 30,
    qualityThreshold: 0.65,
  },
  collaboration: {
    shareDataWith: ["self-evolution"],
  },
  handler: async (ctx): Promise<ChronoJobResult> => {
    const [social, causal, campaign] = await Promise.all([
      runTool("social-radar", ctx, { query: "audience language objections market social trend" }),
      runTool("causal-reasoning", ctx, { cause: "message", effect: "conversion", observationalData: [] }),
      runTool("email-campaign", ctx, { query: "refresh audience segments campaign objections resonance" }),
    ]);
    const quality = outputsQuality([social, causal, campaign]);
    return {
      success: quality > 0.5,
      data: { outputs: outputResults([social, causal, campaign]) },
      quality,
      insights: [`audience model refreshed with quality ${(quality * 100).toFixed(0)}%`],
    };
  },
};
