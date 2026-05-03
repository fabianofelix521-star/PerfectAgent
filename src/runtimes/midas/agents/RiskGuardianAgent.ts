import { BaseCognitiveAgent } from "@/runtimes/_nextgen/BaseCognitiveAgent";
import type { MidasDecision, PaperTradeOrder, PortfolioExposure, RiskAssessment } from "@/runtimes/midas/domain/types";

interface RiskPerception {
  risk: RiskAssessment;
  exposure: PortfolioExposure;
}

export class RiskGuardianAgent extends BaseCognitiveAgent<{ query: string }, RiskPerception, RiskPerception, MidasDecision, PaperTradeOrder> {
  constructor() {
    super("midas:risk-guardian", "Risk Guardian Agent", "portfolio-risk");
  }

  async perceive(_input: { query: string }): Promise<RiskPerception> {
    return {
      risk: { score: 0.74, flags: ["smart-contract unknowns", "memecoin volatility", "liquidity gaps"], maxExposurePct: 1.5 },
      exposure: { totalRiskPct: 4.2, sectorBias: ["memecoins", "DEX beta"] },
    };
  }

  async reason(context: RiskPerception): Promise<MidasDecision> {
    return {
      kind: "recommendation",
      confidence: 0.88,
      rationale: [
        `Risk score ${context.risk.score.toFixed(2)}: ${context.risk.flags.join(", ")}.`,
        `Max exposure ceiling: ${context.risk.maxExposurePct}%.`,
        `Current sector concentration: ${context.exposure.sectorBias.join(", ")}.`,
      ],
      actions: [
        `Suggested position size ≤ ${context.risk.maxExposurePct}% of portfolio for this setup.`,
        "Define stop-loss and invalidation level before entry.",
        "Monitor on-chain flags: smart-contract unknowns and liquidity gaps.",
        "Reduce sector concentration if portfolio already skewed to same bias.",
      ],
      risks: context.risk.flags,
    };
  }

  async act(decision: MidasDecision): Promise<PaperTradeOrder> {
    const size = decision.kind === "recommendation" ? 100 : 0;
    return {
      symbol: "EXEC",
      side: size > 0 ? "buy" : "hold",
      sizeUsd: size,
      mode: "live",
    };
  }
}