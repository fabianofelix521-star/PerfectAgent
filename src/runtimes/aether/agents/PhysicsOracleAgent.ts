import { BaseCognitiveAgent } from "@/runtimes/_nextgen/BaseCognitiveAgent";
import type { AetherActionResult, AetherDecision, AetherInput, PhysicsProfile } from "@/runtimes/aether/domain/types";

interface PhysicsPerception extends PhysicsProfile {
  collisionRisks: string[];
}

export class PhysicsOracleAgent extends BaseCognitiveAgent<AetherInput, PhysicsPerception, PhysicsPerception, AetherDecision, AetherActionResult> {
  constructor() {
    super("aether:physics-oracle", "Physics Oracle Agent", "simulation-physics");
  }

  async perceive(input: AetherInput): Promise<PhysicsPerception> {
    return {
      gravityScale: input.physics?.gravityScale ?? 1,
      collisionTolerance: input.physics?.collisionTolerance ?? 0.08,
      stabilityScore: input.physics?.stabilityScore ?? 0.79,
      notes: input.physics?.notes ?? ["favor deterministic impulses", "cap ragdoll pileups"],
      collisionRisks: ["stacked dynamic debris", "thin stair colliders near sprint lanes"],
    };
  }

  async reason(context: PhysicsPerception): Promise<AetherDecision> {
    return {
      kind: "recommendation",
      confidence: this.clampConfidence(context.stabilityScore),
      rationale: [
        `Gravity scale ${context.gravityScale.toFixed(2)} keeps movement readable.`,
        `Collision tolerance ${context.collisionTolerance.toFixed(2)} needs margin for high-speed traversal.`,
      ],
      actions: [
        "Use broadphase-friendly convex hulls for hero-critical props.",
        "Limit simultaneous rigid-body wakeups in combat arenas.",
        "Precompute stability checks for destructible set-pieces.",
      ],
      risks: context.collisionRisks,
    };
  }

  async act(decision: AetherDecision): Promise<AetherActionResult> {
    return {
      title: "Physics tuning advisory",
      summary: decision.kind === "recommendation" ? decision.rationale.join(" ") : "Physics state observed.",
      actions: decision.kind === "recommendation" ? decision.actions : ["Audit collider setup."],
      risks: "risks" in decision && decision.risks ? decision.risks : [],
      confidence: decision.confidence,
    };
  }
}