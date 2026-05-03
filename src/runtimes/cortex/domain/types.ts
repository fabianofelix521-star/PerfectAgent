import type { AgentDecision } from "@/runtimes/_nextgen/RuntimeTypes";

export interface NeuralSignalFrame {
  channels: number;
  sampleRateHz: number;
  artifacts: string[];
}

export interface FrequencyBandPower {
  delta: number;
  theta: number;
  alpha: number;
  beta: number;
  gamma: number;
}

export interface CognitiveState {
  focus: number;
  fatigue: number;
  stress: number;
  workingMemoryLoad: number;
}

export interface IntentionDecodeResult {
  intention: string;
  confidence: number;
  supportingBands: string[];
}

export interface ConnectomeGraph {
  nodes: number;
  hubs: string[];
  modularity: number;
}

export interface PlasticityModel {
  learningRate: number;
  reinforcementBias: number;
  recoveryNeed: number;
}

export interface CognitiveProtocol {
  title: string;
  drills: string[];
  recovery: string[];
}

export interface NeuroSafetyConstraint {
  constraint: string;
  reason: string;
}

export type CortexDecision = AgentDecision;