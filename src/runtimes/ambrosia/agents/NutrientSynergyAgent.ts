import { BaseCognitiveAgent } from "@/runtimes/_nextgen/BaseCognitiveAgent";
import type { AgentDecision } from "@/runtimes/_nextgen/RuntimeTypes";
import type { NutrientInteraction, NutrientProfile } from "@/runtimes/ambrosia/domain/types";

interface NutrientPerception {
  profile: NutrientProfile;
  interactions: NutrientInteraction[];
}

export class NutrientSynergyAgent extends BaseCognitiveAgent<{ query: string }, NutrientPerception, NutrientPerception, AgentDecision, string> {
  constructor() {
    super("ambrosia:nutrient-synergy", "Nutrient Synergy Agent", "nutrient-interactions");
  }

  async perceive(): Promise<NutrientPerception> {
    return {
      profile: {
        vitamins: ["D3", "K2", "B12"],
        minerals: ["magnesium", "zinc", "iron"],
        cofactors: ["vitamin C", "fat intake", "protein matrix"],
      },
      interactions: [
        { pair: ["iron", "vitamin C"], effect: "synergy", rationale: "ascorbate improves non-heme iron absorption" },
        { pair: ["zinc", "iron"], effect: "competition", rationale: "high-dose co-administration may compete for transport" },
      ],
    };
  }

  async reason(context: NutrientPerception): Promise<AgentDecision> {
    return {
      kind: "observation",
      confidence: 0.77,
      signals: context.interactions.map((item) => `${item.pair.join("+")}:${item.effect}`),
      summary: "Nutrient timing and pairing matter more than single-nutrient optimization in isolation.",
    };
  }

  async act(decision: AgentDecision): Promise<string> {
    return decision.kind === "observation" ? decision.summary : "Review nutrient pairings.";
  }
}