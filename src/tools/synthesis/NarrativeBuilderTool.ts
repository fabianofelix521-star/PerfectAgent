import {
  type ExecutionApproach,
  NexusToolBase,
  type NexusToolInput,
  type QualityAssessment,
} from "@/tools/core/NexusToolBase";
import { asRecord, asString, clamp01, keywordScore, tokenize, unique } from "@/tools/core/toolUtils";

interface NarrativeBible {
  facts: string[];
  characters: string[];
  locations: string[];
  rules: string[];
  timeline: string[];
  newConnections?: string[];
}

interface ConsistencyConflict {
  type: "timeline" | "rule" | "character" | "location";
  existing: string;
  incoming: string;
  severity: number;
}

export interface NarrativeBuilderResult {
  consistent: boolean;
  updatedBible?: NarrativeBible;
  conflicts?: ConsistencyConflict[];
  resolution?: { suggestion: string; modifiedElement: Record<string, unknown> };
  newConnections?: string[];
  narrativeStrength?: number;
}

export class NarrativeBuilderTool extends NexusToolBase {
  id = "narrative-builder";
  name = "Narrative Coherence Builder";
  description =
    "Mantém bible narrativa, detecta paradoxos causais e integra novos elementos com consistência.";
  category = "synthesis";

  protected async reason(input: NexusToolInput): Promise<ExecutionApproach> {
    const projectId = asString(input.params.projectId);
    return {
      shouldProceed: Boolean(projectId && input.params.newElement),
      reason: projectId ? "" : "projectId e newElement são obrigatórios",
      strategy: "consistency-first",
      reasoning: "Verificar consistência antes de expandir narrativa evita dívida criativa.",
      alternativesConsidered: ["creativity-first", "append-only-bible"],
      estimatedQuality: 0.88,
      estimatedLatencyMs: 50,
    };
  }

  protected async executeCore(input: NexusToolInput): Promise<NarrativeBuilderResult> {
    const projectId = asString(input.params.projectId);
    const newElement = asRecord(input.params.newElement);
    const existingBible =
      (input.params.existingBible as NarrativeBible | undefined) ??
      (await this.memory.get<NarrativeBible>(`bible:${projectId}`)) ??
      emptyBible();
    const consistencyCheck = this.checkConsistency(newElement, existingBible);
    if (!consistencyCheck.isConsistent) {
      return {
        consistent: false,
        conflicts: consistencyCheck.conflicts,
        resolution: this.suggestResolution(newElement, consistencyCheck.conflicts),
      };
    }
    const updatedBible = this.integrateElement(newElement, existingBible);
    await this.memory.set(`bible:${projectId}`, updatedBible);
    return {
      consistent: true,
      updatedBible,
      newConnections: updatedBible.newConnections,
      narrativeStrength: this.calculateNarrativeStrength(updatedBible),
    };
  }

  protected async evaluate(result: unknown): Promise<QualityAssessment> {
    const narrative = result as NarrativeBuilderResult | null;
    return {
      score: narrative?.consistent ? narrative.narrativeStrength ?? 0.8 : 0.35,
      confidence: narrative?.consistent ? 0.85 : 0.72,
      limitations: narrative?.consistent ? [] : ["inconsistências narrativas detectadas"],
      improvements: narrative?.consistent ? [] : ["aplicar resolução sugerida antes de integrar"],
    };
  }

  private checkConsistency(
    element: Record<string, unknown>,
    bible: NarrativeBible,
  ): { isConsistent: boolean; conflicts: ConsistencyConflict[] } {
    const incoming = JSON.stringify(element).toLowerCase();
    const conflicts: ConsistencyConflict[] = [];
    for (const rule of bible.rules) {
      const ruleTokens = tokenize(rule);
      const hasNegation = /\b(no|not|never|nao|nunca|sem)\b/i.test(incoming);
      if (keywordScore(incoming, ruleTokens) > 0.35 && hasNegation) {
        conflicts.push({ type: "rule", existing: rule, incoming, severity: 0.82 });
      }
    }
    for (const event of bible.timeline) {
      if (keywordScore(incoming, tokenize(event)) > 0.42 && /\bbefore|antes|after|depois\b/i.test(incoming)) {
        conflicts.push({ type: "timeline", existing: event, incoming, severity: 0.58 });
      }
    }
    return { isConsistent: conflicts.length === 0, conflicts };
  }

  private suggestResolution(
    element: Record<string, unknown>,
    conflicts: ConsistencyConflict[],
  ): { suggestion: string; modifiedElement: Record<string, unknown> } {
    return {
      suggestion: `Transformar conflito em revelação diegética: ${conflicts[0]?.existing ?? "regra"} passa a ter exceção documentada.`,
      modifiedElement: {
        ...element,
        narrativeResolution: "exceção explicitada e ancorada em causa verificável",
      },
    };
  }

  private integrateElement(element: Record<string, unknown>, bible: NarrativeBible): NarrativeBible {
    const text = JSON.stringify(element);
    const facts = unique([...bible.facts, text.slice(0, 160)], 200);
    const tokens = tokenize(text);
    const newConnections = facts
      .filter((fact) => keywordScore(fact, tokens) > 0.2)
      .slice(0, 8);
    return {
      ...bible,
      facts,
      characters: unique([...bible.characters, ...extractTagged(element, "character")], 80),
      locations: unique([...bible.locations, ...extractTagged(element, "location")], 80),
      rules: unique([...bible.rules, ...extractTagged(element, "rule")], 80),
      timeline: unique([...bible.timeline, ...extractTagged(element, "event")], 160),
      newConnections,
    };
  }

  private calculateNarrativeStrength(bible: NarrativeBible): number {
    const density =
      bible.facts.length * 0.01 +
      bible.characters.length * 0.03 +
      bible.locations.length * 0.02 +
      bible.rules.length * 0.03 +
      (bible.newConnections?.length ?? 0) * 0.04;
    return clamp01(0.55 + density);
  }
}

function emptyBible(): NarrativeBible {
  return {
    facts: [],
    characters: [],
    locations: [],
    rules: [],
    timeline: [],
    newConnections: [],
  };
}

function extractTagged(element: Record<string, unknown>, key: string): string[] {
  const value = element[key] ?? element[`${key}s`];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  return [];
}
