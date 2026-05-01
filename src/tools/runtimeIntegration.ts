export const RUNTIME_TOOL_MAP: Record<string, string[]> = {
  prometheus: [
    "dark-pool-detector",
    "blockchain-scanner",
    "social-radar",
    "bayesian-updater",
    "automated-trader",
  ],
  morpheus: [
    "narrative-builder",
    "cross-domain-bridge",
    "insight-crystallizer",
    "episodic-recorder",
  ],
  apollo: [
    "bayesian-updater",
    "contradiction-detector",
    "hypothesis-generator",
    "knowledge-graph",
    "knowledge-suprema",
  ],
  hermes: [
    "causal-reasoning",
    "social-radar",
    "email-campaign",
    "content-publisher",
    "audience-model-refresh",
  ],
  athena: [
    "deep-web-crawler",
    "multi-source-synthesizer",
    "contradiction-detector",
    "report-generator",
    "knowledge-suprema",
  ],
  vulcan: [
    "code-deployer",
    "tool-inspector",
    "tool-optimizer",
    "pattern-extractor",
  ],
  oracle: [
    "news-intelligence",
    "counterfactual-reasoning",
    "analogical-reasoning",
    "report-generator",
    "knowledge-suprema",
  ],
  sophia: [
    "knowledge-suprema",
    "knowledge-graph",
    "analogical-reasoning",
    "multi-source-synthesizer",
    "report-generator",
  ],
  asclepius: [
    "knowledge-suprema",
    "hypothesis-generator",
    "bayesian-updater",
    "contradiction-detector",
    "report-generator",
  ],
  logos: [
    "analogical-reasoning",
    "counterfactual-reasoning",
    "pattern-extractor",
    "knowledge-suprema",
    "report-generator",
  ],
  "prometheus-mind": [
    "causal-reasoning",
    "pattern-extractor",
    "knowledge-suprema",
    "counterfactual-reasoning",
    "report-generator",
  ],
  "nexus-prime": [
    "tool-composer",
    "tool-inspector",
    "tool-optimizer",
    "tool-evolution",
    "multi-source-synthesizer",
    "knowledge-suprema",
  ],
};

export function getToolsForRuntime(runtimeId: string): string[] {
  return RUNTIME_TOOL_MAP[runtimeId] ?? RUNTIME_TOOL_MAP["nexus-prime"];
}
