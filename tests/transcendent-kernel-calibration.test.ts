import { describe, expect, it } from "vitest";
import { TranscendentRuntimeKernel } from "@/runtimes/transcendent/TranscendentRuntimeKernel";
import { TranscendentBaseAgent } from "@/runtimes/transcendent/TranscendentBaseAgent";
import type { CapabilityModule, CapabilityOutput } from "@/runtimes/transcendent/interfaces";

function capability(id: string, confidence: number): CapabilityModule {
  return {
    id,
    description: `${id} capability`,
    async run(): Promise<CapabilityOutput> {
      return {
        capability: id,
        confidence,
        evidence: [],
        summary: `${id}:${confidence}`,
      };
    },
  };
}

describe("transcendent kernel calibration", () => {
  it("penalizes confidence under disagreement + sparse evidence and flags absolute-language bias", async () => {
    const agentA = new TranscendentBaseAgent("test-runtime:agent-a", "Agent A", "test-domain", ["test"]);
    const agentB = new TranscendentBaseAgent("test-runtime:agent-b", "Agent B", "test-domain", ["test"]);
    const runtime = new TranscendentRuntimeKernel(
      "test-runtime",
      "Test Runtime",
      "test-domain",
      "TEST PROMPT",
      [agentA, agentB],
      [capability("cap-low", 0.55), capability("cap-high", 0.95)],
      ["test disclaimer"],
    );

    const result = await runtime.process("this always works");
    expect(result.confidence).toBeGreaterThanOrEqual(0.52);
    expect(result.confidence).toBeLessThan(0.62);
    expect(result.synthesis.risks.join(" ").toLowerCase()).toContain("absolute language");
  });
});
