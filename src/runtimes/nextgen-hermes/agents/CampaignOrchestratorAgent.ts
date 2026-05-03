import { BaseCognitiveAgent } from "@/runtimes/_nextgen/BaseCognitiveAgent";
import type { CampaignPlan, ChannelStrategy, HermesDecision } from "@/runtimes/nextgen-hermes/domain/types";

interface CampaignPerception {
  plan: CampaignPlan;
  strategies: ChannelStrategy[];
}

export class CampaignOrchestratorAgent extends BaseCognitiveAgent<{ query: string }, CampaignPerception, CampaignPerception, HermesDecision, string> {
  constructor() {
    super("hermes-next:campaign-orchestrator", "Campaign Orchestrator Agent", "multichannel-planning");
  }

  async perceive(): Promise<CampaignPerception> {
    return {
      plan: { channels: ["X", "Instagram", "Email"], budgetSplit: { X: 25, Instagram: 45, Email: 30 }, cadence: ["daily hooks", "weekly depth", "conversion email" ] },
      strategies: [
        { channel: "X", format: "thread", rationale: "discoverability" },
        { channel: "Email", format: "case-study", rationale: "conversion depth" },
      ],
    };
  }

  async reason(context: CampaignPerception): Promise<HermesDecision> {
    return {
      kind: "recommendation",
      confidence: 0.8,
      rationale: context.strategies.map((item) => `${item.channel}: ${item.rationale}`),
      actions: [...context.plan.channels, ...context.plan.cadence],
      risks: ["Do not pursue dark patterns or privacy-invasive targeting."],
    };
  }

  async act(decision: HermesDecision): Promise<string> {
    return decision.kind === "recommendation" ? decision.actions.join(" ") : "Review campaign plan.";
  }
}