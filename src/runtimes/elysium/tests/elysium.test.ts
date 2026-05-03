import { describe, expect, it } from "vitest";
import { ElysiumRuntime } from "@/runtimes/elysium/ElysiumRuntime";
import { RuntimeOrchestrator } from "@/runtimes/transcendent/RuntimeOrchestrator";

describe("ELYSIUM runtime", () => {
  it("registers and processes", async () => {
    const runtime = new ElysiumRuntime();
    expect(RuntimeOrchestrator.get("elysium")).toBeTruthy();
    await runtime.start();
    expect(await runtime.healthCheck()).toBe("healthy");
    const result = await runtime.process("transcendent smoke test");
    expect(result.agents.length).toBeGreaterThanOrEqual(10);
    expect(result.confidence).toBeGreaterThan(0.5);
    const context = await runtime.buildContext("context smoke test");
    expect(context.context).toContain("ACTIVE");
    await runtime.stop();
  });
});
