import { AsclepiusRuntime } from "@/runtimes/asclepius/AsclepiusRuntime";
import { clinicalCaseFromText, ApolloRuntime } from "@/runtimes/apollo/ApolloRuntime";
import { AthenaRuntime, researchQueryFromText } from "@/runtimes/athena/AthenaRuntime";
import { marketingBriefFromText, HermesRuntime } from "@/runtimes/hermes/HermesRuntime";
import { LogosRuntime } from "@/runtimes/logos/LogosRuntime";
import { MorpheusRuntime } from "@/runtimes/morpheus/MorpheusRuntime";
import { OracleRuntime, strategicContextFromText } from "@/runtimes/oracle/OracleRuntime";
import { PrometheusMindRuntime } from "@/runtimes/prometheus-mind/PrometheusNindRuntime";
import {
  marketTextToPrometheusData,
  PrometheusRuntime,
} from "@/runtimes/prometheus/PrometheusRuntime";
import {
  clamp01,
  keywordScore,
  mean,
  now,
  PersistentCognitiveMemory,
  qualityFromSignals,
  stableId,
  tokenize,
  uniqueMerge,
} from "@/runtimes/shared/cognitiveCore";
import {
  CONFIDENCE_CALIBRATION_RULE,
  GLOBAL_CITATION_RULE,
  NEXUS_PRIME_PARLIAMENT_RULES,
  withRuntimeInstructions,
} from "@/runtimes/shared/runtimeInstructions";
import { SophiaRuntime } from "@/runtimes/sophia/SophiaRuntime";
import { codeDiffFromText, VulcanRuntime } from "@/runtimes/vulcan/VulcanRuntime";
import { HippocratesSupremeRuntime } from "@/runtimes/hippocrates-supreme/HippocratesSupremeRuntime";
import { MendeleevRuntime } from "@/runtimes/mendeleev/MendeleevRuntime";
import { PromptForgeRuntime } from "@/runtimes/prompt-forge/PromptForgeRuntime";
import { SiliconValleyRuntime } from "@/runtimes/silicon-valley/SiliconValleyRuntime";
import { UnrealForgeRuntime } from "@/runtimes/unreal-forge/UnrealForgeRuntime";
import { AegisRuntime } from "@/runtimes/aegis/AegisRuntime";
import { ContentEmpireRuntime } from "@/runtimes/content-empire/ContentEmpireRuntime";
import { AdCommanderRuntime } from "@/runtimes/ad-commander/AdCommanderRuntime";
import { StudioOneRuntime } from "@/runtimes/studio-one/StudioOneRuntime";
import { WallStreetRuntime } from "@/runtimes/wall-street/WallStreetRuntime";
import { PixelForgeRuntime } from "@/runtimes/pixel-forge/PixelForgeRuntime";
import type { SupremeRuntimeResponse } from "@/runtimes/shared/supremeRuntime";
import type { NexusToolInput, NexusToolOutput } from "@/tools/core/NexusToolBase";
import { ToolRegistry } from "@/tools/core/ToolRegistry";
import { getToolsForRuntime } from "@/tools/runtimeIntegration";

export interface CognitiveParliamentSession {
  sessionId: string;
  query: string;
  activeRuntimes: string[];
  perspectives: RuntimePerspective[];
  debate: DebateRecord[];
  synthesis: CognitiveSynthesis;
  uncertainties: string[];
  recommendedFollowup: string[];
}

export interface RuntimePerspective {
  runtimeId: string;
  perspective: string;
  confidence: number;
  evidence: string[];
  limitations: string[];
  collaborationNeeded: string[];
}

export interface DebateRecord {
  round: number;
  runtimeId: string;
  position: string;
  responseTo?: string;
}

export interface CognitiveSynthesis {
  integratedAnswer: string;
  crossDomainInsights: string[];
  confidenceLevel: number;
  dissent: string[];
  actionableConclusions: string[];
  openQuestions: string[];
}

export interface EmergentInsight {
  insight: string;
  sourceRuntimes: string[];
  emergenceType: "convergence" | "contradiction" | "novel-connection";
  noveltyScore: number;
  validationNeeded: boolean;
}

export interface ReasoningQualityReport {
  overallQuality: number;
  biasesDetected: string[];
  blindSpots: string[];
  improvementSuggestions: string[];
  confidenceCalibration: number;
}

export interface EvolutionProposal {
  id: string;
  targetRuntime: string;
  issue: string;
  proposal: string;
  expectedImpact: number;
}

export interface NexusPrimeResponse {
  synthesis: CognitiveSynthesis;
  emergentInsights: EmergentInsight[];
  qualityReport: ReasoningQualityReport;
  activeRuntimes: string[];
  perspectives: RuntimePerspective[];
  processingTimeMs: number;
}

interface NexusMemoryState {
  sessionHistory: CognitiveParliamentSession[];
  routingSuccess: Record<string, number>;
  evolutionProposals: EvolutionProposal[];
}

