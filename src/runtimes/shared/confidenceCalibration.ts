import { clamp01 } from "@/runtimes/shared/cognitiveCore";

export interface ConfidenceCalibratableOutput {
  result?: unknown;
  confidence?: number;
  toolsUsed?: string[];
  followUpSuggestions?: string[];
  collaborationNeeded?: string[];
}

export function calibrateAnalysisConfidence(
  output: ConfidenceCalibratableOutput,
): number {
  const completeness = assessOutputCompleteness(output);
  const evidenceQuality = assessOutputEvidence(output);
  const actionability = assessOutputActionability(output);
  const coherence = assessOutputCoherence(output);
  const depth = assessOutputDepth(output);
  const confidence =
    completeness * 0.25 +
    evidenceQuality * 0.25 +
    actionability * 0.2 +
    coherence * 0.2 +
    depth * 0.1;

  return clamp01(Math.max(confidence, 0.5));
}

export function assessOutputCompleteness(output: ConfidenceCalibratableOutput): number {
  const result = asRecord(output.result);
  const explicitSections = arrayFromKey(result, "sections");
  const sections = explicitSections.length
    ? explicitSections
    : Object.keys(result).filter((key) => key !== "semanticProfile");
  const requestedPointsValue = result.requestedPoints;
  const requestedPoints =
    typeof requestedPointsValue === "number" && requestedPointsValue > 0
      ? requestedPointsValue
      : Math.max(1, Math.min(5, sections.length || 1));
  return clamp01(sections.length / requestedPoints);
}

export function assessOutputEvidence(output: ConfidenceCalibratableOutput): number {
  const result = asRecord(output.result);
  const citations = collectArraysByKeys(result, [
    "citations",
    "sources",
    "references",
    "pubmedEvidence",
    "evidence",
    "evidenceBasis",
    "supportingEvidence",
    "supportingSignals",
    "parallelTexts",
  ]);
  const dataPoints = collectArraysByKeys(result, [
    "dataPoints",
    "claims",
    "hypotheses",
    "scenarios",
    "recommendations",
    "protocol",
    "traditions",
    "signals",
    "biomarkers",
    "findings",
  ]);

  if (citations.length > 5 && dataPoints.length > 3) return 0.95;
  if (citations.length > 2) return 0.75;
  if (dataPoints.length > 3 || (output.toolsUsed?.length ?? 0) > 1) return 0.65;
  return 0.5;
}

export function assessOutputActionability(output: ConfidenceCalibratableOutput): number {
  const result = asRecord(output.result);
  const actions = collectArraysByKeys(result, [
    "recommendations",
    "recommendedActions",
    "nextSteps",
    "followUpSuggestions",
    "practicalLevers",
    "practicalWisdom",
    "therapeuticOptions",
    "diagnosticNextSteps",
    "implementationPlan",
    "productionNotes",
    "actionableConclusions",
  ]);
  const followUps = output.followUpSuggestions ?? [];
  return actions.length + followUps.length > 0 ? 0.85 : 0.4;
}

export function assessOutputCoherence(output: ConfidenceCalibratableOutput): number {
  const serialized = safeStringify(output.result).toLowerCase();
  const contradictionMarkers = [
    "contradiction unresolved",
    "inconsistent",
    "cannot determine",
    "dados insuficientes",
  ];
  return contradictionMarkers.some((marker) => serialized.includes(marker)) ? 0.68 : 0.9;
}

export function assessOutputDepth(output: ConfidenceCalibratableOutput): number {
  const wordCountProxy = safeStringify(output.result).length;
  if (wordCountProxy > 5000) return 0.9;
  if (wordCountProxy > 2000) return 0.7;
  return 0.5;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function arrayFromKey(record: Record<string, unknown>, key: string): unknown[] {
  const value = record[key];
  return Array.isArray(value) ? value : [];
}

function collectArraysByKeys(value: unknown, keys: string[], depth = 0): unknown[] {
  if (depth > 4 || !value || typeof value !== "object") return [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectArraysByKeys(item, keys, depth + 1));
  }

  const record = value as Record<string, unknown>;
  return Object.entries(record).flatMap(([key, nestedValue]) => {
    const direct = keys.includes(key) && Array.isArray(nestedValue) ? nestedValue : [];
    return [...direct, ...collectArraysByKeys(nestedValue, keys, depth + 1)];
  });
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return "{}";
  }
}