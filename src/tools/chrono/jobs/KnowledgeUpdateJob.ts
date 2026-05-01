import type { ChronoJobDefinition, ChronoJobResult } from "@/tools/chrono/ChronoEngine";
import { outputResults, outputsQuality, runTool } from "@/tools/chrono/jobs/jobHelpers";

export const knowledgeUpdateJob: ChronoJobDefinition = {
  id: "knowledge-update",
  name: "Knowledge Update Job",
  description: "Atualiza memoria semantica com sinais recentes e gera sintese de conhecimento.",
  trigger: {
    type: "cascade",
    parentJobId: "market-scan",
  },
  execution: {
    priority: 3,
    timeoutMs: 60_000,
    maxRetries: 1,
    retryBackoffMs: 5000,
    allowConcurrent: false,
    preferredRuntime: "athena",
  },
  learning: {
    enabled: true,
    adaptSchedule: true,
    adaptParameters: true,
    memoryWindowSize: 30,
    qualityThreshold: 0.65,
  },
  collaboration: {
    requiresDataFrom: ["market-scan"],
    shareDataWith: ["self-evolution"],
  },
  handler: async (ctx): Promise<ChronoJobResult> => {
    const knowledgeQuery =
      typeof ctx.triggerData === "string" && ctx.triggerData.trim().length >= 3
        ? ctx.triggerData
        : "AI agents, developer tooling, runtime systems, research papers and relevant repositories";

    const [knowledge, synthesis, graph, report] = await Promise.all([
      runTool("knowledge-suprema", ctx, {
        query: knowledgeQuery,
        limit: 10,
        sources: ["local", "pubmed", "arxiv", "github", "crossref", "wikipedia"],
        ingest: false,
      }),
      runTool("multi-source-synthesizer", ctx, { query: `synthesize recent market, swarm and memory signals about: ${knowledgeQuery}` }),
      runTool("knowledge-graph", ctx, { query: "build knowledge graph from latest shared chrono data" }),
      runTool("report-generator", ctx, { query: "generate concise intelligence report with uncertainty" }),
    ]);
    const quality = outputsQuality([knowledge, synthesis, graph, report]);
    return {
      success: quality > 0.45,
      data: { outputs: outputResults([knowledge, synthesis, graph, report]) },
      quality,
      insights: [
        `knowledge update quality ${(quality * 100).toFixed(0)}%`,
        `knowledge query: ${knowledgeQuery}`,
      ],
    };
  },
};
