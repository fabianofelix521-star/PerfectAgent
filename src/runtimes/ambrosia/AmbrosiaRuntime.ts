import { SafeRuntimeLoop } from "@/runtimes/_nextgen/SafeRuntimeLoop";
import type { HealthStatus, NexusMessage, RuntimeContextEnvelope, RuntimeProcessResult } from "@/runtimes/_nextgen/RuntimeTypes";
import { LongevityProtocolAgent } from "@/runtimes/ambrosia/agents/LongevityProtocolAgent";
import { MetabolicTwinAgent } from "@/runtimes/ambrosia/agents/MetabolicTwinAgent";
import { MicrobiomeHarmonizerAgent } from "@/runtimes/ambrosia/agents/MicrobiomeHarmonizerAgent";
import { NutrientSynergyAgent } from "@/runtimes/ambrosia/agents/NutrientSynergyAgent";

export class AmbrosiaRuntime {
  readonly id = "ambrosia";
  readonly name = "Ambrosia Runtime";

  private started = false;
  private readonly loop = new SafeRuntimeLoop();
  private readonly agents = [
    new MetabolicTwinAgent(),
    new MicrobiomeHarmonizerAgent(),
    new NutrientSynergyAgent(),
    new LongevityProtocolAgent(),
  ] as const;

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    this.loop.schedule(45_000, async () => {
      await Promise.allSettled(this.agents.map((agent) => agent.learn({ type: "nutrition-pulse", at: Date.now() })));
    });
  }

  async stop(): Promise<void> {
    this.loop.stopAll();
    this.started = false;
  }

  async healthCheck(): Promise<HealthStatus> {
    return this.loop.health(this.started, this.agents.length);
  }

  async process(query: string): Promise<RuntimeProcessResult<string>> {
    const settled = await Promise.allSettled(this.agents.map(async (agent) => ({
      agentId: agent.id,
      agentName: agent.name,
      domain: agent.domain,
      result: await agent.run({ query }),
    })));
    const agents = settled.flatMap((item) => item.status === "fulfilled" ? [item.value] : []);
    return {
      agents,
      confidence: agents.length ? 0.78 : 0,
      synthesis: {
        summary: "Ambrosia synthesizes metabolism, microbiome, nutrient timing and longevity heuristics for educational nutrition modeling.",
        priorityActions: agents.map((item) => item.result).slice(0, 6),
        risks: [],
        disclaimers: [],
      },
    };
  }

  async buildContext(query: string): Promise<RuntimeContextEnvelope<string>> {
    const response = await this.process(query);
    return {
      label: "Ambrosia longevity and metabolism swarm",
      confidence: response.confidence,
      evidence: response.agents.map((item) => item.agentName),
      context: [
        "AMBROSIA RUNTIME ACTIVE",
        response.synthesis.summary,
        ...response.agents.map((item) => `${item.agentName}: ${item.result}`),
      ].join("\n"),
      response,
    };
  }

  async sendMessage(message: NexusMessage): Promise<unknown> {
    const query = typeof message?.payload === "string" ? message.payload : "";
    if (!query) return { ok: false, error: "empty-query" };
    return this.process(query);
  }
}