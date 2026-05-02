import { describe, expect, it } from "vitest";
import { AegisRuntime } from "@/runtimes/aegis/AegisRuntime";
import { AdCommanderRuntime } from "@/runtimes/ad-commander/AdCommanderRuntime";
import { ContentEmpireRuntime } from "@/runtimes/content-empire/ContentEmpireRuntime";
import { HippocratesSupremeRuntime } from "@/runtimes/hippocrates-supreme/HippocratesSupremeRuntime";
import { MendeleevRuntime } from "@/runtimes/mendeleev/MendeleevRuntime";
import { PixelForgeRuntime } from "@/runtimes/pixel-forge/PixelForgeRuntime";
import { PromptForgeRuntime } from "@/runtimes/prompt-forge/PromptForgeRuntime";
import { SiliconValleyRuntime } from "@/runtimes/silicon-valley/SiliconValleyRuntime";
import { StudioOneRuntime } from "@/runtimes/studio-one/StudioOneRuntime";
import { UnrealForgeRuntime } from "@/runtimes/unreal-forge/UnrealForgeRuntime";
import { WallStreetRuntime } from "@/runtimes/wall-street/WallStreetRuntime";
import { buildCognitiveRuntimeContext } from "@/runtimes/runtimeContext";
import type { RuntimeKind } from "@/types";

const CASES: Array<{
  kind: RuntimeKind;
  runtime: { process: (query: string) => Promise<{ agents: unknown[]; confidence: number; synthesis: { priorityActions: string[] } }> };
  agents: number;
}> = [
  { kind: "mendeleev", runtime: new MendeleevRuntime(), agents: 8 },
  { kind: "prompt-forge", runtime: new PromptForgeRuntime(), agents: 6 },
  { kind: "silicon-valley", runtime: new SiliconValleyRuntime(), agents: 23 },
  { kind: "unreal-forge", runtime: new UnrealForgeRuntime(), agents: 20 },
  { kind: "aegis", runtime: new AegisRuntime(), agents: 10 },
  { kind: "content-empire", runtime: new ContentEmpireRuntime(), agents: 10 },
  { kind: "ad-commander", runtime: new AdCommanderRuntime(), agents: 8 },
  { kind: "studio-one", runtime: new StudioOneRuntime(), agents: 9 },
  { kind: "wall-street", runtime: new WallStreetRuntime(), agents: 10 },
  { kind: "pixel-forge", runtime: new PixelForgeRuntime(), agents: 10 },
];

describe("supreme runtimes", () => {
  it("hippocrates-supreme executes the 5-phase protocol and all 12 agents", async () => {
    const output = await new HippocratesSupremeRuntime().process("smoke test for cancer mechanism protocol");
    const result = output.result as {
      agents: unknown[];
      phases: Record<string, unknown>;
      finalDisclaimer?: string;
      protocol?: { disclaimer?: string };
    };
    expect(output.agentId).toBe("protocol-synthesizer");
    expect(result.agents).toHaveLength(12);
    expect(Object.keys(result.phases)).toEqual([
      "molecularDeconstruction",
      "compoundScan",
      "synergyDosageEvidence",
      "safety",
      "protocol",
    ]);
    expect(result.protocol?.disclaimer).toMatch(/supervisão/i);
    expect(output.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it("hippocrates-supreme is reachable through runtimeContext", async () => {
    const context = await buildCognitiveRuntimeContext("hippocrates-supreme", "route smoke for hippocrates");
    expect(context?.label).toContain("Hippocrates");
    expect(context?.confidence).toBeGreaterThanOrEqual(0.5);
    expect(context?.context).toContain("HIPPOCRATES SUPREME ACTIVE");
  });

  for (const item of CASES) {
    it(`${item.kind} executes all configured agents`, async () => {
      const result = await item.runtime.process(`smoke test for ${item.kind}`);
      expect(result.agents).toHaveLength(item.agents);
      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
      expect(result.synthesis.priorityActions.length).toBeGreaterThan(0);
    });

    it(`${item.kind} is reachable through runtimeContext`, async () => {
      const context = await buildCognitiveRuntimeContext(item.kind, `route smoke for ${item.kind}`);
      expect(context?.label).toBeTruthy();
      expect(context?.confidence).toBeGreaterThanOrEqual(0.5);
      expect(context?.context).toContain("ACTIVE");
    });
  }
});
