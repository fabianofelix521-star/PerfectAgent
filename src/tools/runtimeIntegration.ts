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
  "hippocrates-supreme": [
    "knowledge-suprema",
    "hypothesis-generator",
    "bayesian-updater",
    "contradiction-detector",
    "report-generator",
  ],
  mendeleev: [
    "hypothesis-generator",
    "causal-reasoning",
    "multi-source-synthesizer",
    "report-generator",
  ],
  "prompt-forge": [
    "tool-inspector",
    "tool-optimizer",
    "tool-evolution",
    "contradiction-detector",
    "report-generator",
  ],
  "silicon-valley": [
    "code-deployer",
    "tool-inspector",
    "tool-optimizer",
    "pattern-extractor",
    "report-generator",
  ],
  "unreal-forge": [
    "narrative-builder",
    "cross-domain-bridge",
    "insight-crystallizer",
    "report-generator",
  ],
  aegis: [
    "tool-inspector",
    "contradiction-detector",
    "pattern-extractor",
    "knowledge-graph",
    "report-generator",
  ],
  "content-empire": [
    "social-radar",
    "content-publisher",
    "narrative-builder",
    "report-generator",
  ],
  "ad-commander": [
    "social-radar",
    "causal-reasoning",
    "counterfactual-reasoning",
    "report-generator",
  ],
  "studio-one": [
    "social-radar",
    "narrative-builder",
    "insight-crystallizer",
    "report-generator",
  ],
  "wall-street": [
    "dark-pool-detector",
    "blockchain-scanner",
    "social-radar",
    "bayesian-updater",
    "automated-trader",
  ],
  "pixel-forge": [
    "narrative-builder",
    "cross-domain-bridge",
    "insight-crystallizer",
    "report-generator",
  ],
};

export function getToolsForRuntime(runtimeId: string): string[] {
  return RUNTIME_TOOL_MAP[runtimeId] ?? RUNTIME_TOOL_MAP["nexus-prime"];
}

export const SUPERVISOR_TOOL_MAP: Record<string, string[]> = {
  financial: RUNTIME_TOOL_MAP.prometheus,
  security: ["tool-inspector", "contradiction-detector", "knowledge-graph", "report-generator"],
  medical: RUNTIME_TOOL_MAP.apollo,
  engineering: RUNTIME_TOOL_MAP.vulcan,
  science: ["hypothesis-generator", "knowledge-suprema", "multi-source-synthesizer", "report-generator"],
  legal: ["knowledge-suprema", "contradiction-detector", "counterfactual-reasoning", "report-generator"],
  research: RUNTIME_TOOL_MAP.athena,
  philosophy: RUNTIME_TOOL_MAP.logos,
  creative: RUNTIME_TOOL_MAP.morpheus,
  "ancient-knowledge": RUNTIME_TOOL_MAP.sophia,
  mathematics: ["causal-reasoning", "analogical-reasoning", "hypothesis-generator", "report-generator"],
  meta: RUNTIME_TOOL_MAP["nexus-prime"],
};

export function getToolsForSupervisor(supervisorId: string): string[] {
  return SUPERVISOR_TOOL_MAP[supervisorId] ?? RUNTIME_TOOL_MAP["nexus-prime"];
}
