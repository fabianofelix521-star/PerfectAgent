import { SafeRuntimeLoop } from "@/runtimes/_nextgen/SafeRuntimeLoop";
import type { HealthStatus, NexusMessage, RuntimeContextEnvelope, RuntimeProcessResult } from "@/runtimes/_nextgen/RuntimeTypes";
import { ArchetypeMapperAgent } from "@/runtimes/nextgen-oracle/agents/ArchetypeMapperAgent";
import { MeditationGuideAgent } from "@/runtimes/nextgen-oracle/agents/MeditationGuideAgent";
import { SymbolDecoderAgent } from "@/runtimes/nextgen-oracle/agents/SymbolDecoderAgent";
import { WisdomSynthesizerAgent } from "@/runtimes/nextgen-oracle/agents/WisdomSynthesizerAgent";

export class OracleRuntime {
  readonly id = "oracle-symbolic";
  readonly name = "Oracle Runtime";

  private started = false;
  private readonly loop = new SafeRuntimeLoop();
  private readonly agents = [
    new ArchetypeMapperAgent(),
    new SymbolDecoderAgent(),
    new MeditationGuideAgent(),
    new WisdomSynthesizerAgent(),
  ] as const;

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    this.loop.schedule(60_000, async () => {
      await Promise.allSettled(this.agents.map((agent) => agent.learn({ type: "reflection-cycle", at: Date.now() })));
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
      confidence: agents.length ? 0.78 : 0,
      synthesis: {
        summary: "Oracle NextGen synthesizes archetypes, symbols, contemplative practice and cross-tradition wisdom with full depth.",
        priorityActions: agents.map((item) => JSON.stringify(item.result).slice(0, 120)).slice(0, 5),
        risks: [],
        disclaimers: [],
      },
    };
  }

  async buildContext(query: string): Promise<RuntimeContextEnvelope<unknown>> {
    const response = await this.process(query);
    return {
      label: "Oracle nextgen symbolic wisdom swarm",
      confidence: response.confidence,
      evidence: response.agents.map((item) => item.agentName),
      context: ["ORACLE NEXTGEN ACTIVE", response.synthesis.summary, ...response.agents.map((item) => `${item.agentName}: ${JSON.stringify(item.result)}`)].join("\n"),
      response,
    };
  }

  async sendMessage(message: NexusMessage): Promise<unknown> {
    const query = typeof message?.payload === "string" ? message.payload : "";
    if (!query) return { ok: false, error: "empty-query" };
    return this.process(query);
  }
}