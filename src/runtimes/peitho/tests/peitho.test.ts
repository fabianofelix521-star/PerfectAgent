import { describe, expect, it } from "vitest";
import { PeithoRuntime } from "@/runtimes/peitho/PeithoRuntime";
import { RuntimeOrchestrator } from "@/runtimes/transcendent/RuntimeOrchestrator";

describe("PEITHO runtime", () => {
  it("registers and processes", async () => {
    const runtime = new PeithoRuntime();
    expect(RuntimeOrchestrator.get("peitho")).toBeTruthy();
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
