import type { AgentDecision } from "@/runtimes/_nextgen/RuntimeTypes";

export interface TokenProfile {
  symbol: string;
  narrative: string;
  concentrationRisk: number;
}

export interface LiquidityPool {
  dex: string;
  liquidityUsd: number;
  slippageRisk: number;
}

export interface WalletSignal {
  wallet: string;
  behavior: string;
  confidence: number;
}

export interface OnChainFlow {
  inflowUsd: number;
  outflowUsd: number;
  whaleShare: number;
}

export interface SocialMomentumSignal {
  velocity: number;
  sentiment: number;
  botRisk: number;
}

export interface AlphaSignal {
  thesis: string;
  confidence: number;
  invalidation: string;
}

export interface RiskAssessment {
  score: number;
  flags: string[];
  maxExposurePct: number;
}

export interface PaperTradeOrder {
  symbol: string;
  side: "buy" | "sell" | "hold";
  sizeUsd: number;
  mode: "paper" | "live";
}

export interface PortfolioExposure {
  totalRiskPct: number;
  sectorBias: string[];
}

export type MidasDecision = AgentDecision;