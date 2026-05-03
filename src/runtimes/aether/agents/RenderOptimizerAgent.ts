import { BaseCognitiveAgent } from "@/runtimes/_nextgen/BaseCognitiveAgent";
import type { AetherActionResult, AetherDecision, AetherInput, RenderBudget } from "@/runtimes/aether/domain/types";

interface RenderPerception extends RenderBudget {
  hotspot: string;
}

export class RenderOptimizerAgent extends BaseCognitiveAgent<AetherInput, RenderPerception, RenderPerception, AetherDecision, AetherActionResult> {
  constructor() {
    super("aether:render-optimizer", "Render Optimizer Agent", "render-performance");
  }

  async perceive(input: AetherInput): Promise<RenderPerception> {
    return {
      gpuMs: input.renderBudget?.gpuMs ?? 10.4,
      cpuMs: input.renderBudget?.cpuMs ?? 6.8,
      targetFps: input.renderBudget?.targetFps ?? 60,
      platform: input.renderBudget?.platform ?? "desktop",
      hotspot: "alpha-heavy volumetric fog over reflective water",
    };
  }

  async reason(context: RenderPerception): Promise<AetherDecision> {
    return {
      kind: "recommendation",
      confidence: this.clampConfidence(context.targetFps >= 60 ? 0.8 : 0.7),
      rationale: [
        `GPU budget ${context.gpuMs}ms must stay beneath frame target ${context.targetFps}fps.`,
        `Primary hotspot: ${context.hotspot}.`,
      ],
      actions: [
        "Apply foveated quality tiers to volumetric passes.",
        "Use HLOD swaps outside combat focus cone.",
        "Defer expensive reflections during camera sprint boosts.",
      ],
      risks: ["Overaggressive LOD changes can create visible popping in hero vistas."],
    };
  }

  async act(decision: AetherDecision): Promise<AetherActionResult> {
    return {
      title: "Render optimization plan",
      summary: decision.kind === "recommendation" ? decision.rationale.join(" ") : "Render telemetry observed.",
      actions: decision.kind === "recommendation" ? decision.actions : ["Profile GPU passes."],
      risks: "risks" in decision && decision.risks ? decision.risks : [],
      confidence: decision.confidence,
    };
  }
}