export class CognitiveParliament {
  readonly systemPrompt = withRuntimeInstructions(
    "Nexus Prime Cognitive Parliament. Integrate runtime perspectives through emergence, productive contradiction, explicit contribution mapping and epistemic limits.",
    GLOBAL_CITATION_RULE,
    CONFIDENCE_CALIBRATION_RULE,
    NEXUS_PRIME_PARLIAMENT_RULES,
  );

  async convene(
    query: string,
    relevantRuntimes: string[],
    perspectives: RuntimePerspective[] = [],
  ): Promise<CognitiveSynthesis> {
    const convergence = this.findConvergence(perspectives);
    const dissent = perspectives
      .filter((perspective) => perspective.confidence < 0.55 || perspective.limitations.length > 1)
      .map((perspective) => `${perspective.runtimeId}: ${perspective.limitations.join("; ")}`);
    const confidenceLevel = clamp01(
      mean(perspectives.map((perspective) => perspective.confidence)) * 0.75 +
        clamp01(convergence.length / Math.max(1, relevantRuntimes.length)) * 0.25,
    );
    const contributionMap = perspectives.map(
      (perspective) => `${perspective.runtimeId}: ${perspective.evidence[0] ?? perspective.perspective.slice(0, 90)}`,
    );
    const epistemicLimits = uniqueMerge(
      [],
      perspectives.flatMap((perspective) => perspective.limitations),
      5,
    );
    const metaphor = this.synthesisMetaphor(relevantRuntimes);
    return {
      integratedAnswer: [
        `Nexus Prime processou "${query.slice(0, 140)}" com ${relevantRuntimes.join(", ")}.`,
        perspectives.map((perspective) => `[${perspective.runtimeId}] ${perspective.perspective}`).join(" "),
        contributionMap.length ? `Mapa de contribuição: ${contributionMap.join(" | ")}.` : "",
        epistemicLimits.length ? `Limites epistêmicos: ${epistemicLimits.join("; ")}.` : "Limites epistêmicos: não há evidência externa suficiente para transformar a síntese em certeza operacional.",
        `Metáfora de síntese: ${metaphor}`,
        `Sintese: agir com confianca ${(confidenceLevel * 100).toFixed(0)}%, preservando incertezas explicitas.`,
      ]
        .filter(Boolean)
        .join(" "),
      crossDomainInsights: convergence,
      confidenceLevel,
      dissent,
      actionableConclusions: this.actionableConclusions(perspectives),
      openQuestions: uniqueMerge([], perspectives.flatMap((perspective) => perspective.limitations), 8),
    };
  }

  private findConvergence(perspectives: RuntimePerspective[]): string[] {
    const insights: string[] = [];
    for (let i = 0; i < perspectives.length; i++) {
      for (let j = i + 1; j < perspectives.length; j++) {
        const a = perspectives[i];
        const b = perspectives[j];
        if (!a || !b) continue;
        const overlap = keywordScore(a.perspective, tokenize(b.perspective));
        if (overlap > 0.18) {
          insights.push(`${a.runtimeId} e ${b.runtimeId} convergem em sinais compartilhados`);
        }
      }
    }
    return uniqueMerge([], insights, 8);
  }

  private actionableConclusions(perspectives: RuntimePerspective[]): string[] {
    return perspectives
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5)
      .map((perspective) => `${perspective.runtimeId}: ${perspective.evidence[0] ?? perspective.perspective}`);
  }

  private synthesisMetaphor(runtimeIds: string[]): string {
    if (runtimeIds.includes("athena") && runtimeIds.includes("oracle")) {
      return "Athena desenha o mapa, Oracle calcula a travessia, e o parlamento decide onde pisar sem fingir que o nevoeiro acabou.";
    }
    if (runtimeIds.includes("sophia") && runtimeIds.includes("logos")) {
      return "Sophia oferece a chama simbólica, Logos molda a lâmpada conceitual, e Nexus Prime regula a luz para não cegar nem apagar.";
    }
    return "Cada runtime é uma margem do mesmo rio; a síntese é a ponte provisória que permite atravessar sem negar a correnteza.";
  }
}

