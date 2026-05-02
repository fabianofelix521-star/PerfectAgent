import {
  clamp,
  clamp01,
  keywordScore,
  mean,
  now,
  PersistentCognitiveMemory,
  qualityFromSignals,
} from "@/runtimes/shared/cognitiveCore";
import {
  CONFIDENCE_CALIBRATION_RULE,
  GLOBAL_CITATION_RULE,
  VULCAN_ARCHITECTURE_RULES,
  withRuntimeInstructions,
} from "@/runtimes/shared/runtimeInstructions";

export interface CodeHotspot {
  file: string;
  complexity: number;
  changeFrequency: number;
  bugProneness: number;
  refactoringPriority: number;
}

export interface SecurityIssue {
  file: string;
  severity: "critical" | "high" | "medium" | "low";
  finding: string;
  remediation: string;
}

export interface Bottleneck {
  location: string;
  severity: "high" | "medium" | "low";
  cause: string;
  optimization: string;
}

export interface ArchitectureSmell {
  type:
    | "god-class"
    | "circular-dependency"
    | "feature-envy"
    | "data-clump"
    | "divergent-change"
    | "shotgun-surgery";
  location: string;
  severity: "critical" | "high" | "medium" | "low";
  refactoringStrategy: string;
  estimatedEffort: number;
}

export interface DependencyStatus {
  name: string;
  status: "healthy" | "outdated" | "risky" | "unknown";
  reason: string;
}

export interface CodebaseHealth {
  overallScore: number;
  technicalDebt: {
    totalHours: number;
    hotspots: CodeHotspot[];
    trend: "improving" | "stable" | "degrading";
  };
  testCoverage: number;
  securityIssues: SecurityIssue[];
  performanceBottlenecks: Bottleneck[];
  architectureSmells: ArchitectureSmell[];
  dependencyHealth: DependencyStatus[];
}

export interface CodeFileSnapshot {
  path: string;
  content: string;
}

export interface CodeDiff {
  files: CodeFileSnapshot[];
  summary?: string;
  changedAt?: number;
}

export interface ReviewFinding {
  agentId: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  file?: string;
  message: string;
  recommendation: string;
}

export interface ReviewResult {
  score: number;
  findings: ReviewFinding[];
  summary: string;
  quality: ReturnType<typeof qualityFromSignals>;
}

export interface VulcanMemoryState {
  healthHistory: CodebaseHealth[];
  bugPatterns: Record<string, number>;
  lastRepoPath?: string;
}

interface VulcanReviewAgent {
  id: string;
  systemPrompt: string;
  review(diff: CodeDiff): Promise<ReviewFinding[]>;
}

abstract class BaseVulcanAgent implements VulcanReviewAgent {
  readonly systemPrompt: string;

  constructor(public readonly id: string, extraPrompt?: string) {
    this.systemPrompt = withRuntimeInstructions(
      `Vulcan ${id} agent. Review software changes for architecture, security, performance, tests and operational resilience with concrete file-level recommendations.`,
      GLOBAL_CITATION_RULE,
      CONFIDENCE_CALIBRATION_RULE,
      extraPrompt,
    );
  }
  abstract review(diff: CodeDiff): Promise<ReviewFinding[]>;

  protected fileScore(file: CodeFileSnapshot, keywords: string[]): number {
    return keywordScore(`${file.path} ${file.content}`, keywords);
  }
}

export class ArchitectureEvolutionAgent extends BaseVulcanAgent {
  constructor() {
    super("architecture", VULCAN_ARCHITECTURE_RULES);
  }

  async review(diff: CodeDiff): Promise<ReviewFinding[]> {
    return diff.files.flatMap((file) => {
      const complexity = estimateComplexity(file.content);
      const findings: ReviewFinding[] = [];
      if (complexity > 18) {
        findings.push({
          agentId: this.id,
          severity: complexity > 32 ? "high" : "medium",
          file: file.path,
          message: `complexidade estimada ${complexity}`,
          recommendation: "extrair funcoes puras, reduzir branches e separar responsabilidades",
        });
      }
      if (file.content.length > 16000) {
        findings.push({
          agentId: this.id,
          severity: "medium",
          file: file.path,
          message: "arquivo grande demais para mudanca frequente",
          recommendation: "dividir por dominio e preservar API publica",
        });
      }
      return findings;
    });
  }
}

