import type { ChronoJobDefinition, ChronoJobResult, ChronoTriggerType } from "@/tools/chrono/ChronoEngine";
import { outputResults, outputsQuality, runTool } from "@/tools/chrono/jobs/jobHelpers";

interface SupremeJobConfig {
  id: string;
  name: string;
  description: string;
  runtime: string;
  trigger: {
    type: ChronoTriggerType;
    intervalMs?: number;
    cronExpression?: string;
    eventName?: string;
  };
  priority: 1 | 2 | 3 | 4 | 5;
  timeoutMs: number;
  tools: Array<{ id: string; params: Record<string, unknown> }>;
  cascades?: string[];
}

function supremeJob(config: SupremeJobConfig): ChronoJobDefinition {
  return {
    id: config.id,
    name: config.name,
    description: config.description,
    trigger: config.trigger,
    execution: {
      priority: config.priority,
      timeoutMs: config.timeoutMs,
      maxRetries: 2,
      retryBackoffMs: 2000,
      allowConcurrent: false,
      preferredRuntime: config.runtime,
    },
    learning: {
      enabled: true,
      adaptSchedule: config.trigger.type === "interval" || config.trigger.type === "market-aware",
      adaptParameters: true,
      memoryWindowSize: 50,
      qualityThreshold: 0.68,
    },
    collaboration: {
      cascadeOnSuccess: config.cascades,
      cascadeOnFailure: ["swarm-health"],
      shareDataWith: ["self-evolution", "knowledge-update"],
    },
    handler: async (ctx): Promise<ChronoJobResult> => {
      const outputs = await Promise.all(
        config.tools.map((tool) => runTool(tool.id, ctx, tool.params)),
      );
      const quality = outputsQuality(outputs);
      const results = outputResults(outputs);
      return {
        success: quality >= 0.35 || results.length > 0,
        data: {
          runtime: config.runtime,
          results,
          checkedAt: Date.now(),
        },
        quality,
        insights: [
          `${config.id}: ${results.length} tool result(s) consolidated`,
          `quality ${(quality * 100).toFixed(0)}%`,
        ],
        triggerCascades: quality >= 0.75 ? config.cascades : undefined,
        scheduleAdjustment:
          config.trigger.type === "interval" && quality < 0.45
            ? { newIntervalMs: Math.min((config.trigger.intervalMs ?? 60_000) * 2, 3_600_000), reason: "low signal quality" }
            : undefined,
      };
    },
  };
}

export const aegisPerimeterJob = supremeJob({
  id: "aegis-perimeter",
  name: "Aegis Perimeter Monitor",
  description: "Monitora anomalias de requests, scanning e payloads suspeitos.",
  runtime: "aegis",
  trigger: { type: "interval", intervalMs: 5_000 },
  priority: 1,
  timeoutMs: 10_000,
  tools: [
    { id: "tool-inspector", params: { query: "inspect API perimeter request anomaly patterns" } },
    { id: "pattern-extractor", params: { query: "rate spike scanning probing payload anomaly" } },
    { id: "contradiction-detector", params: { claims: ["allow request", "block suspicious payload"] } },
  ],
  cascades: ["aegis-code-scan"],
});

export const aegisThreatIntelJob = supremeJob({
  id: "aegis-threat-intel",
  name: "Aegis Threat Intelligence",
  description: "Verifica CVEs, dependencias vulneraveis e sinais de ameaca.",
  runtime: "aegis",
  trigger: { type: "interval", intervalMs: 1_800_000 },
  priority: 2,
  timeoutMs: 20_000,
  tools: [
    { id: "knowledge-suprema", params: { query: "recent CVE dependency vulnerability threat intelligence" } },
    { id: "multi-source-synthesizer", params: { topic: "dependency security posture" } },
  ],
});

export const aegisCodeScanJob = supremeJob({
  id: "aegis-code-scan",
  name: "Aegis Generated Code Scan",
  description: "Escaneia codigo gerado e dependencias antes de deploy.",
  runtime: "aegis",
  trigger: { type: "event", eventName: "code:generated" },
  priority: 1,
  timeoutMs: 20_000,
  tools: [
    { id: "tool-inspector", params: { query: "scan generated code for secrets unsafe dependencies injection" } },
    { id: "pattern-extractor", params: { query: "hardcoded secret eval shell unsafe network pattern" } },
  ],
});

export const aegisDataProtectionJob = supremeJob({
  id: "aegis-data-protection",
  name: "Aegis Data Protection",
  description: "Audita PII, API keys, backups e controles de acesso.",
  runtime: "aegis",
  trigger: { type: "interval", intervalMs: 3_600_000 },
  priority: 2,
  timeoutMs: 18_000,
  tools: [
    { id: "knowledge-graph", params: { query: "sensitive data pii api keys access audit backup integrity" } },
    { id: "report-generator", params: { title: "Aegis data protection report" } },
  ],
});

export const aegisEncryptionAuditJob = supremeJob({
  id: "aegis-encryption-audit",
  name: "Aegis Encryption Audit",
  description: "Audita TLS, certificados, chaveamento e criptografia em repouso.",
  runtime: "aegis",
  trigger: { type: "cron", cronExpression: "0 3 * * *" },
  priority: 3,
  timeoutMs: 18_000,
  tools: [
    { id: "tool-inspector", params: { query: "TLS certificate expiry key rotation encryption at rest" } },
    { id: "report-generator", params: { title: "Encryption audit" } },
  ],
});