export class MetaCognitionEngine {
  assessReasoningQuality(session: CognitiveParliamentSession): ReasoningQualityReport {
    const confidence = session.synthesis.confidenceLevel;
    const evidenceCount = session.perspectives.reduce(
      (sum, perspective) => sum + perspective.evidence.length,
      0,
    );
    const blindSpots = uniqueMerge(
      [],
      session.perspectives.flatMap((perspective) => perspective.limitations),
      10,
    );
    const biasesDetected = [
      ...(session.activeRuntimes.length === 1 ? ["single-runtime bias"] : []),
      ...(confidence > 0.85 && blindSpots.length > 3 ? ["overconfidence risk"] : []),
      ...(evidenceCount < session.activeRuntimes.length ? ["thin-evidence synthesis"] : []),
    ];
    return {
      overallQuality: qualityFromSignals({
        evidenceCount,
        contradictionCount: session.synthesis.dissent.length,
        confidence,
        uncertaintyCount: blindSpots.length,
      }).score,
      biasesDetected,
      blindSpots,
      improvementSuggestions: biasesDetected.length
        ? ["ativar runtime complementar", "coletar evidencias externas", "reduzir autonomia da decisao"]
        : ["manter parlamento multi-perspectiva e registrar resultado"],
      confidenceCalibration: clamp01(confidence - biasesDetected.length * 0.08),
    };
  }
}

export class EmergenceDetector {
  detectEmergence(perspectives: RuntimePerspective[]): EmergentInsight[] {
    const insights: EmergentInsight[] = [];
    for (let i = 0; i < perspectives.length; i++) {
      for (let j = i + 1; j < perspectives.length; j++) {
        const a = perspectives[i];
        const b = perspectives[j];
        if (!a || !b) continue;
        const overlap = keywordScore(a.perspective, tokenize(b.perspective));
        if (overlap > 0.22) {
          insights.push({
            insight: `INSIGHT EMERGENTE: ${a.runtimeId} e ${b.runtimeId} chegaram a padrao convergente por rotas independentes`,
            sourceRuntimes: [a.runtimeId, b.runtimeId],
            emergenceType: "convergence",
            noveltyScore: clamp01(0.45 + overlap),
            validationNeeded: false,
          });
        } else if (Math.abs(a.confidence - b.confidence) > 0.35) {
          insights.push({
            insight: `CONTRADIÇÃO PRODUTIVA: ${a.runtimeId} e ${b.runtimeId} discordam materialmente; a divergencia revela dimensao oculta`,
            sourceRuntimes: [a.runtimeId, b.runtimeId],
            emergenceType: "contradiction",
            noveltyScore: 0.62,
            validationNeeded: true,
          });
        }
      }
    }
    if (perspectives.length >= 3) {
      insights.push({
        insight: "combinacao multi-runtime sugere solucao por portfolio: agir, medir e adaptar",
        sourceRuntimes: perspectives.map((perspective) => perspective.runtimeId),
        emergenceType: "novel-connection",
        noveltyScore: 0.74,
        validationNeeded: true,
      });
    }
    return uniqueMerge([], insights, 12);
  }
}

export class SelfEvolutionEngine {
  async evolve(sessionHistory: CognitiveParliamentSession[]): Promise<EvolutionProposal[]> {
    const lowQuality = sessionHistory.filter((session) => session.synthesis.confidenceLevel < 0.55);
    const runtimeCounts = new Map<string, number>();
    for (const session of lowQuality) {
      for (const runtime of session.activeRuntimes) {
        runtimeCounts.set(runtime, (runtimeCounts.get(runtime) ?? 0) + 1);
      }
    }
    return [...runtimeCounts.entries()]
      .filter(([, count]) => count >= 2)
      .map(([runtime, count]) => ({
        id: stableId(`${runtime}:${count}:${now()}`),
        targetRuntime: runtime,
        issue: `${count} sessoes recentes com baixa confianca envolvendo ${runtime}`,
        proposal: "aumentar requisitos de evidencia e solicitar colaboracao de runtime complementar",
        expectedImpact: clamp01(0.2 + count / 20),
      }));
  }
}

export class NexusPrimeRuntime {
  readonly systemPrompt = withRuntimeInstructions(
    "Nexus Prime meta-orchestrator. Convene the cognitive parliament, detect emergent convergence, preserve productive contradiction and state epistemic limits.",
    GLOBAL_CITATION_RULE,
    CONFIDENCE_CALIBRATION_RULE,
    NEXUS_PRIME_PARLIAMENT_RULES,
  );

  private readonly runtimes = new Map<string, unknown>([
    ["prometheus", new PrometheusRuntime()],
    ["morpheus", new MorpheusRuntime()],
    ["apollo", new ApolloRuntime()],
    ["hermes", new HermesRuntime()],
    ["athena", new AthenaRuntime()],
    ["vulcan", new VulcanRuntime()],
    ["oracle", new OracleRuntime()],
    ["sophia", new SophiaRuntime()],
    ["asclepius", new AsclepiusRuntime()],
    ["logos", new LogosRuntime()],
    ["prometheus-mind", new PrometheusMindRuntime()],
    ["hippocrates-supreme", new HippocratesSupremeRuntime()],
    ["mendeleev", new MendeleevRuntime()],
    ["prompt-forge", new PromptForgeRuntime()],
    ["silicon-valley", new SiliconValleyRuntime()],
    ["unreal-forge", new UnrealForgeRuntime()],
    ["aegis", new AegisRuntime()],
    ["content-empire", new ContentEmpireRuntime()],
    ["ad-commander", new AdCommanderRuntime()],
    ["studio-one", new StudioOneRuntime()],
    ["wall-street", new WallStreetRuntime()],
    ["pixel-forge", new PixelForgeRuntime()],
  ]);
  private readonly parliament = new CognitiveParliament();
  private readonly metacognition = new MetaCognitionEngine();
  private readonly emergenceDetector = new EmergenceDetector();
  private readonly selfEvolution = new SelfEvolutionEngine();
  private readonly memory = new PersistentCognitiveMemory<NexusMemoryState>(
    "runtime:nexus-prime:parliament",
    () => ({ sessionHistory: [], routingSuccess: {}, evolutionProposals: [] }),
  );
  private sessionHistory: CognitiveParliamentSession[];

