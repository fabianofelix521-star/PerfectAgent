import type { RuntimeKind } from "@/types";
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
import { SophiaRuntime } from "@/runtimes/sophia/SophiaRuntime";
import { codeDiffFromText, VulcanRuntime } from "@/runtimes/vulcan/VulcanRuntime";
import { NexusAGIBorderSystem } from "@/runtimes/nexus-prime/NexusPrimeRuntime";
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
import { calibrateAnalysisConfidence } from "@/runtimes/shared/confidenceCalibration";
import {
  APOLLO_BAYESIAN_REASONING_RULE,
  ASCLEPIUS_ADVANCED_MEDICINE_RULES,
  ATHENA_RESEARCH_RULES,
  CONFIDENCE_CALIBRATION_RULE,
  GLOBAL_CITATION_RULE,
  HERMES_PRICING_STRATEGY_RULE,
  LOGOS_PHILOSOPHY_RULES,
  MORPHEUS_PRODUCTION_FEASIBILITY_RULE,
  NEXUS_PRIME_PARLIAMENT_RULES,
  ORACLE_STRATEGY_RULES,
  PROMETHEUS_MIND_RULES,
  PROMETHEUS_ON_CHAIN_FORENSICS_RULE,
  SOPHIA_SPIRITUAL_RULES,
  VULCAN_ARCHITECTURE_RULES,
  withRuntimeInstructions,
} from "@/runtimes/shared/runtimeInstructions";

export interface CognitiveRuntimeContext {
  label: string;
  context: string;
  confidence: number;
  evidence: string[];
}

export const COGNITIVE_RUNTIME_KINDS = new Set<RuntimeKind>([
  "prometheus",
  "morpheus-creative",
  "apollo",
  "hermes",
  "athena",
  "vulcan",
  "oracle",
  "sophia",
  "asclepius",
  "logos",
  "prometheus-mind",
  "nexus-prime",
  "hippocrates-supreme",
  "mendeleev",
  "prompt-forge",
  "silicon-valley",
  "unreal-forge",
  "aegis",
  "content-empire",
  "ad-commander",
  "studio-one",
  "wall-street",
  "pixel-forge",
]);

function runtimeInstructionsFor(kind: RuntimeKind): string {
  const specific: Partial<Record<RuntimeKind, string>> = {
    prometheus: PROMETHEUS_ON_CHAIN_FORENSICS_RULE,
    "morpheus-creative": MORPHEUS_PRODUCTION_FEASIBILITY_RULE,
    apollo: APOLLO_BAYESIAN_REASONING_RULE,
    hermes: HERMES_PRICING_STRATEGY_RULE,
    athena: ATHENA_RESEARCH_RULES,
    vulcan: VULCAN_ARCHITECTURE_RULES,
    oracle: ORACLE_STRATEGY_RULES,
    sophia: SOPHIA_SPIRITUAL_RULES,
    asclepius: ASCLEPIUS_ADVANCED_MEDICINE_RULES,
    logos: LOGOS_PHILOSOPHY_RULES,
    "prometheus-mind": PROMETHEUS_MIND_RULES,
    "nexus-prime": NEXUS_PRIME_PARLIAMENT_RULES,
  };
  return withRuntimeInstructions(
    GLOBAL_CITATION_RULE,
    CONFIDENCE_CALIBRATION_RULE,
    specific[kind],
  );
}

function analysisQualityConfidence(result: unknown, fallback: number, floor = 0.5): number {
  return Math.max(calibrateAnalysisConfidence({ result, confidence: fallback }), floor);
}

async function buildSupremeRuntimeContext(
  kind: RuntimeKind,
  runtime: { buildContext: (query: string) => Promise<{ label: string; context: string; confidence: number; evidence: string[]; response: SupremeRuntimeResponse }> },
  prompt: string,
): Promise<CognitiveRuntimeContext> {
  const built = await runtime.buildContext(prompt);
  const confidence = analysisQualityConfidence(built.response, built.confidence, 0.82);
  return {
    label: built.label,
    confidence,
    evidence: built.evidence,
    context: [
      built.context,
      runtimeInstructionsFor(kind),
      `Runtime response confidence=${confidence.toFixed(2)}`,
    ].join("\n"),
  };
}

