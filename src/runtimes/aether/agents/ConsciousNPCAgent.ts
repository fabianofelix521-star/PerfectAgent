import { BaseCognitiveAgent } from "@/runtimes/_nextgen/BaseCognitiveAgent";
import type { AetherActionResult, AetherDecision, AetherInput, NPCMindState } from "@/runtimes/aether/domain/types";

interface NPCPerception {
  brief: string;
  mind: NPCMindState;
}

export class ConsciousNPCAgent extends BaseCognitiveAgent<AetherInput, NPCPerception, NPCPerception, AetherDecision, AetherActionResult> {
  constructor() {
    super("aether:conscious-npc", "Conscious NPC Agent", "npc-cognition");
  }

  async perceive(input: AetherInput): Promise<NPCPerception> {
    return {
      brief: input.npcBrief ?? input.query,
      mind: {
        curiosity: 0.82,
        fear: 0.22,
        trust: 0.58,
        aggression: 0.31,
        loyalty: 0.67,
        goals: ["protect faction relic", "learn player intent", "avoid meaningless combat"],
      },
    };
  }

  async reason(context: NPCPerception): Promise<AetherDecision> {
    return {
      kind: "simulation",
      confidence: this.clampConfidence((context.mind.curiosity + context.mind.loyalty) / 2),
      scenario: `NPC interprets '${context.brief}' as a loyalty-vs-curiosity dilemma.`,
      projectedOutcome: "NPC first probes the player, then escalates only if relic safety drops below threshold.",
      uncertainty: 0.24,
    };
  }

  async act(decision: AetherDecision): Promise<AetherActionResult> {
    return {
      title: "NPC behavior arc",
      summary: decision.kind === "simulation" ? decision.projectedOutcome : "NPC state interpreted.",
      actions: [
        "Expose trust-building dialogue beats before combat.",
        "Persist NPC memory of player promises and betrayals.",
      ],
      risks: ["Overreactive aggression loops can flatten narrative nuance."],
      confidence: decision.confidence,
    };
  }
}