  constructor() {
    this.sessionHistory = this.memory.load().state.sessionHistory;
  }

  async process(query: string): Promise<NexusPrimeResponse> {
    const started = now();
    const relevantRuntimes = await this.classifyQuery(query);
    const basePerspectives = await Promise.all(
      relevantRuntimes.map((runtimeId) => this.getRuntimePerspective(runtimeId, query)),
    );
    const perspectives = await Promise.all(
      basePerspectives.map((perspective) => this.enrichPerspectiveWithTools(perspective, query)),
    );
    const emergentInsights = this.emergenceDetector.detectEmergence(perspectives);
    const synthesis = await this.parliament.convene(query, relevantRuntimes, perspectives);
    const session: CognitiveParliamentSession = {
      sessionId: stableId(`${query}:${started}`),
      query,
      activeRuntimes: relevantRuntimes,
      perspectives,
      debate: this.buildDebate(perspectives),
      synthesis,
      uncertainties: synthesis.openQuestions,
      recommendedFollowup: synthesis.actionableConclusions,
    };
    const qualityReport = this.metacognition.assessReasoningQuality(session);
    this.sessionHistory = [session, ...this.sessionHistory].slice(0, 300);
    if (this.sessionHistory.length % 100 === 0) {
      const proposals = await this.selfEvolution.evolve(this.sessionHistory);
      await this.implementEvolutionProposals(proposals);
    }
    this.persist();
    return {
      synthesis,
      emergentInsights,
      qualityReport,
      activeRuntimes: relevantRuntimes,
      perspectives,
      processingTimeMs: now() - started,
    };
  }

  async classifyQuery(query: string): Promise<string[]> {
    const q = query.toLowerCase();
    const scores: Array<{ id: string; score: number }> = [
      { id: "prometheus", score: keywordScore(q, ["crypto", "defi", "memecoin", "market", "solana", "trade"]) },
      { id: "morpheus", score: keywordScore(q, ["game", "3d", "arte", "narrativa", "visual", "shader"]) },
      { id: "apollo", score: keywordScore(q, ["medical", "medico", "diagnostico", "bio", "drug", "clinical"]) },
      { id: "hermes", score: keywordScore(q, ["marketing", "growth", "copy", "social", "campaign", "vendas"]) },
      { id: "athena", score: keywordScore(q, ["research", "pesquisa", "paper", "knowledge", "sintese", "fontes"]) },
      { id: "vulcan", score: keywordScore(q, ["code", "software", "devops", "bug", "arquitetura", "refactor"]) },
      { id: "oracle", score: keywordScore(q, ["strategy", "estrategia", "business", "concorrente", "decisao", "risco"]) },
      { id: "sophia", score: keywordScore(q, ["sacred", "hebrew", "kabbalah", "enoch", "gospel", "mystic", "sumerian", "buddhist", "tao", "indigenous", "shaman", "wisdom"]) },
      { id: "asclepius", score: keywordScore(q, ["healing", "longevity", "herb", "inflammation", "pathway", "metabolic", "sleep", "remedy", "clinical", "medicine", "pubmed"]) },
      { id: "logos", score: keywordScore(q, ["logos", "metaphysics", "ontology", "meaning", "philosophy", "esoteric", "hermetic", "initiation", "self mastery", "virtue"]) },
      { id: "prometheus-mind", score: keywordScore(q, ["neuroscience", "brain", "focus", "memory", "attention", "cognition", "consciousness", "neuroplasticity", "learning", "sleep"]) },
      { id: "hippocrates-supreme", score: keywordScore(q, ["cure", "cancer", "treatment", "mechanism", "drug", "compound", "pathway", "synergy", "dosage", "protocol"]) },
      { id: "mendeleev", score: keywordScore(q, ["chemistry", "molecule", "reaction", "synthesis", "material", "polymer", "battery", "nanoparticle"]) },
      { id: "prompt-forge", score: keywordScore(q, ["prompt", "system prompt", "instruction", "jailbreak", "prompt injection", "meta prompt"]) },
      { id: "silicon-valley", score: keywordScore(q, ["code", "software", "app", "system", "architecture", "frontend", "backend", "sre", "product"]) },
      { id: "unreal-forge", score: keywordScore(q, ["game", "3d", "unreal", "roblox", "unity", "godot", "blueprint", "luau"]) },
      { id: "aegis", score: keywordScore(q, ["security", "attack", "protect", "vulnerability", "waf", "cve", "incident", "prompt injection"]) },
      { id: "content-empire", score: keywordScore(q, ["blog", "seo", "social media", "content", "post", "publish", "wordpress", "analytics"]) },
      { id: "ad-commander", score: keywordScore(q, ["ads", "traffic", "meta ads", "google ads", "paid", "roas", "campaign", "creative"]) },
      { id: "studio-one", score: keywordScore(q, ["video", "tiktok", "youtube", "reels", "streaming", "thumbnail", "script", "retention"]) },
      { id: "wall-street", score: keywordScore(q, ["trade", "crypto", "memecoin", "invest", "portfolio", "polymarket", "wallet", "exchange"]) },
      { id: "pixel-forge", score: keywordScore(q, ["design", "logo", "brand", "graphic", "visual", "mockup", "image prompt", "ui"]) },
    ];
    const selected = scores
      .filter((item) => item.score > 0.05)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((item) => item.id);
    if (selected.length) return selected;
    return ["athena", "oracle"];
  }

