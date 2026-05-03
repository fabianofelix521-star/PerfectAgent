import type { AgentDecision } from "@/runtimes/_nextgen/RuntimeTypes";

export type EvidenceLevel = "weak" | "moderate" | "strong";

export interface SafetyWarning {
  warning: string;
  severity: "low" | "medium" | "high";
}

export interface MoleculeCandidate {
  name: string;
  smiles: string;
  drugLikeness: number;
  solubility: number;
}

export interface TargetProtein {
  name: string;
  family: string;
  tractability: number;
}

export interface BiologicalPathway {
  name: string;
  role: string;
  modulationDirection: "activate" | "inhibit" | "balance";
}

export interface MechanismHypothesis {
  title: string;
  confidence: number;
  evidenceLevel: EvidenceLevel;
  evidence: string[];
}

export interface CompoundCombination {
  label: string;
  compounds: string[];
}

export interface SynergyScore {
  label: string;
  synergy: number;
  risk: number;
}

export interface VirtualPatient {
  phenotype: string;
  risks: string[];
}

export interface InSilicoTrialResult {
  cohort: string;
  projectedBenefit: string;
  uncertainty: number;
  warnings: SafetyWarning[];
}

export type AsclepiusDecision = AgentDecision;