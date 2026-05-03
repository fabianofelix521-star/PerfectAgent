import type { AgentDecision } from "@/runtimes/_nextgen/RuntimeTypes";

export interface AudienceSegment {
  label: string;
  motivations: string[];
}

export interface PsychographicProfile {
  voice: string[];
  aspirations: string[];
  friction: string[];
}

export interface ContentVariant {
  hook: string;
  angle: string;
  callToAction: string;
}

export interface MemeScore {
  novelty: number;
  resonance: number;
  ethicalScore: number;
}

export interface CampaignPlan {
  channels: string[];
  budgetSplit: Record<string, number>;
  cadence: string[];
}

export interface ChannelStrategy {
  channel: string;
  format: string;
  rationale: string;
}

export interface SentimentWave {
  polarity: number;
  volatility: number;
  riskSignals: string[];
}

export interface EthicalMarketingConstraint {
  rule: string;
  reason: string;
}

export interface MarketingInsight {
  summary: string;
  nextMove: string;
}

export type HermesDecision = AgentDecision;