  async getRuntimePerspective(runtimeId: string, query: string): Promise<RuntimePerspective> {
    const runtime = this.runtimes.get(runtimeId);
    switch (runtimeId) {
      case "prometheus": {
        const consensus = await (runtime as PrometheusRuntime).process(marketTextToPrometheusData(query));
        return {
          runtimeId,
          perspective: consensus[0]?.event ?? "sem sinal preditivo forte",
          confidence: consensus[0]?.weightedByTrackRecord ?? 0.45,
          evidence: consensus[0]?.evidence ?? ["modelo de mundo atualizado com query textual"],
          limitations: consensus.length ? [] : ["sem dados de mercado em tempo real"],
          collaborationNeeded: ["oracle", "athena"],
        };
      }
      case "morpheus": {
        const works = await (runtime as MorpheusRuntime).createProjectVision(query);
        const best = works[0];
        return {
          runtimeId,
          perspective: best?.content.description ?? "campo estetico sem obra dominante",
          confidence: best?.coherenceWithField ?? 0.55,
          evidence: works.map((work) => work.content.title),
          limitations: ["nao gera assets binarios sem pipeline externo"],
          collaborationNeeded: ["vulcan", "athena"],
        };
      }
      case "apollo": {
        const report = await (runtime as ApolloRuntime).diagnose(clinicalCaseFromText(query));
        return {
          runtimeId,
          perspective: report.primaryDiagnosis
            ? `${report.primaryDiagnosis.condition}: ${(report.primaryDiagnosis.posteriorProbability * 100).toFixed(1)}%`
            : "sem hipotese clinica primaria",
          confidence: report.primaryDiagnosis?.confidence ?? 0.35,
          evidence: report.primaryDiagnosis?.supportingEvidence.map((item) => item.finding) ?? [],
          limitations: [report.disclaimer, ...report.missingInformation.slice(0, 3)],
          collaborationNeeded: ["athena"],
        };
      }
      case "hermes": {
        const campaign = await (runtime as HermesRuntime).createCampaign(marketingBriefFromText(query));
        return {
          runtimeId,
          perspective: `${campaign.selectedContent.headline}; ressonancia=${campaign.prediction.resonanceScore.toFixed(2)}`,
          confidence: campaign.prediction.resonanceScore,
          evidence: campaign.rationale,
          limitations: campaign.prediction.topRisks,
          collaborationNeeded: ["oracle"],
        };
      }
      case "athena": {
        const report = await (runtime as AthenaRuntime).research(researchQueryFromText(query));
        return {
          runtimeId,
          perspective: report.synthesis,
          confidence: report.confidence,
          evidence: report.claims.slice(0, 4).map((claim) => claim.claim),
          limitations: report.gaps.slice(0, 3).map((gap) => gap.missingPiece),
          collaborationNeeded: ["oracle"],
        };
      }
      case "vulcan": {
        const review = await (runtime as VulcanRuntime).handleNewCode(codeDiffFromText(query));
        return {
          runtimeId,
          perspective: review.summary,
          confidence: review.score,
          evidence: review.findings.slice(0, 4).map((finding) => finding.message),
          limitations: review.findings.filter((finding) => finding.severity !== "info").slice(0, 3).map((finding) => finding.recommendation),
          collaborationNeeded: ["morpheus", "athena"],
        };
      }
      case "oracle": {
        const report = await (runtime as OracleRuntime).analyzeStrategicSituation(strategicContextFromText(query));
        return {
          runtimeId,
          perspective: report.recommendedDecision,
          confidence: report.confidence,
          evidence: report.scenarios.slice(0, 3).map((scenario) => `${scenario.name}:${scenario.probability.toFixed(2)}`),
          limitations: report.redTeamRisks.slice(0, 4),
          collaborationNeeded: ["athena", "hermes"],
        };
      }
      case "sophia": {
        const response = await (runtime as SophiaRuntime).process(query);
        const synthesis = (response.result as {
          synthesis: {
            summary: string;
            universalArchetypes: string[];
            convergenceNotes: string[];
            paradoxResolutions: string[];
          };
        }).synthesis;
        return {
          runtimeId,
          perspective: synthesis.summary,
          confidence: response.confidence,
          evidence: uniqueMerge([], [...synthesis.universalArchetypes, ...synthesis.convergenceNotes], 5),
          limitations: [
            "cross-tradition parallels require historical and doctrinal care",
            ...synthesis.paradoxResolutions.slice(0, 2),
          ],
          collaborationNeeded: ["logos", "athena", "oracle"],
        };
      }
      case "asclepius": {
        const response = await (runtime as AsclepiusRuntime).process(query);
        const synthesis = (response.result as {
          synthesis: {
            summary: string;
            pubmedEvidence: Array<{ title: string }>;
            nextSteps: string[];
            disclaimers: string[];
          };
        }).synthesis;
        return {
          runtimeId,
          perspective: synthesis.summary,
          confidence: response.confidence,
          evidence: synthesis.pubmedEvidence.map((item) => item.title).slice(0, 4),
          limitations: synthesis.disclaimers,
          collaborationNeeded: ["apollo", "athena", "prometheus-mind"],
        };
      }
      case "logos": {
        const response = await (runtime as LogosRuntime).process(query);
        const synthesis = (response.result as {
          synthesis: {
            summary: string;
            principles: string[];
            unresolvedTensions: string[];
          };
        }).synthesis;
        return {
          runtimeId,
          perspective: synthesis.summary,
          confidence: response.confidence,
          evidence: synthesis.principles.slice(0, 4),
          limitations: synthesis.unresolvedTensions.slice(0, 3),
          collaborationNeeded: ["sophia", "oracle", "athena"],
        };
      }
      case "prometheus-mind": {
        const response = await (runtime as PrometheusMindRuntime).process(query);
        const synthesis = (response.result as {
          synthesis: {
            summary: string;
            neuralAssessment: { dominantNetworks: string[] };
            risks: string[];
            forecast: string[];
          };
        }).synthesis;
        return {
          runtimeId,
          perspective: synthesis.summary,
          confidence: response.confidence,
          evidence: uniqueMerge([], [...synthesis.neuralAssessment.dominantNetworks, ...synthesis.forecast], 5),
          limitations: synthesis.risks.slice(0, 3),
          collaborationNeeded: ["asclepius", "logos", "athena"],
        };
      }
      case "hippocrates-supreme":
        return this.getSupremePerspective(
          runtimeId,
          runtime as HippocratesSupremeRuntime,
          query,
          ["apollo", "asclepius", "athena"],
        );
      case "mendeleev":
        return this.getSupremePerspective(
          runtimeId,
          runtime as MendeleevRuntime,
          query,
          ["athena", "vulcan"],
        );
      case "prompt-forge":
        return this.getSupremePerspective(
          runtimeId,
          runtime as PromptForgeRuntime,
          query,
          ["nexus-prime", "vulcan"],
        );
      case "silicon-valley":
        return this.getSupremePerspective(
          runtimeId,
          runtime as SiliconValleyRuntime,
          query,
          ["vulcan", "aegis", "prompt-forge"],
        );
      case "unreal-forge":
        return this.getSupremePerspective(
          runtimeId,
          runtime as UnrealForgeRuntime,
          query,
          ["morpheus", "silicon-valley"],
        );
      case "aegis":
        return this.getSupremePerspective(
          runtimeId,
          runtime as AegisRuntime,
          query,
          ["vulcan", "athena"],
        );
      case "content-empire":
        return this.getSupremePerspective(
          runtimeId,
          runtime as ContentEmpireRuntime,
          query,
          ["hermes", "silicon-valley", "ad-commander"],
        );
      case "ad-commander":
        return this.getSupremePerspective(
          runtimeId,
          runtime as AdCommanderRuntime,
          query,
          ["hermes", "content-empire", "oracle"],
        );
      case "studio-one":
        return this.getSupremePerspective(
          runtimeId,
          runtime as StudioOneRuntime,
          query,
          ["content-empire", "pixel-forge"],
        );
      case "wall-street":
        return this.getSupremePerspective(
          runtimeId,
          runtime as WallStreetRuntime,
          query,
          ["prometheus", "oracle", "aegis"],
        );
      case "pixel-forge":
        return this.getSupremePerspective(
          runtimeId,
          runtime as PixelForgeRuntime,
          query,
          ["morpheus", "content-empire", "studio-one"],
        );
      default:
        return {
          runtimeId,
          perspective: "runtime desconhecido",
          confidence: 0.1,
          evidence: [],
          limitations: ["runtime nao registrado"],
          collaborationNeeded: [],
      };
    }
  }

