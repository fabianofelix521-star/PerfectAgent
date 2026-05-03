import type { AgentDecision } from "@/runtimes/_nextgen/RuntimeTypes";

export interface QubitState {
  label: string;
  amplitude: [number, number];
  phase: number;
}

export interface QuantumGate {
  name: string;
  targets: number[];
  controls?: number[];
}

export interface QuantumCircuit {
  qubits: number;
  depth: number;
  gates: QuantumGate[];
}

export interface NoiseModel {
  t1: number;
  t2: number;
  readoutError: number;
  cnotError: number;
}

export interface EntanglementMetric {
  pair: [number, number];
  score: number;
}

export interface HamiltonianTerm {
  label: string;
  coefficient: number;
  pauliString: string;
}

export interface VariationalAnsatz {
  name: string;
  layers: number;
  parameterCount: number;
}

export interface ErrorCorrectionCode {
  name: string;
  distance: number;
  overheadQubits: number;
}

export interface HybridOptimizationResult {
  objective: string;
  recommendedCircuit: QuantumCircuit;
  projectedGain: string;
  risks: string[];
}

export type QuantumDecision = AgentDecision;