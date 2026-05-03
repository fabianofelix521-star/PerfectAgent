import { describe, expect, it } from "vitest";
import { AetherionRuntime } from "@/runtimes/aetherion/AetherionRuntime";
import { ElysiumRuntime } from "@/runtimes/elysium/ElysiumRuntime";
import { PanaceaRuntime } from "@/runtimes/panacea/PanaceaRuntime";
import { AmritaRuntime } from "@/runtimes/amrita/AmritaRuntime";
import { AkashaRuntime } from "@/runtimes/akasha/AkashaRuntime";
import { NoumenonRuntime } from "@/runtimes/noumenon/NoumenonRuntime";
import { MnemosyneRuntime } from "@/runtimes/mnemosyne/MnemosyneRuntime";
import { PeithoRuntime } from "@/runtimes/peitho/PeithoRuntime";
import { LeviathanRuntime } from "@/runtimes/leviathan/LeviathanRuntime";
import { PleromaRuntime } from "@/runtimes/pleroma/PleromaRuntime";
import { buildCognitiveRuntimeContext } from "@/runtimes/runtimeContext";
import { RuntimeOrchestrator } from "@/runtimes/transcendent/RuntimeOrchestrator";
import type { RuntimeKind } from "@/types";

const CASES: Array<{ kind: RuntimeKind; runtime: { start: () => Promise<void>; stop: () => Promise<void>; healthCheck: () => Promise<string>; process: (query: string) => Promise<{ agents: unknown[]; confidence: number }> } }> = [
  { kind: "aetherion", runtime: new AetherionRuntime() },
  { kind: "elysium", runtime: new ElysiumRuntime() },
  { kind: "panacea", runtime: new PanaceaRuntime() },
  { kind: "amrita", runtime: new AmritaRuntime() },
  { kind: "akasha", runtime: new AkashaRuntime() },
  { kind: "noumenon", runtime: new NoumenonRuntime() },
  { kind: "mnemosyne", runtime: new MnemosyneRuntime() },
  { kind: "peitho", runtime: new PeithoRuntime() },
  { kind: "leviathan", runtime: new LeviathanRuntime() },
  { kind: "pleroma", runtime: new PleromaRuntime() },
];

describe("transcendent runtimes", () => {
  for (const item of CASES) {
    it(`${item.kind} starts, processes and builds context`, async () => {
      await item.runtime.start();
      expect(await item.runtime.healthCheck()).toBe("healthy");
      const result = await item.runtime.process(`smoke test for ${item.kind}`);
      expect(result.agents.length).toBe(10);
      expect(result.confidence).toBeGreaterThan(0.5);
      const context = await buildCognitiveRuntimeContext(item.kind, `route smoke for ${item.kind}`);
      expect(context?.label).toBeTruthy();
      expect(context?.context).toContain("ACTIVE");
      await item.runtime.stop();
      expect(await item.runtime.healthCheck()).toBe("degraded");
    });
  }

  it("pleroma tracks known runtime ids and registers in orchestrator", () => {
    const pleroma = new PleromaRuntime();
    expect(pleroma.getKnownRuntimeIds().length).toBeGreaterThan(30);
    expect(RuntimeOrchestrator.get("pleroma")).toBeTruthy();
  });
});
