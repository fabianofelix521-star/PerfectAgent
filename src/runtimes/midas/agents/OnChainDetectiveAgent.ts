import { BaseCognitiveAgent } from "@/runtimes/_nextgen/BaseCognitiveAgent";
import type { MidasDecision } from "@/runtimes/midas/domain/types";
import type { OnChainFlow, WalletSignal } from "@/runtimes/midas/domain/types";

interface ChainPerception {
  flow: OnChainFlow;
  wallets: WalletSignal[];
}

export class OnChainDetectiveAgent extends BaseCognitiveAgent<{ query: string }, ChainPerception, ChainPerception, MidasDecision, string> {
  constructor() {
    super("midas:onchain-detective", "OnChain Detective Agent", "onchain-forensics");
  }

  async perceive(): Promise<ChainPerception> {
    return {
      flow: { inflowUsd: 420000, outflowUsd: 310000, whaleShare: 0.41 },
      wallets: [
        { wallet: "whale-1", behavior: "accumulating dips", confidence: 0.73 },
        { wallet: "smart-money-7", behavior: "rotating into liquidity events", confidence: 0.66 },
      ],
    };
  }

  async reason(context: ChainPerception): Promise<MidasDecision> {
    return {
      kind: "observation",
      confidence: 0.74,
      signals: context.wallets.map((item) => `${item.wallet}:${item.behavior}`),
      summary: `Whale share ${(context.flow.whaleShare * 100).toFixed(0)}% indicates concentration risk despite net inflows.`,
    };
  }

  async act(decision: MidasDecision): Promise<string> {
    return decision.kind === "observation" ? decision.summary : "Review on-chain signals.";
  }
}