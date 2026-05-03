import { BaseCognitiveAgent } from "@/runtimes/_nextgen/BaseCognitiveAgent";
import type { AetherActionResult, AetherDecision, AetherInput, ProceduralAsset } from "@/runtimes/aether/domain/types";

interface WorldPerception {
  theme: string;
  biomes: string[];
  constraints: string[];
  assets: ProceduralAsset[];
}

export class RealityWeaverAgent extends BaseCognitiveAgent<AetherInput, WorldPerception, WorldPerception, AetherDecision, AetherActionResult> {
  constructor() {
    super("aether:reality-weaver", "Reality Weaver Agent", "procedural-worldbuilding");
  }

  async perceive(input: AetherInput): Promise<WorldPerception> {
    return {
      theme: input.world?.theme ?? input.query,
      biomes: input.world?.biomes ?? ["megalithic forest", "fog canyon", "reactive ruins"],
      constraints: input.world?.gameplayConstraints ?? ["clear traversal", "combat readability", "co-op landmarks"],
      assets: input.world?.assets ?? [
        { id: "terrain-ridge", kind: "terrain", biome: "fog canyon", styleTags: ["erosion", "mist"], footprint: { x: 120, y: 40, z: 320 } },
        { id: "spire-01", kind: "structure", biome: "reactive ruins", styleTags: ["alien", "vertical"], footprint: { x: 22, y: 70, z: 22 } },
      ],
    };
  }

  async reason(context: WorldPerception): Promise<AetherDecision> {
    return {
      kind: "recommendation",
      confidence: this.clampConfidence(0.84),
      rationale: [
        `Theme anchors: ${context.theme}`,
        `Biomes reinforce progression: ${context.biomes.join(", ")}`,
        `Gameplay constraints preserved: ${context.constraints.join(", ")}`,
      ],
      actions: [
        "Generate macro topology before hero props.",
        "Bind biome transitions to traversal verbs.",
        "Reserve silhouettes for quest-critical landmarks.",
      ],
      risks: ["Biome density can hurt navigability if landmarks repeat too often."],
    };
  }

  async act(decision: AetherDecision): Promise<AetherActionResult> {
    return {
      title: "Procedural world generation plan",
      summary: decision.kind === "recommendation" ? decision.rationale.join(" ") : "World signals synthesized.",
      actions: decision.kind === "recommendation" ? decision.actions : ["Review world scaffold."],
      risks: "risks" in decision && decision.risks ? decision.risks : [],
      confidence: decision.confidence,
    };
  }
}