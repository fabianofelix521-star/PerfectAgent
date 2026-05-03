import { BaseCognitiveAgent } from "@/runtimes/_nextgen/BaseCognitiveAgent";
import type { AgentDecision } from "@/runtimes/_nextgen/RuntimeTypes";
import type { LongevityPathway, NutritionProtocol } from "@/runtimes/ambrosia/domain/types";

interface LongevityPerception {
  pathways: LongevityPathway[];
  protocol: NutritionProtocol;
}

export class LongevityProtocolAgent extends BaseCognitiveAgent<{ query: string }, LongevityPerception, LongevityPerception, AgentDecision, string> {
  constructor() {
    super("ambrosia:longevity-protocol", "Longevity Protocol Agent", "longevity-modeling");
  }

  async perceive(): Promise<LongevityPerception> {
    return {
      pathways: [
        { pathway: "AMPK", direction: "up", reason: "supports metabolic flexibility" },
        { pathway: "mTOR", direction: "balance", reason: "avoid chronic overactivation while preserving lean mass" },
      ],
      protocol: {
        title: "Recovery-biased longevity stack",
        meals: ["high-protein first meal", "fiber-diverse lunch", "lighter evening meal"],
        timing: ["10-12h feeding window", "finish dinner 3h before sleep"],
        recoveryFocus: ["sleep regularity", "zone-2 movement", "strength training"],
      },
    };
  }

  async reason(context: LongevityPerception): Promise<AgentDecision> {
    return {
      kind: "recommendation",
      confidence: 0.79,
      rationale: context.pathways.map((item) => `${item.pathway}: ${item.reason}`),
      actions: [...context.protocol.meals, ...context.protocol.timing, ...context.protocol.recoveryFocus],
      risks: ["Informational hypothesis only — requires personalization and professional oversight when clinically relevant."],
    };
  }

  async act(decision: AgentDecision): Promise<string> {
    return decision.kind === "recommendation" ? decision.actions.join(" | ") : "Review longevity protocol.";
  }
}