import { describe, expect, it } from "vitest";

import { swarmHealthJob } from "@/tools/chrono/jobs/SwarmHealthJob";
import { ChronoScheduler } from "@/tools/chrono/ChronoEngine";
import { BayesianUpdaterTool } from "@/tools/cognition/BayesianUpdaterTool";
import type { NexusToolInput } from "@/tools/core/NexusToolBase";
import { ToolRegistry } from "@/tools/core/ToolRegistry";

function toolInput(params: Record<string, unknown>): NexusToolInput {
  return {
    params,
    priority: "normal",
    context: {
      agentId: "test-agent",
      runtimeId: "test-runtime",
      sessionId: "test-session",
      previousToolOutputs: new Map(),
      sharedMemory: new Map(),
      executionDepth: 0,
    },
  };
}

describe("Nexus Tool Forge", () => {
  it("auto-registers the cognitive tool palette", () => {
    ToolRegistry.clear();
    ToolRegistry.autoRegister();
    expect(ToolRegistry.get("dark-pool-detector")).toBeTruthy();
    expect(ToolRegistry.get("tool-composer")).toBeTruthy();
    expect(ToolRegistry.getByCategory("cognition").length).toBeGreaterThanOrEqual(6);
  });

  it("updates beliefs with real Bayesian odds math", async () => {
    const tool = new BayesianUpdaterTool();
    const output = await tool.execute(
      toolInput({
        priorProbability: 0.1,
        likelihoodRatioPositive: 10,
        likelihoodRatioNegative: 0.2,
        evidencePresent: true,
      }),
    );
    const result = output.result as { posterior: number };
    expect(result.posterior).toBeCloseTo(0.5263, 3);
    expect(output.quality).toBeGreaterThan(0.8);
  });

  it("runs Chrono jobs manually without background scheduling", async () => {
    ToolRegistry.clear();
    const scheduler = new ChronoScheduler();
    scheduler.register(swarmHealthJob, { schedule: false });
    const execution = await scheduler.executeJob("swarm-health");
    scheduler.stop();
    expect(execution.status).toBe("success");
    expect(execution.quality).toBeGreaterThan(0);
  });
});
