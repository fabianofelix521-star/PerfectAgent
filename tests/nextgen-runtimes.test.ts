import { describe, expect, it } from "vitest";
import { AetherRuntime } from "@/runtimes/aether/AetherRuntime";
import { AmbrosiaRuntime } from "@/runtimes/ambrosia/AmbrosiaRuntime";
import { QuantumRuntime } from "@/runtimes/quantum/QuantumRuntime";
import { CortexRuntime } from "@/runtimes/cortex/CortexRuntime";
import { MidasRuntime } from "@/runtimes/midas/MidasRuntime";
import { AsclepiusRuntime as AsclepiusNextGenRuntime } from "@/runtimes/nextgen-asclepius/AsclepiusRuntime";
import { HermesRuntime as HermesMemeticsRuntime } from "@/runtimes/nextgen-hermes/HermesRuntime";
import { OracleRuntime as OracleSymbolicRuntime } from "@/runtimes/nextgen-oracle/OracleRuntime";
import { buildCognitiveRuntimeContext } from "@/runtimes/runtimeContext";
import type { RuntimeKind } from "@/types";

const CASES: Array<{
  kind: RuntimeKind;
  runtime: {
    start: () => Promise<void>;
    stop: () => Promise<void>;
    healthCheck: () => Promise<string>;
    process: (query: string) => Promise<{ agents: unknown[]; confidence: number; synthesis: { disclaimers: string[] } }>;
  };
}> = [
  { kind: "aether", runtime: new AetherRuntime() },
  { kind: "ambrosia", runtime: new AmbrosiaRuntime() },
  { kind: "quantum", runtime: new QuantumRuntime() },
  { kind: "cortex", runtime: new CortexRuntime() },
  { kind: "midas", runtime: new MidasRuntime() },
  { kind: "asclepius-nextgen", runtime: new AsclepiusNextGenRuntime() },
  { kind: "hermes-memetics", runtime: new HermesMemeticsRuntime() },
  { kind: "oracle-symbolic", runtime: new OracleSymbolicRuntime() },
];

describe("nextgen runtimes", () => {
  for (const item of CASES) {
    it(`${item.kind} starts, processes and stops safely`, async () => {
      await item.runtime.start();
      expect(await item.runtime.healthCheck()).toBe("healthy");
      const result = await item.runtime.process(`smoke test for ${item.kind}`);
      expect(result.agents).toHaveLength(4);
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(Array.isArray(result.synthesis.disclaimers)).toBe(true);
      await item.runtime.stop();
      expect(await item.runtime.healthCheck()).toBe("degraded");
    });

    it(`${item.kind} is reachable through runtimeContext`, async () => {
      const context = await buildCognitiveRuntimeContext(item.kind, `route smoke for ${item.kind}`);
      expect(context?.label).toBeTruthy();
      expect(context?.confidence).toBeGreaterThan(0.5);
      expect(context?.context).toContain("ACTIVE");
    });
  }
});