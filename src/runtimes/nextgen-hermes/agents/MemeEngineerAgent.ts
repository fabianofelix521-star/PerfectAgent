import { BaseCognitiveAgent } from "@/runtimes/_nextgen/BaseCognitiveAgent";
import type { ContentVariant, HermesDecision, MemeScore } from "@/runtimes/nextgen-hermes/domain/types";

interface MemePerception {
  variant: ContentVariant;
  score: MemeScore;
}

export class MemeEngineerAgent extends BaseCognitiveAgent<{ query: string }, MemePerception, MemePerception, HermesDecision, string> {
  constructor() {
    super("hermes-next:meme-engineer", "Meme Engineer Agent", "memetic-content");
  }

  async perceive(input: { query: string }): Promise<MemePerception> {
    return {
      variant: { hook: `What everyone misses about ${input.query}`, angle: "curiosity-gap + proof", callToAction: "save and compare" },
      score: { novelty: 0.73, resonance: 0.78, ethicalScore: 0.86 },
    };
  }

  async reason(context: MemePerception): Promise<HermesDecision> {
    return {
      kind: "recommendation",
      confidence: context.score.resonance,
      rationale: ["High resonance is acceptable only while ethical score remains strong."],
      actions: [context.variant.hook, context.variant.angle, context.variant.callToAction],
      risks: ["Do not use coercive or manipulative framing."],
    };
  }

  async act(decision: HermesDecision): Promise<string> {
    return decision.kind === "recommendation" ? decision.actions.join(" | ") : "Review content variant.";
  }
}