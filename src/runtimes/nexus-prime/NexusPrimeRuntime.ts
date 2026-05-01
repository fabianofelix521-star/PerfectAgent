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
import { SophiaRuntime } from "@/runtimes/sophia/SophiaRuntime";
import { codeDiffFromText, VulcanRuntime } from "@/runtimes/vulcan/VulcanRuntime";

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
    return {
      integratedAnswer: [
        `Nexus Prime processou "${query.slice(0, 140)}" com ${relevantRuntimes.join(", ")}.`,
        perspectives.map((perspective) => `[${perspective.runtimeId}] ${perspective.perspective}`).join(" "),
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
            insight: `${a.runtimeId} e ${b.runtimeId} chegaram a padrao convergente por rotas independentes`,
            sourceRuntimes: [a.runtimeId, b.runtimeId],
            emergenceType: "convergence",
            noveltyScore: clamp01(0.45 + overlap),
            validationNeeded: false,
          });
        } else if (Math.abs(a.confidence - b.confidence) > 0.35) {
          insights.push({
            insight: `${a.runtimeId} e ${b.runtimeId} discordam materialmente; a divergencia revela dimensao oculta`,
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
    const perspectives = await Promise.all(
      relevantRuntimes.map((runtimeId) => this.getRuntimePerspective(runtimeId, query)),
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