  private async getSupremePerspective(
    runtimeId: string,
    runtime: { buildContext: (query: string) => Promise<{ confidence: number; evidence: string[]; response: SupremeRuntimeResponse }> },
    query: string,
    collaborationNeeded: string[],
  ): Promise<RuntimePerspective> {
    const built = await runtime.buildContext(query);
    return {
      runtimeId,
      perspective: built.response.synthesis.summary,
      confidence: built.confidence,
      evidence: uniqueMerge([], built.evidence, 6),
      limitations: uniqueMerge([], built.response.risks, 4),
      collaborationNeeded,
    };
  }

  private async enrichPerspectiveWithTools(
    perspective: RuntimePerspective,
    query: string,
  ): Promise<RuntimePerspective> {
    if (!ToolRegistry.getAll().length) ToolRegistry.autoRegister();
    const candidateToolIds = getToolsForRuntime(perspective.runtimeId)
      .filter((toolId) => ToolRegistry.get(toolId))
      .filter((toolId) => shouldUseToolForQuery(toolId, query))
      .slice(0, 4);

    if (!candidateToolIds.length) return perspective;

    const settled = await Promise.allSettled(
      candidateToolIds.map(async (toolId) => {
        const tool = ToolRegistry.get(toolId);
        if (!tool) return undefined;
        const output = await tool.execute(this.buildToolInput(toolId, perspective.runtimeId, query));
        return [toolId, output] as const;
      }),
    );

    const outputs = settled
      .filter((item): item is PromiseFulfilledResult<readonly [string, NexusToolOutput] | undefined> => item.status === "fulfilled")
      .map((item) => item.value)
      .filter((item): item is readonly [string, NexusToolOutput] => Boolean(item));

    if (!outputs.length) return perspective;

    const avgToolQuality = mean(outputs.map(([, output]) => output.quality));
    const toolEvidence = outputs
      .slice(0, 5)
      .map(([toolId, output]) => `${toolId}:${Math.round(output.quality * 100)}%`);
    const limitations = outputs.flatMap(([, output]) => output.limitationsEncountered ?? []);
    const learning = outputs
      .map(([toolId, output]) => output.learningExtracted ? `${toolId}: ${output.learningExtracted}` : "")
      .filter(Boolean);

    return {
      ...perspective,
      perspective: [
        perspective.perspective,
        `Tool Forge executou ${outputs.length} tools (${toolEvidence.join(", ")}).`,
      ].join(" "),
      confidence: clamp01(perspective.confidence * 0.76 + avgToolQuality * 0.24),
      evidence: uniqueMerge(perspective.evidence, [...toolEvidence, ...learning], 10),
      limitations: uniqueMerge(perspective.limitations, limitations, 10),
    };
  }