export async function buildCognitiveRuntimeContext(
  kind: RuntimeKind | undefined,
  prompt: string,
): Promise<CognitiveRuntimeContext | undefined> {
  switch (kind) {
    case "prometheus": {
      const runtime = new PrometheusRuntime();
      const consensus = await runtime.process(marketTextToPrometheusData(prompt));
      const top = consensus[0];
      const confidence = analysisQualityConfidence(
        { top, consensus, quality: runtime.assessQuality() },
        top?.weightedByTrackRecord ?? 0.45,
        consensus.length ? 0.78 : 0.5,
      );
      return {
        label: "Prometheus predictive consensus",
        confidence,
        evidence: top?.evidence ?? [],
        context: [
          "PROMETHEUS RUNTIME ACTIVE",
          runtimeInstructionsFor("prometheus"),
          "Use predictive consensus, dissent and risk-calibrated action sizing.",
          top
            ? `Top event: ${top.event}; probability=${top.consensusProbability.toFixed(2)}; weighted=${top.weightedByTrackRecord.toFixed(2)}; action=${top.suggestedAction}`
            : "No high-confidence event yet; ask for richer market/on-chain/social data.",
          `Quality: ${JSON.stringify(runtime.assessQuality())}`,
        ].join("\n"),
      };
    }
    case "morpheus-creative": {
      const runtime = new MorpheusRuntime();
      const works = await runtime.createProjectVision(prompt);
      const confidence = analysisQualityConfidence(
        { works, aestheticField: runtime.getAestheticField() },
        works[0]?.coherenceWithField ?? 0.55,
        works.length ? 0.9 : 0.5,
      );
      return {
        label: "Morpheus aesthetic field",
        confidence,
        evidence: works.map((work) => work.content.title),
        context: [
          "MORPHEUS RUNTIME ACTIVE",
          runtimeInstructionsFor("morpheus-creative"),
          "Honor the emergent aesthetic field and preserve coherence across code, art, mechanics and narrative.",
          ...works.map(
            (work) =>
              `${work.type}: ${work.content.description}\nPlan: ${work.content.implementationPlan.join(" -> ")}`,
          ),
          `Aesthetic coherence=${runtime.getAestheticField().coherenceScore.toFixed(2)}`,
        ].join("\n\n"),
      };
    }
    case "apollo": {
      const runtime = new ApolloRuntime();
      const report = await runtime.diagnose(clinicalCaseFromText(prompt));
      const confidence = analysisQualityConfidence(report, report.primaryDiagnosis?.confidence ?? 0.35, report.primaryDiagnosis ? 0.88 : 0.5);
      return {
        label: "Apollo Bayesian grand round",
        confidence,
        evidence: report.primaryDiagnosis?.supportingEvidence.map((item) => item.finding) ?? [],
        context: [
          "APOLLO RUNTIME ACTIVE",
          runtimeInstructionsFor("apollo"),
          "Educational medical reasoning only. Preserve uncertainty and ask for clinical evaluation.",
          `Primary: ${report.primaryDiagnosis?.condition ?? "none"} (${(
            (report.primaryDiagnosis?.posteriorProbability ?? 0) * 100
          ).toFixed(1)}%)`,
          `Urgency: ${report.urgencyLevel}`,
          `Missing: ${report.missingInformation.join("; ")}`,
          `Disclaimer: ${report.disclaimer}`,
        ].join("\n"),
      };
    }
    case "hermes": {
      const runtime = new HermesRuntime();
      const campaign = await runtime.createCampaign(marketingBriefFromText(prompt));
      const confidence = analysisQualityConfidence(campaign, campaign.prediction.resonanceScore, 0.79);
      return {
        label: "Hermes audience memory",
        confidence,
        evidence: campaign.rationale,
        context: [
          "HERMES RUNTIME ACTIVE",
          runtimeInstructionsFor("hermes"),
          "Use audience memory, psychographics and resonance prediction.",
          `Selected content: ${campaign.selectedContent.headline}`,
          `Body: ${campaign.selectedContent.body}`,
          `Prediction: CTR=${campaign.prediction.estimatedCTR.toFixed(3)} conversion=${campaign.prediction.estimatedConversion.toFixed(3)} resonance=${campaign.prediction.resonanceScore.toFixed(2)}`,
          `Risks: ${campaign.prediction.topRisks.join("; ")}`,
        ].join("\n"),
      };
    }
    case "athena": {
      const runtime = new AthenaRuntime();
      const report = await runtime.research(researchQueryFromText(prompt));
      const confidence = analysisQualityConfidence(report, report.confidence, report.claims.length ? 0.9 : 0.5);
      return {
        label: "Athena epistemic web",
        confidence,
        evidence: report.claims.slice(0, 5).map((claim) => claim.claim),
        context: [
          "ATHENA RUNTIME ACTIVE",
          runtimeInstructionsFor("athena"),
          "Use claim provenance, contradiction resolution and confidence calibration.",
          report.synthesis,
          `Contradictions: ${report.contradictions.map((item) => item.resolution).join("; ")}`,
          `Gaps: ${report.gaps.map((gap) => gap.missingPiece).join("; ")}`,
        ].join("\n"),
      };
    }
    case "vulcan": {
      const runtime = new VulcanRuntime();
      const review = await runtime.handleNewCode(codeDiffFromText(prompt));
      const confidence = analysisQualityConfidence(review, review.score, 0.86);
      return {
        label: "Vulcan living codebase",
        confidence,
        evidence: review.findings.slice(0, 6).map((finding) => finding.message),
        context: [
          "VULCAN RUNTIME ACTIVE",
          runtimeInstructionsFor("vulcan"),
          "Treat the codebase as a living system. Prioritize architecture, security, performance and tests.",
          `Review summary: ${review.summary}`,
          `Findings: ${review.findings.map((finding) => `${finding.severity}:${finding.message}`).join("; ")}`,
          `Health score: ${runtime.getCodebaseHealth().overallScore}`,
        ].join("\n"),
      };
    }
    case "oracle": {
      const runtime = new OracleRuntime();
      const report = await runtime.analyzeStrategicSituation(strategicContextFromText(prompt));
      const confidence = analysisQualityConfidence(report, report.confidence, report.scenarios.length ? 0.83 : 0.5);
      return {
        label: "Oracle strategic intelligence",
        confidence,
        evidence: report.scenarios.map((scenario) => `${scenario.name}:${scenario.probability.toFixed(2)}`),
        context: [
          "ORACLE RUNTIME ACTIVE",
          runtimeInstructionsFor("oracle"),
          "Use adversarial scenario planning, weak signals and red-team realism.",
          `Decision: ${report.recommendedDecision}`,
          `Scenarios: ${report.scenarios.map((scenario) => `${scenario.name}=${scenario.probability.toFixed(2)}`).join("; ")}`,
          `Risks: ${report.redTeamRisks.join("; ")}`,
        ].join("\n"),
      };
    }
    case "sophia": {
      const response = await new SophiaRuntime().process(prompt);
      const synthesis = (response.result as {
        synthesis: {
          summary: string;
          universalArchetypes: string[];
          convergenceNotes: string[];
          practicalWisdom: string[];
          paradoxResolutions: string[];
        };
      }).synthesis;
      const confidence = analysisQualityConfidence(response, response.confidence, 0.93);
      return {
        label: "Sophia sacred wisdom field",
        confidence,
        evidence: synthesis.universalArchetypes,
        context: [
          "SOPHIA RUNTIME ACTIVE",
          runtimeInstructionsFor("sophia"),
          "Use cross-tradition resonance carefully and preserve the differences between traditions.",
          synthesis.summary,
          `Archetypes: ${synthesis.universalArchetypes.join("; ") || "none dominant"}`,
          `Convergences: ${synthesis.convergenceNotes.join("; ")}`,
          `Practical wisdom: ${synthesis.practicalWisdom.join("; ")}`,
          `Paradox notes: ${synthesis.paradoxResolutions.join("; ")}`,
        ].join("\n"),
      };
    }
    case "asclepius": {
      const response = await new AsclepiusRuntime().process(prompt);
      const synthesis = (response.result as {
        synthesis: {
          summary: string;
          mechanisticSynthesis: string;
          nextSteps: string[];
          pubmedEvidence: Array<{ title: string }>;
          disclaimers: string[];
        };
      }).synthesis;
      const confidence = analysisQualityConfidence(response, response.confidence, 0.85);
      return {
        label: "Asclepius mechanistic healing",
        confidence,
        evidence: synthesis.pubmedEvidence.map((item) => item.title),
        context: [
          "ASCLEPIUS RUNTIME ACTIVE",
          runtimeInstructionsFor("asclepius"),
          "Educational healing reasoning only. Keep medical uncertainty and clinician escalation explicit.",
          synthesis.summary,
          synthesis.mechanisticSynthesis,
          `PubMed: ${synthesis.pubmedEvidence.map((item) => item.title).join("; ") || "no PubMed hits"}`,
          `Next steps: ${synthesis.nextSteps.join("; ")}`,
          `Disclaimers: ${synthesis.disclaimers.join("; ")}`,
        ].join("\n"),
      };
    }
    case "logos": {
      const response = await new LogosRuntime().process(prompt);
      const synthesis = (response.result as {
        synthesis: {
          summary: string;
          architecture: { thesis: string; bridges: string[] };
          principles: string[];
          unresolvedTensions: string[];
        };
      }).synthesis;
      const confidence = analysisQualityConfidence(response, response.confidence, 0.8);
      return {
        label: "Logos metaphysical architecture",
        confidence,
        evidence: synthesis.principles,
        context: [
          "LOGOS RUNTIME ACTIVE",
          runtimeInstructionsFor("logos"),
          "Use worldview architecture, evidence-aware initiatory history, and disciplined self-mastery.",
          synthesis.summary,
          `Architecture: ${synthesis.architecture.thesis}`,
          `Principles: ${synthesis.principles.join("; ")}`,
          `Tensions: ${synthesis.unresolvedTensions.join("; ")}`,
        ].join("\n"),
      };
    }
    case "prometheus-mind": {
      const response = await new PrometheusMindRuntime().process(prompt);
      const synthesis = (response.result as {
        synthesis: {
          summary: string;
          neuralAssessment: { dominantNetworks: string[]; bottlenecks: string[] };
          performanceProtocol: Array<{ lever: string; measurement: string }>;
          forecast: string[];
          risks: string[];
        };
      }).synthesis;
      const confidence = analysisQualityConfidence(response, response.confidence, 0.78);
      return {
        label: "Prometheus-Mind cognitive optimization",
        confidence,
        evidence: synthesis.neuralAssessment.dominantNetworks,
        context: [
          "PROMETHEUS-MIND RUNTIME ACTIVE",
          runtimeInstructionsFor("prometheus-mind"),
          "Use neuroscience, recovery architecture, and measurable cognitive-performance loops.",
          synthesis.summary,
          `Networks: ${synthesis.neuralAssessment.dominantNetworks.join("; ")}`,
          `Bottlenecks: ${synthesis.neuralAssessment.bottlenecks.join("; ")}`,
          `Protocol: ${synthesis.performanceProtocol.map((item) => `${item.lever} -> ${item.measurement}`).join("; ")}`,
          `Forecast: ${synthesis.forecast.join("; ")}`,
          `Risks: ${synthesis.risks.join("; ")}`,
        ].join("\n"),
      };
    }
    case "nexus-prime": {
      const response = await new NexusAGIBorderSystem().query(prompt);
      const confidence = analysisQualityConfidence(response, response.synthesis.confidenceLevel, 0.92);
      return {
        label: "Nexus Prime cognitive parliament",
        confidence,
        evidence: response.synthesis.actionableConclusions,
        context: [
          "NEXUS PRIME RUNTIME ACTIVE",
          runtimeInstructionsFor("nexus-prime"),
          "Use the Cognitive Parliament synthesis as the governing context.",
          response.synthesis.integratedAnswer,
          `Active runtimes: ${response.activeRuntimes.join(", ")}`,
          `Emergent insights: ${response.emergentInsights.map((insight) => insight.insight).join("; ")}`,
          `Quality: ${JSON.stringify(response.qualityReport)}`,
        ].join("\n"),
      };
    }
    case "hippocrates-supreme":
      return buildSupremeRuntimeContext(kind, new HippocratesSupremeRuntime(), prompt);
    case "mendeleev":
      return buildSupremeRuntimeContext(kind, new MendeleevRuntime(), prompt);
    case "prompt-forge":
      return buildSupremeRuntimeContext(kind, new PromptForgeRuntime(), prompt);
    case "silicon-valley":
      return buildSupremeRuntimeContext(kind, new SiliconValleyRuntime(), prompt);
    case "unreal-forge":
      return buildSupremeRuntimeContext(kind, new UnrealForgeRuntime(), prompt);
    case "aegis":
      return buildSupremeRuntimeContext(kind, new AegisRuntime(), prompt);
    case "content-empire":
      return buildSupremeRuntimeContext(kind, new ContentEmpireRuntime(), prompt);
    case "ad-commander":
      return buildSupremeRuntimeContext(kind, new AdCommanderRuntime(), prompt);
    case "studio-one":
      return buildSupremeRuntimeContext(kind, new StudioOneRuntime(), prompt);
    case "wall-street":
      return buildSupremeRuntimeContext(kind, new WallStreetRuntime(), prompt);
    case "pixel-forge":
      return buildSupremeRuntimeContext(kind, new PixelForgeRuntime(), prompt);
    default:
      return undefined;
  }
}
