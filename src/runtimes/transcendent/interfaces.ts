import type { AgentDecision } from "@/runtimes/_nextgen/RuntimeTypes";

export interface CapabilityInput {
  query: string;
  runtimeId: string;
  agentId?: string;
  evidence?: string[];
  metadata?: Record<string, unknown>;
}

export interface CapabilityOutput {
  capability: string;
  confidence: number;
  evidence: string[];
  summary: string;
  deltas?: Record<string, number>;
}

export interface CapabilityModule {
  readonly id: string;
  readonly description: string;
  run(input: CapabilityInput): Promise<CapabilityOutput>;
}

export interface DebateRound {
  round: number;
  claim: string;
  rebuttal: string;
  surviving: boolean;
}

export interface AgentCapabilityDeclaration {
  id: string;
  name: string;
  domain: string;
  specialties: string[];
  canHandle: string[];
}

export interface TranscendentAgentResult {
  agentId: string;
  agentName: string;
  domain: string;
  action: string;
  confidence: number;
  reflections: string[];
  debate: DebateRound[];
  simulation: string[];
}

export interface RuntimeSynthesisPacket {
  summary: string;
  confidence: number;
  confidenceBand: "low" | "medium" | "high";
  keyActions: string[];
  risks: string[];
  ethicsNotes: string[];
  adversarialFindings: string[];
  resonanceSignals: string[];
}

export interface AgentExtendedLifecycle {
  reflect(feedback: unknown): Promise<string[]>;
  collaborate(peers: string[], query: string): Promise<string[]>;
  selfImprove(snapshot: {
    score: number;
    notes: string[];
  }): Promise<{ version: number; rollbackReady: boolean }>;
  simulate(query: string): Promise<string[]>;
  debate(topic: string): Promise<DebateRound[]>;
  dream(seed?: string): Promise<string[]>;
  capabilities(): AgentCapabilityDeclaration;
}

export type DecisionWithConfidence = AgentDecision & { confidence: number };