export class ProactiveSecurityAgent extends BaseVulcanAgent {
  constructor() {
    super("security");
  }

  async review(diff: CodeDiff): Promise<ReviewFinding[]> {
    return diff.files.flatMap((file) => {
      const risky = [
        ["eval", "execucao dinamica detectada"],
        ["dangerouslySetInnerHTML", "HTML direto exige sanitizacao"],
        ["localStorage.setItem", "dados sensiveis podem vazar no browser"],
        ["apiKey", "possivel segredo em codigo"],
        ["password", "possivel credencial em codigo"],
      ] as const;
      return risky
        .filter(([needle]) => file.content.includes(needle))
        .map(([, message]) => ({
          agentId: this.id,
          severity: message.includes("segredo") || message.includes("credencial") ? "high" : "medium",
          file: file.path,
          message,
          recommendation: "isolar segredo, validar entrada e documentar ameaca mitigada",
        }));
    });
  }
}

export class PerformanceOptimizationAgent extends BaseVulcanAgent {
  constructor() {
    super("performance");
  }

  async review(diff: CodeDiff): Promise<ReviewFinding[]> {
    return diff.files.flatMap((file) => {
      const findings: ReviewFinding[] = [];
      if (/\.map\([^)]*\)\.map\(/s.test(file.content) || /JSON\.stringify\([^)]*\).*render/i.test(file.content)) {
        findings.push({
          agentId: this.id,
          severity: "medium",
          file: file.path,
          message: "padrao de renderizacao potencialmente caro",
          recommendation: "memoizar derivacoes, reduzir serializacao em render e usar throttling",
        });
      }
      if (file.content.includes("setInterval(") && !file.content.includes("clearInterval(")) {
        findings.push({
          agentId: this.id,
          severity: "high",
          file: file.path,
          message: "intervalo sem cleanup detectado",
          recommendation: "retornar cleanup no efeito ou expor metodo stop",
        });
      }
      return findings;
    });
  }
}

export class AutomatedRefactoringAgent extends BaseVulcanAgent {
  constructor() {
    super("refactoring");
  }

  async review(diff: CodeDiff): Promise<ReviewFinding[]> {
    return diff.files
      .filter((file) => duplicateLineScore(file.content) > 0.18)
      .map((file) => ({
        agentId: this.id,
        severity: "low",
        file: file.path,
        message: "duplicacao estrutural detectada",
        recommendation: "extrair helper local apenas se reduzir complexidade real",
      }));
  }
}

export class TestIntelligenceAgent extends BaseVulcanAgent {
  constructor() {
    super("test-intelligence");
  }

  async review(diff: CodeDiff): Promise<ReviewFinding[]> {
    const productionFiles = diff.files.filter((file) => !/\.(test|spec)\./.test(file.path));
    const testFiles = diff.files.filter((file) => /\.(test|spec)\./.test(file.path));
    if (productionFiles.length && !testFiles.length) {
      return [
        {
          agentId: this.id,
          severity: "info",
          message: "mudanca de producao sem teste no diff",
          recommendation: "adicionar teste focado se o comportamento mudou",
        },
      ];
    }
    return [];
  }
}

export class VulcanRuntime {
  private codebaseHealth: CodebaseHealth = emptyHealth();
  private readonly agents: Map<string, VulcanReviewAgent> = new Map(
    defaultVulcanAgents().map((agent) => [agent.id, agent]),
  );
  private readonly memory = new PersistentCognitiveMemory<VulcanMemoryState>(
    "runtime:vulcan:living-codebase",
    () => ({ healthHistory: [], bugPatterns: {} }),
  );
  private monitorHandle: ReturnType<typeof setInterval> | undefined;
  private currentSnapshot: CodeDiff = { files: [] };

  async startContinuousMonitoring(repoPath: string): Promise<void> {
    this.stopContinuousMonitoring();
    const previous = this.memory.load();
    this.memory.save({
      ...previous,
      updatedAt: now(),
      state: { ...previous.state, lastRepoPath: repoPath },
    });
    this.monitorHandle = setInterval(() => {
      void this.monitorOnce();
    }, 60000);
    await this.monitorOnce();
  }

