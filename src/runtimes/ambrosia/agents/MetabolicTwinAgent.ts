import { BaseCognitiveAgent } from "@/runtimes/_nextgen/BaseCognitiveAgent";
import type { AgentDecision } from "@/runtimes/_nextgen/RuntimeTypes";
import type { AmbrosiaRecommendation, MetabolicState } from "@/runtimes/ambrosia/domain/types";

interface MetabolicInput { query: string }

export class MetabolicTwinAgent extends BaseCognitiveAgent<MetabolicInput, MetabolicState, MetabolicState, AgentDecision, string> {
  constructor() {
    super("ambrosia:metabolic-twin", "Metabolic Twin Agent", "metabolic-modeling");
  }

  async perceive(): Promise<MetabolicState> {
    return {
      glucoseStability: 0.68,
      inflammationLoad: 0.36,
      recoveryCapacity: 0.72,
      sleepQuality: 0.61,
      biomarkers: [
        { name: "fasting_glucose", value: 94, unit: "mg/dL" },
        { name: "triglycerides", value: 118, unit: "mg/dL" },
      ],
    };
  }

  async reason(context: MetabolicState): Promise<AmbrosiaRecommendation> {
    return {
      kind: "recommendation",
      confidence: this.clampConfidence((context.glucoseStability + context.recoveryCapacity) / 2),
      rationale: ["Metabolic flexibility appears improvable with circadian consistency and meal quality."],
      actions: ["Stabilize first meal protein.", "Reduce late-night glycemic load.", "Align feeding window with sleep routine."],
      risks: [],
    };
  }

  async act(decision: AgentDecision): Promise<string> {
    return decision.kind === "recommendation" ? decision.actions.join(" ") : "Observe metabolic signals.";
  }
}