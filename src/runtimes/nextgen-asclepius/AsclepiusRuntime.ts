import { SafeRuntimeLoop } from "@/runtimes/_nextgen/SafeRuntimeLoop";
import type { HealthStatus, NexusMessage, RuntimeContextEnvelope, RuntimeProcessResult } from "@/runtimes/_nextgen/RuntimeTypes";
import { ClinicalSimulatorAgent } from "@/runtimes/nextgen-asclepius/agents/ClinicalSimulatorAgent";
import { MechanismDecoderAgent } from "@/runtimes/nextgen-asclepius/agents/MechanismDecoderAgent";
import { MolecularArchitectAgent } from "@/runtimes/nextgen-asclepius/agents/MolecularArchitectAgent";
import { SynergyHunterAgent } from "@/runtimes/nextgen-asclepius/agents/SynergyHunterAgent";

export class AsclepiusRuntime {
  readonly id = "asclepius-nextgen";
  readonly name = "Asclepius Runtime";

  private started = false;
  private readonly loop = new SafeRuntimeLoop();
  private readonly agents = [
    new MolecularArchitectAgent(),
    new MechanismDecoderAgent(),
    new SynergyHunterAgent(),
    new ClinicalSimulatorAgent(),
  ] as const;

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    this.loop.schedule(35_000, async () => {
      await Promise.allSettled(this.agents.map((agent) => agent.learn({ type: "research-cycle", at: Date.now() })));
    });
  }

  async stop(): Promise<void> {
    this.loop.stopAll();
    this.started = false;
  }

  async healthCheck(): Promise<HealthStatus> {
    return this.loop.health(this.started, this.agents.length);
  }

  async process(query: string): Promise<RuntimeProcessResult<unknown>> {
    const settled = await Promise.allSettled(this.agents.map(async (agent) => ({ agentId: agent.id, agentName: agent.name, domain: agent.domain, result: await agent.run({ query }) })));
    const agents = settled.flatMap((item) => item.status === "fulfilled" ? [item.value] : []);
    return {
      agents,
      confidence: agents.length ? 0.72 : 0,
      synthesis: {
        summary: "Asclepius NextGen synthesizes molecular design, mechanism inference, synergy screening and in-silico trial modeling.",
        priorityActions: agents.map((item) => JSON.stringify(item.result).slice(0, 120)).slice(0, 5),
        risks: [],
        disclaimers: [],
      },
    };
  }

  async buildContext(query: string): Promise<RuntimeContextEnvelope<unknown>> {
    const response = await this.process(query);
    return {
      label: "Asclepius nextgen research swarm",
      confidence: response.confidence,
      evidence: response.agents.map((item) => item.agentName),
      context: ["ASCLEPIUS NEXTGEN ACTIVE", response.synthesis.summary, ...response.agents.map((item) => `${item.agentName}: ${JSON.stringify(item.result)}`)].join("\n"),
      response,
    };
  }

  async sendMessage(message: NexusMessage): Promise<unknown> {
    const query = typeof message?.payload === "string" ? message.payload : "";
    if (!query) return { ok: false, error: "empty-query" };
    return this.process(query);
  }
}