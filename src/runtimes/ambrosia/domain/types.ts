import type { AgentDecision } from "@/runtimes/_nextgen/RuntimeTypes";

export interface BiomarkerReading {
  name: string;
  value: number;
  unit: string;
}

export interface MetabolicState {
  glucoseStability: number;
  inflammationLoad: number;
  recoveryCapacity: number;
  sleepQuality: number;
  biomarkers: BiomarkerReading[];
}

export interface FoodItem {
  name: string;
  category: string;
  fiber: number;
  protein: number;
  glycemicLoad: number;
}

export interface NutrientProfile {
  vitamins: string[];
  minerals: string[];
  cofactors: string[];
}

export interface MicrobiomeProfile {
  diversityScore: number;
  beneficialSpecies: string[];
  watchSignals: string[];
}

export interface NutrientInteraction {
  pair: [string, string];
  effect: "synergy" | "competition" | "neutral";
  rationale: string;
}

export interface LongevityPathway {
  pathway: "mTOR" | "AMPK" | "sirtuins" | "inflammation" | "glycation";
  direction: "up" | "down" | "balance";
  reason: string;
}

export interface NutritionProtocol {
  title: string;
  meals: string[];
  timing: string[];
  recoveryFocus: string[];
}

export type AmbrosiaRecommendation = AgentDecision;