  private buildToolInput(toolId: string, runtimeId: string, query: string): NexusToolInput {
    return {
      params: buildToolParams(toolId, runtimeId, query),
      priority: "normal",
      budgetMs: 7000,
      qualityThreshold: 0.6,
      context: {
        agentId: `nexus-prime:${runtimeId}`,
        runtimeId,
        sessionId: stableId(`${runtimeId}:${toolId}:${query}`),
        previousToolOutputs: new Map(),
        sharedMemory: new Map([["query", query]]),
        executionDepth: 0,
      },
    };
  }

  private buildDebate(perspectives: RuntimePerspective[]): DebateRecord[] {
    return perspectives.flatMap((perspective, index) => [
      {
        round: 1,
        runtimeId: perspective.runtimeId,
        position: perspective.perspective,
      },
      {
        round: 2,
        runtimeId: perspective.runtimeId,
        position: perspective.limitations[0] ?? "sem objeção principal",
        responseTo: perspectives[(index + 1) % perspectives.length]?.runtimeId,
      },
    ]);
  }

  private async implementEvolutionProposals(proposals: EvolutionProposal[]): Promise<void> {
    if (!proposals.length) return;
    const previous = this.memory.load();
    this.memory.save({
      ...previous,
      updatedAt: now(),
      state: {
        ...previous.state,
        evolutionProposals: uniqueMerge(previous.state.evolutionProposals, proposals, 100),
      },
    });
  }

  private persist(): void {
    const previous = this.memory.load();
    const routingSuccess = { ...previous.state.routingSuccess };
    for (const session of this.sessionHistory.slice(0, 20)) {
      for (const runtime of session.activeRuntimes) {
        routingSuccess[runtime] =
          (routingSuccess[runtime] ?? 0) + session.synthesis.confidenceLevel;
      }
    }
    this.memory.save({
      ...previous,
      updatedAt: now(),
      state: {
        ...previous.state,
        sessionHistory: this.sessionHistory,
        routingSuccess,
      },
    });
  }
}