  stopContinuousMonitoring(): void {
    if (this.monitorHandle) clearInterval(this.monitorHandle);
    this.monitorHandle = undefined;
  }

  setSnapshot(diff: CodeDiff): void {
    this.currentSnapshot = diff;
  }

  async handleNewCode(diff: CodeDiff): Promise<ReviewResult> {
    this.currentSnapshot = diff;
    const reviews = await Promise.all([...this.agents.values()].map((agent) => agent.review(diff)));
    const findings = reviews.flat().sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
    this.codebaseHealth = this.assessCodebaseHealth(diff, findings);
    this.learnFromFindings(findings);
    return this.synthesizeReview(findings);
  }

  getCodebaseHealth(): CodebaseHealth {
    return this.codebaseHealth;
  }

  private async monitorOnce(): Promise<void> {
    if (!this.currentSnapshot.files.length) return;
    await this.handleNewCode(this.currentSnapshot);
  }

  private assessCodebaseHealth(diff: CodeDiff, findings: ReviewFinding[]): CodebaseHealth {
    const hotspots = diff.files.map((file) => {
      const complexity = estimateComplexity(file.content);
      const changeFrequency = diff.changedAt ? clamp01((now() - diff.changedAt) / (1000 * 60 * 60 * 24 * 7)) : 0.4;
      const bugProneness = keywordScore(file.content, ["fix", "bug", "error", "throw", "catch", "todo"]);
      return {
        file: file.path,
        complexity,
        changeFrequency,
        bugProneness,
        refactoringPriority: clamp01((complexity / 40) * 0.5 + changeFrequency * 0.2 + bugProneness * 0.3),
      };
    });
    const securityIssues = findings
      .filter((finding) => finding.agentId === "security")
      .map((finding) => ({
        file: finding.file ?? "unknown",
        severity: normalizeIssueSeverity(finding.severity),
        finding: finding.message,
        remediation: finding.recommendation,
      }));
    const performanceBottlenecks = findings
      .filter((finding) => finding.agentId === "performance")
      .map((finding) => ({
        location: finding.file ?? "unknown",
        severity: bottleneckSeverity(finding.severity),
        cause: finding.message,
        optimization: finding.recommendation,
      }));
    const architectureSmells = hotspots
      .filter((hotspot) => hotspot.refactoringPriority > 0.45)
      .map((hotspot) => ({
        type: "divergent-change" as const,
        location: hotspot.file,
        severity: hotspot.refactoringPriority > 0.75 ? ("high" as const) : ("medium" as const),
        refactoringStrategy: "extrair modulo coeso e manter adaptador fino no arquivo atual",
        estimatedEffort: Math.round(hotspot.refactoringPriority * 8),
      }));
    const penalty =
      findings.reduce((sum, finding) => sum + severityRank(finding.severity), 0) * 4 +
      mean(hotspots.map((hotspot) => hotspot.refactoringPriority)) * 25;
    const health: CodebaseHealth = {
      overallScore: clamp(Math.round(100 - penalty), 0, 100),
      technicalDebt: {
        totalHours: Math.round(hotspots.reduce((sum, hotspot) => sum + hotspot.refactoringPriority * 6, 0)),
        hotspots: hotspots.sort((a, b) => b.refactoringPriority - a.refactoringPriority).slice(0, 20),
        trend: this.trendFromHistory(100 - penalty),
      },
      testCoverage: estimateCoverage(diff),
      securityIssues,
      performanceBottlenecks,
      architectureSmells,
      dependencyHealth: inferDependencyHealth(diff),
    };
    this.persistHealth(health);
    return health;
  }

  private synthesizeReview(findings: ReviewFinding[]): ReviewResult {
    const score = clamp01(1 - findings.reduce((sum, finding) => sum + severityRank(finding.severity), 0) / 30);
    return {
      score,
      findings,
      summary: findings.length
        ? `${findings.length} achados; prioridade: ${findings[0]?.message ?? "revisao"}`
        : "sem riscos relevantes detectados pelo Vulcan",
      quality: qualityFromSignals({
        evidenceCount: findings.length,
        contradictionCount: 0,
        confidence: score,
        uncertaintyCount: findings.filter((finding) => finding.severity === "info").length,
      }),
    };
  }

