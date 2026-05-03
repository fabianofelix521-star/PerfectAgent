import { SafeRuntimeLoop } from "@/runtimes/_nextgen/SafeRuntimeLoop";
import type { HealthStatus, NexusMessage, RuntimeContextEnvelope, RuntimeProcessResult } from "@/runtimes/_nextgen/RuntimeTypes";
import type { AetherActionResult, AetherInput } from "@/runtimes/aether/domain/types";
import { ConsciousNPCAgent } from "@/runtimes/aether/agents/ConsciousNPCAgent";
import { PhysicsOracleAgent } from "@/runtimes/aether/agents/PhysicsOracleAgent";
import { RealityWeaverAgent } from "@/runtimes/aether/agents/RealityWeaverAgent";
import { RenderOptimizerAgent } from "@/runtimes/aether/agents/RenderOptimizerAgent";

export class AetherRuntime {
  readonly id = "aether";
  readonly name = "Aether Runtime";

  private started = false;
  private readonly loop = new SafeRuntimeLoop();
  private readonly agents = [
    new RealityWeaverAgent(),
    new PhysicsOracleAgent(),
    new ConsciousNPCAgent(),
    new RenderOptimizerAgent(),
  ] as const;

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    this.loop.schedule(2_500, async () => {
      await Promise.allSettled(this.agents.map((agent) => agent.learn({ type: "world-tick", at: Date.now() })));
    });
  }

  async stop(): Promise<void> {
    this.loop.stopAll();
    this.started = false;
  }

  async healthCheck(): Promise<HealthStatus> {
    return this.loop.health(this.started, this.agents.length);
  }

  async process(input: string | AetherInput): Promise<RuntimeProcessResult<AetherActionResult>> {
    const normalized: AetherInput = typeof input === "string" ? { query: input } : input;
    const settled = await Promise.allSettled(this.agents.map(async (agent) => ({
      agentId: agent.id,
      agentName: agent.name,
      domain: agent.domain,
      result: await agent.run(normalized),
    })));
    const agents = settled.flatMap((item) => item.status === "fulfilled" ? [item.value] : []);
    const confidence = agents.length ? agents.reduce((sum, item) => sum + item.result.confidence, 0) / agents.length : 0;
    return {
      agents,
      confidence,
      synthesis: {
        summary: "Aether synthesized worldbuilding, physics, NPC cognition and rendering guidance for a hyper-realistic game slice.",
        priorityActions: agents.flatMap((item) => item.result.actions).slice(0, 6),
        risks: agents.flatMap((item) => item.result.risks),
        disclaimers: ["Aether returns engine-agnostic plans and heuristics, not engine-specific source code or real-time simulation."],
      },
    };
  }

  async buildContext(query: string): Promise<RuntimeContextEnvelope<AetherActionResult>> {
    const response = await this.process(query);
    return {
      label: "Aether hyper-realistic world swarm",
      confidence: response.confidence,
      evidence: response.agents.map((item) => item.result.title),
      context: [
        "AETHER RUNTIME ACTIVE",
        response.synthesis.summary,
        ...response.agents.map((item) => `${item.agentName}: ${item.result.summary}`),
        `Priority actions: ${response.synthesis.priorityActions.join(" | ")}`,
      ].join("\n"),
      response,
    };
  }

  async sendMessage(message: NexusMessage): Promise<unknown> {
    if (!message || typeof message !== "object") return { ok: false, error: "invalid-message" };
    const payload = typeof message.payload === "string"
      ? message.payload
      : typeof message.payload === "object" && message.payload && "query" in message.payload
        ? String((message.payload as { query?: unknown }).query ?? "")
        : "";
    if (!payload.trim()) return { ok: false, error: "empty-query" };
    return this.process(payload);
  }
}