export class NexusAGIBorderSystem {
  private readonly nexusPrime: NexusPrimeRuntime;

  constructor(nexusPrime = new NexusPrimeRuntime()) {
    this.nexusPrime = nexusPrime;
  }

  async query(input: string): Promise<NexusPrimeResponse> {
    return this.nexusPrime.process(input);
  }
}

function shouldUseToolForQuery(toolId: string, query: string): boolean {
  if (toolId !== "knowledge-suprema") return true;
  return keywordScore(query, [
    "paper",
    "pubmed",
    "arxiv",
    "fonte",
    "source",
    "research",
    "pesquisa",
    "medical",
    "clinical",
    "evidence",
  ]) > 0.05;
}

function buildToolParams(
  toolId: string,
  runtimeId: string,
  query: string,
): Record<string, unknown> {
  const base = { query, runtimeId };
  switch (toolId) {
    case "dark-pool-detector":
      return { ...base, asset: inferAsset(query), lookbackHours: 6, type: "dark-pool" };
    case "blockchain-scanner":
      return { ...base, chains: inferChains(query), alertThreshold: 0.66 };
    case "bayesian-updater":
      return {
        ...base,
        priorProbability: 0.5,
        likelihoodRatioPositive: 1.45 + keywordScore(query, ["evidence", "sinal", "dados", "metric"]) * 2,
        likelihoodRatioNegative: 0.72,
        evidencePresent: true,
      };
    case "causal-reasoning":
      return {
        ...base,
        cause: inferCause(runtimeId),
        effect: inferEffect(runtimeId),
        observationalData: {
          baseline: 0.5,
          queryLength: query.length / 1000,
          risk: keywordScore(query, ["risk", "risco", "falha", "erro"]),
        },
        interventionData: {
          outcome: keywordScore(query, ["improve", "otimizar", "crescer", "resolver", "deploy"]) + 0.15,
        },
      };
    case "knowledge-suprema":
      return { ...base, limit: 4, sources: ["local"], includeLocal: true, ingest: false };
    case "tool-composer":
      return { ...base, objective: query, constraints: ["quality-first"] };
    default:
      return base;
  }
}

function inferAsset(query: string): string {
  const upper = query.toUpperCase();
  if (/\bSOL|SOLANA\b/.test(upper)) return "SOL";
  if (/\bBTC|BITCOIN\b/.test(upper)) return "BTC";
  if (/\bETH|ETHEREUM\b/.test(upper)) return "ETH";
  if (/\bBASE\b/.test(upper)) return "BASE";
  return "SOL";
}

function inferChains(query: string): string[] {
  const lower = query.toLowerCase();
  const chains = [
    lower.includes("solana") || lower.includes("sol") ? "solana" : "",
    lower.includes("ethereum") || lower.includes("eth") ? "ethereum" : "",
    lower.includes("base") ? "base" : "",
    lower.includes("arbitrum") ? "arbitrum" : "",
    lower.includes("bsc") || lower.includes("binance") ? "bsc" : "",
  ].filter(Boolean);
  return chains.length ? chains : ["solana", "ethereum", "base"];
}

function inferCause(runtimeId: string): string {
  const causes: Record<string, string> = {
    hermes: "message",
    vulcan: "code-change",
    oracle: "strategic-action",
    "prometheus-mind": "protocol",
    "hippocrates-supreme": "mechanistic-intervention",
    mendeleev: "chemical-route",
    "prompt-forge": "instruction-design",
    "silicon-valley": "software-system",
    "unreal-forge": "game-production-decision",
    aegis: "security-control",
    "content-empire": "content-operation",
    "ad-commander": "media-buying-decision",
    "studio-one": "content-production-choice",
    "wall-street": "market-positioning",
    "pixel-forge": "visual-system-choice",
  };
  return causes[runtimeId] ?? "intervention";
}

function inferEffect(runtimeId: string): string {
  const effects: Record<string, string> = {
    hermes: "conversion",
    vulcan: "defect-rate",
    oracle: "strategic-outcome",
    "prometheus-mind": "cognitive-performance",
    "hippocrates-supreme": "research-protocol-quality",
    mendeleev: "chemical-feasibility",
    "prompt-forge": "prompt-reliability",
    "silicon-valley": "delivery-quality",
    "unreal-forge": "playable-production-quality",
    aegis: "risk-reduction",
    "content-empire": "organic-growth",
    "ad-commander": "ROAS-and-CAC",
    "studio-one": "retention-and-reach",
    "wall-street": "risk-adjusted-return",
    "pixel-forge": "visual-conversion-quality",
  };
  return effects[runtimeId] ?? "outcome";
}
