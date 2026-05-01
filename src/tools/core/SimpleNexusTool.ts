import {
  type ExecutionApproach,
  NexusToolBase,
  type NexusToolInput,
  type QualityAssessment,
} from "@/tools/core/NexusToolBase";
import { asString, clamp01, keywordScore, tokenize } from "@/tools/core/toolUtils";

export interface SimpleToolProfile {
  id: string;
  name: string;
  description: string;
  category: string;
  keywords: string[];
  strategy: string;
}

export class SimpleNexusTool extends NexusToolBase {
  id: string;
  name: string;
  description: string;
  category: string;

  constructor(private readonly profile: SimpleToolProfile) {
    super();
    this.id = profile.id;
    this.name = profile.name;
    this.description = profile.description;
    this.category = profile.category;
  }

  protected async reason(input: NexusToolInput): Promise<ExecutionApproach> {
    const text = asString(input.params.query, JSON.stringify(input.params));
    const match = keywordScore(text, this.profile.keywords);
    return {
      shouldProceed: true,
      reason: "",
      strategy: this.profile.strategy,
      reasoning: `${this.name} escolheu ${this.profile.strategy}; match semântico=${match.toFixed(2)}.`,
      alternativesConsidered: ["delegar para super-tool", "executar modo mínimo"],
      estimatedQuality: clamp01(0.55 + match * 0.35),
      estimatedLatencyMs: 25,
    };
  }

  protected async executeCore(input: NexusToolInput): Promise<unknown> {
    const text = asString(input.params.query, JSON.stringify(input.params));
    const tokens = tokenize(text);
    const evidence = this.profile.keywords.filter((keyword) => tokens.includes(keyword));
    return {
      toolId: this.id,
      strategy: this.profile.strategy,
      evidence,
      summary: `${this.name} processou ${tokens.length} sinais e encontrou ${evidence.length} evidências fortes.`,
      recommendations: evidence.length
        ? [`usar ${evidence.slice(0, 3).join(", ")} como eixo de decisão`]
        : ["coletar dados mais específicos para elevar confiança"],
    };
  }

  protected async evaluate(_result: unknown, input: NexusToolInput): Promise<QualityAssessment> {
    const text = asString(input.params.query, JSON.stringify(input.params));
    const score = clamp01(0.55 + keywordScore(text, this.profile.keywords) * 0.35);
    return {
      score,
      confidence: clamp01(score + 0.05),
      limitations: score < 0.65 ? ["entrada genérica; evidência fraca"] : [],
      improvements: score < 0.65 ? ["fornecer dados de domínio ou exemplos"] : [],
    };
  }
}