export const contentTrendResearchJob = supremeJob({
  id: "content-trend-research",
  name: "Content Trend Research",
  description: "Descobre topicos e keywords para Content Empire.",
  runtime: "content-empire",
  trigger: { type: "cron", cronExpression: "0 8 * * *" },
  priority: 3,
  timeoutMs: 20_000,
  tools: [
    { id: "social-radar", params: { query: "content trends SEO keywords social topics" } },
    { id: "knowledge-suprema", params: { query: "search intent content gap editorial calendar" } },
  ],
  cascades: ["content-blog-writer"],
});

export const contentBlogWriterJob = supremeJob({
  id: "content-blog-writer",
  name: "Content Blog Writer",
  description: "Prepara artigos otimizados para SEO.",
  runtime: "content-empire",
  trigger: { type: "cron", cronExpression: "0 10 * * 1,3,5" },
  priority: 3,
  timeoutMs: 25_000,
  tools: [
    { id: "narrative-builder", params: { topic: "SEO blog article outline meta CTA" } },
    { id: "report-generator", params: { title: "SEO article draft" } },
  ],
});

export const contentSocialPublisherJob = supremeJob({
  id: "content-social-publisher",
  name: "Content Social Publisher",
  description: "Agenda/publica posts quando integracoes estao configuradas.",
  runtime: "content-empire",
  trigger: { type: "interval", intervalMs: 28_800_000 },
  priority: 3,
  timeoutMs: 20_000,
  tools: [
    { id: "content-publisher", params: { channel: "configured-social", mode: "scheduled" } },
    { id: "social-radar", params: { query: "best posting time platform audience" } },
  ],
});

export const contentAnalyticsJob = supremeJob({
  id: "content-analytics",
  name: "Content Analytics",
  description: "Consolida performance diaria de conteudo.",
  runtime: "content-empire",
  trigger: { type: "cron", cronExpression: "0 21 * * *" },
  priority: 4,
  timeoutMs: 18_000,
  tools: [
    { id: "multi-source-synthesizer", params: { topic: "GA4 social insights content ROI" } },
    { id: "report-generator", params: { title: "Daily content analytics" } },
  ],
});

export const contentOptimizationJob = supremeJob({
  id: "content-optimization",
  name: "Content Optimization",
  description: "Sugere otimizacoes semanais por performance.",
  runtime: "content-empire",
  trigger: { type: "cron", cronExpression: "0 9 * * 1" },
  priority: 4,
  timeoutMs: 18_000,
  tools: [
    { id: "causal-reasoning", params: { query: "why content outperformed underperformed" } },
    { id: "counterfactual-reasoning", params: { query: "headline thumbnail posting time alternatives" } },
  ],
});

export const tradingMarketScanJob = supremeJob({
  id: "trading-market-scan",
  name: "Trading Market Scan",
  description: "Varre mercados a cada 30s para Wall Street.",
  runtime: "wall-street",
  trigger: { type: "market-aware", intervalMs: 30_000 },
  priority: 1,
  timeoutMs: 20_000,
  tools: [
    { id: "dark-pool-detector", params: { asset: "SOL", lookbackHours: 1 } },
    { id: "social-radar", params: { query: "crypto market narratives breaking momentum" } },
  ],
});

export const tradingWhaleTrackerJob = supremeJob({
  id: "trading-whale-tracker",
  name: "Trading Whale Tracker",
  description: "Monitora movimentos de baleias e smart money.",
  runtime: "wall-street",
  trigger: { type: "interval", intervalMs: 60_000 },
  priority: 1,
  timeoutMs: 18_000,
  tools: [
    { id: "blockchain-scanner", params: { chains: ["solana", "ethereum", "base"], alertThreshold: 0.75, focus: "whales" } },
  ],
});

export const tradingFundingRatesJob = supremeJob({
  id: "trading-funding-rates",
  name: "Trading Funding Rates",
  description: "Monitora funding rates e possiveis arbitragens.",
  runtime: "wall-street",
  trigger: { type: "interval", intervalMs: 300_000 },
  priority: 2,
  timeoutMs: 18_000,
  tools: [
    { id: "bayesian-updater", params: { hypothesis: "funding rate dislocation creates trade opportunity" } },
    { id: "dark-pool-detector", params: { asset: "BTC", lookbackHours: 3, focus: "derivatives" } },
  ],
});

export const tradingPortfolioRebalanceJob = supremeJob({
  id: "trading-portfolio-rebalance",
  name: "Trading Portfolio Rebalance",
  description: "Revisa exposicao, correlacao e rebalanceamento diario.",
  runtime: "wall-street",
  trigger: { type: "cron", cronExpression: "0 22 * * *" },
  priority: 3,
  timeoutMs: 20_000,
  tools: [
    { id: "bayesian-updater", params: { hypothesis: "portfolio risk-adjusted allocation remains valid" } },
    { id: "report-generator", params: { title: "Daily portfolio risk report" } },
  ],
});

export const supremeRuntimeJobs = [
  aegisPerimeterJob,
  aegisThreatIntelJob,
  aegisCodeScanJob,
  aegisDataProtectionJob,
  aegisEncryptionAuditJob,
  contentTrendResearchJob,
  contentBlogWriterJob,
  contentSocialPublisherJob,
  contentAnalyticsJob,
  contentOptimizationJob,
  tradingMarketScanJob,
  tradingWhaleTrackerJob,
  tradingFundingRatesJob,
  tradingPortfolioRebalanceJob,
];