  private learnFromFindings(findings: ReviewFinding[]): void {
    const previous = this.memory.load();
    const bugPatterns = { ...previous.state.bugPatterns };
    for (const finding of findings) {
      const key = `${finding.agentId}:${finding.message}`;
      bugPatterns[key] = (bugPatterns[key] ?? 0) + severityRank(finding.severity);
    }
    this.memory.save({
      ...previous,
      updatedAt: now(),
      state: { ...previous.state, bugPatterns },
    });
  }

  private trendFromHistory(nextScore: number): "improving" | "stable" | "degrading" {
    const history = this.memory.load().state.healthHistory;
    const previous = history[0]?.overallScore ?? nextScore;
    if (nextScore > previous + 4) return "improving";
    if (nextScore < previous - 4) return "degrading";
    return "stable";
  }

  private persistHealth(health: CodebaseHealth): void {
    const previous = this.memory.load();
    this.memory.save({
      ...previous,
      updatedAt: now(),
      state: {
        ...previous.state,
        healthHistory: [health, ...previous.state.healthHistory].slice(0, 50),
      },
    });
  }
}

export function defaultVulcanAgents(): VulcanReviewAgent[] {
  return [
    new ArchitectureEvolutionAgent(),
    new ProactiveSecurityAgent(),
    new PerformanceOptimizationAgent(),
    new AutomatedRefactoringAgent(),
    new TestIntelligenceAgent(),
  ];
}

export function codeDiffFromText(text: string): CodeDiff {
  return {
    files: [
      {
        path: "request.txt",
        content: text,
      },
    ],
    summary: text.slice(0, 120),
    changedAt: now(),
  };
}

function estimateComplexity(content: string): number {
  const tokens = content.match(/\b(if|for|while|switch|case|catch|\?|&&|\|\|)\b/g) ?? [];
  return 1 + tokens.length;
}

function duplicateLineScore(content: string): number {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 12);
  if (!lines.length) return 0;
  const counts = new Map<string, number>();
  for (const line of lines) counts.set(line, (counts.get(line) ?? 0) + 1);
  const duplicates = [...counts.values()].filter((count) => count > 1).reduce((sum, count) => sum + count, 0);
  return duplicates / lines.length;
}

function severityRank(severity: ReviewFinding["severity"]): number {
  switch (severity) {
    case "critical":
      return 5;
    case "high":
      return 4;
    case "medium":
      return 2.5;
    case "low":
      return 1;
    case "info":
      return 0.5;
  }
}

function normalizeIssueSeverity(severity: ReviewFinding["severity"]): SecurityIssue["severity"] {
  if (severity === "critical" || severity === "high" || severity === "medium" || severity === "low") return severity;
  return "low";
}

function bottleneckSeverity(severity: ReviewFinding["severity"]): Bottleneck["severity"] {
  if (severity === "high") return "high";
  if (severity === "medium") return "medium";
  return "low";
}

function estimateCoverage(diff: CodeDiff): number {
  const production = diff.files.filter((file) => !/\.(test|spec)\./.test(file.path)).length;
  const tests = diff.files.filter((file) => /\.(test|spec)\./.test(file.path)).length;
  if (!production) return 100;
  return Math.round(clamp01(tests / production) * 100);
}

function inferDependencyHealth(diff: CodeDiff): DependencyStatus[] {
  const packageFile = diff.files.find((file) => /package\.json$/.test(file.path));
  if (!packageFile) return [{ name: "dependencies", status: "unknown", reason: "package.json ausente do diff" }];
  try {
    const parsed = JSON.parse(packageFile.content) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    return Object.entries({ ...parsed.dependencies, ...parsed.devDependencies })
      .slice(0, 30)
      .map(([name, version]) => ({
        name,
        status: /latest|\*/.test(version) ? "risky" : "healthy",
        reason: /latest|\*/.test(version) ? "versao nao pinada" : "versao declarada",
      }));
  } catch {
    return [{ name: "package.json", status: "risky", reason: "JSON invalido" }];
  }
}

function emptyHealth(): CodebaseHealth {
  return {
    overallScore: 100,
    technicalDebt: { totalHours: 0, hotspots: [], trend: "stable" },
    testCoverage: 0,
    securityIssues: [],
    performanceBottlenecks: [],
    architectureSmells: [],
    dependencyHealth: [],
  };
}
