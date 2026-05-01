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
]);

export async function buildCognitiveRuntimeContext(
  kind: RuntimeKind | undefined,
  prompt: string,
): Promise<CognitiveRuntimeContext | undefined> {
  switch (kind) {
    case "prometheus": {
      const runtime = new PrometheusRuntime();
      const consensus = await runtime.process(marketTextToPrometheusData(prompt));
      const top = consensus[0];
      return {
        label: "Prometheus predictive consensus",
        confidence: top?.weightedByTrackRecord ?? 0.45,
        evidence: top?.evidence ?? [],
        context: [
          "PROMETHEUS RUNTIME ACTIVE",
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
      return {
        label: "Morpheus aesthetic field",
        confidence: works[0]?.coherenceWithField ?? 0.55,
        evidence: works.map((work) => work.content.title),
        context: [
          "MORPHEUS RUNTIME ACTIVE",
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
      return {
        label: "Apollo Bayesian grand round",
        confidence: report.primaryDiagnosis?.confidence ?? 0.35,
        evidence: report.primaryDiagnosis?.supportingEvidence.map((item) => item.finding) ?? [],
        context: [
          "APOLLO RUNTIME ACTIVE",
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
      return {
        label: "Hermes audience memory",
        confidence: campaign.prediction.resonanceScore,
        evidence: campaign.rationale,
        context: [
          "HERMES RUNTIME ACTIVE",
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
      return {
        label: "Athena epistemic web",
        confidence: report.confidence,
        evidence: report.claims.slice(0, 5).map((claim) => claim.claim),
        context: [
          "ATHENA RUNTIME ACTIVE",
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
      return {
        label: "Vulcan living codebase",
        confidence: review.score,
        evidence: review.findings.slice(0, 6).map((finding) => finding.message),
        context: [
          "VULCAN RUNTIME ACTIVE",
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
      return {
        label: "Oracle strategic intelligence",
        confidence: report.confidence,
        evidence: report.scenarios.map((scenario) => `${scenario.name}:${scenario.probability.toFixed(2)}`),
        context: [
          "ORACLE RUNTIME ACTIVE",
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
      return {
        label: "Sophia sacred wisdom field",
        confidence: response.confidence,
        evidence: synthesis.universalArchetypes,
        context: [
          "SOPHIA RUNTIME ACTIVE",
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
      return {
        label: "Asclepius mechanistic healing",
        confidence: response.confidence,
        evidence: synthesis.pubmedEvidence.map((item) => item.title),
        context: [
          "ASCLEPIUS RUNTIME ACTIVE",
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
      return {
        label: "Logos metaphysical architecture",
        confidence: response.confidence,
        evidence: synthesis.principles,
        context: [
          "LOGOS RUNTIME ACTIVE",
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
      return {
        label: "Prometheus-Mind cognitive optimization",
        confidence: response.confidence,
        evidence: synthesis.neuralAssessment.dominantNetworks,
        context: [
          "PROMETHEUS-MIND RUNTIME ACTIVE",
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
      return {
        label: "Nexus Prime cognitive parliament",
        confidence: response.synthesis.confidenceLevel,
        evidence: response.synthesis.actionableConclusions,
        context: [
          "NEXUS PRIME RUNTIME ACTIVE",
          "Use the Cognitive Parliament synthesis as the governing context.",
          response.synthesis.integratedAnswer,
          `Active runtimes: ${response.activeRuntimes.join(", ")}`,
          `Emergent insights: ${response.emergentInsights.map((insight) => insight.insight).join("; ")}`,
          `Quality: ${JSON.stringify(response.qualityReport)}`,
        ].join("\n"),
      };
    }
    default:
      return undefined;
  }
}
