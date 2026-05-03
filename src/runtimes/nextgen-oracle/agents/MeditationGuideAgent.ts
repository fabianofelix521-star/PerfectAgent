import { BaseCognitiveAgent } from "@/runtimes/_nextgen/BaseCognitiveAgent";
import type { MeditationProtocol, OracleDecision } from "@/runtimes/nextgen-oracle/domain/types";

export class MeditationGuideAgent extends BaseCognitiveAgent<{ query: string }, MeditationProtocol, MeditationProtocol, OracleDecision, MeditationProtocol> {
  constructor() {
    super("oracle-next:meditation-guide", "Meditation Guide Agent", "contemplative-practice");
  }

  async perceive(): Promise<MeditationProtocol> {
    return {
      title: "Grounded symbolic contemplation",
      instructions: ["3 minutes slow breathing", "name one recurring symbol", "journal one grounded interpretation"],
      durationMin: 12,
    };
  }

  async reason(context: MeditationProtocol): Promise<OracleDecision> {
    return {
      kind: "recommendation",
      confidence: 0.79,
      rationale: ["Contemplative guidance should be simple, bounded and psychologically grounding."],
      actions: context.instructions,
      risks: ["Not a substitute for mental-health treatment when clinical support is needed."],
    };
  }

  async act(decision: OracleDecision): Promise<MeditationProtocol> {
    return { title: "Safe contemplation protocol", instructions: decision.kind === "recommendation" ? decision.actions : [], durationMin: 12 };
  }
}