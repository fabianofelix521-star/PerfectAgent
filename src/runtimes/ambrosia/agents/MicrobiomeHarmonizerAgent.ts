import { BaseCognitiveAgent } from "@/runtimes/_nextgen/BaseCognitiveAgent";
import type { AgentDecision } from "@/runtimes/_nextgen/RuntimeTypes";
import type { MicrobiomeProfile } from "@/runtimes/ambrosia/domain/types";

interface MicroInput { query: string }

export class MicrobiomeHarmonizerAgent extends BaseCognitiveAgent<MicroInput, MicrobiomeProfile, MicrobiomeProfile, AgentDecision, string> {
  constructor() {
    super("ambrosia:microbiome-harmonizer", "Microbiome Harmonizer Agent", "microbiome-balance");
  }

  async perceive(): Promise<MicrobiomeProfile> {
    return {
      diversityScore: 0.63,
      beneficialSpecies: ["Bifidobacterium", "Akkermansia", "Faecalibacterium"],
      watchSignals: ["low fermentable fiber variety", "irregular feeding cadence"],
    };
  }

  async reason(context: MicrobiomeProfile): Promise<AgentDecision> {
    return {
      kind: "recommendation",
      confidence: this.clampConfidence(context.diversityScore),
      rationale: ["Diversity improves with rotational fibers and consistent recovery habits."],
      actions: ["Rotate polyphenol-rich plants weekly.", "Pair fermented foods with tolerated fibers.", "Avoid over-constraining the menu without evidence."],
      risks: context.watchSignals,
    };
  }

  async act(decision: AgentDecision): Promise<string> {
    return decision.kind === "recommendation" ? decision.actions.join(" ") : "Observe microbiome trends.";
  }
}