import type { AgentDecision } from "@/runtimes/_nextgen/RuntimeTypes";

export interface SymbolicSystem {
  name: string;
  lens: string;
}

export interface Archetype {
  name: string;
  shadow: string;
  growthEdge: string;
}

export interface SymbolicInput {
  prompt: string;
  symbols: string[];
}

export interface SymbolicInterpretation {
  summary: string;
  signals: string[];
}

export interface MeditationProtocol {
  title: string;
  instructions: string[];
  durationMin: number;
}

export interface ConsciousnessStateModel {
  focus: string;
  affect: string;
  narrativeTension: string;
}

export interface WisdomSynthesis {
  summary: string;
  bridges: string[];
}

export interface OracleInsight {
  insight: string;
  caution: string;
}

export type OracleDecision = AgentDecision;