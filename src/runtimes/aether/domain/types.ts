import type { AgentDecision } from "@/runtimes/_nextgen/RuntimeTypes";

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface ProceduralAsset {
  id: string;
  kind: "terrain" | "structure" | "prop" | "character" | "fx";
  biome: string;
  styleTags: string[];
  footprint: Vector3;
}

export interface WorldState {
  theme: string;
  biomes: string[];
  gameplayConstraints: string[];
  physicsIntent: string[];
  assets: ProceduralAsset[];
}

export interface PhysicsProfile {
  gravityScale: number;
  collisionTolerance: number;
  stabilityScore: number;
  notes: string[];
}

export interface NPCMindState {
  curiosity: number;
  fear: number;
  trust: number;
  aggression: number;
  loyalty: number;
  goals: string[];
}

export interface RenderBudget {
  gpuMs: number;
  cpuMs: number;
  targetFps: number;
  platform: "mobile" | "desktop" | "console" | "cloud";
}

export type AetherDecision = AgentDecision;

export interface AetherActionResult {
  title: string;
  summary: string;
  actions: string[];
  risks: string[];
  confidence: number;
}

export interface AetherInput {
  query: string;
  world?: Partial<WorldState>;
  physics?: Partial<PhysicsProfile>;
  renderBudget?: Partial<RenderBudget>;
  npcBrief?: string;
}