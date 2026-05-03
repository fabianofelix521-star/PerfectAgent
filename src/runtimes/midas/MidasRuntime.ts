import { SafeRuntimeLoop } from "@/runtimes/_nextgen/SafeRuntimeLoop";
import type { HealthStatus, NexusMessage, RuntimeContextEnvelope, RuntimeProcessResult } from "@/runtimes/_nextgen/RuntimeTypes";
import { AlphaHunterAgent } from "@/runtimes/midas/agents/AlphaHunterAgent";
import { MemeMomentumAgent } from "@/runtimes/midas/agents/MemeMomentumAgent";
import { OnChainDetectiveAgent } from "@/runtimes/midas/agents/OnChainDetectiveAgent";
import { RiskGuardianAgent } from "@/runtimes/midas/agents/RiskGuardianAgent";

export class MidasRuntime {
  readonly id = "midas";
  readonly name = "Midas Runtime";

  private started = false;
  private readonly loop = new SafeRuntimeLoop();
  private readonly agents = [
    new AlphaHunterAgent(),
    new OnChainDetectiveAgent(),
    new MemeMomentumAgent(),
    new RiskGuardianAgent(),
  ] as const;

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    this.loop.schedule(9_000, async () => {
      await Promise.allSettled(this.agents.map((agent) => agent.learn({ type: "market-tick", at: Date.now() })));
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
    const settled = await Promise.allSettled(this.agents.map(async (agent) => ({
      agentId: agent.id,
      agentName: agent.name,
      domain: agent.domain,
      result: await agent.run({ query }),
    })));
    const agents = settled.flatMap((item) => item.status === "fulfilled" ? [item.value] : []);
    return {
      agents,
      confidence: agents.length ? 0.73 : 0,
      synthesis: {
        summary: "Midas combines alpha scouting, on-chain forensics, memecoin dynamics and risk analysis for full-depth trading intelligence.",
        priorityActions: agents.map((item) => JSON.stringify(item.result).slice(0, 120)).slice(0, 5),
        risks: [],
        disclaimers: [],
      },
    };
  }

  async buildContext(query: string): Promise<RuntimeContextEnvelope<unknown>> {
    const response = await this.process(query);
    return {
      label: "Midas trading intelligence swarm",
      confidence: response.confidence,
      evidence: response.agents.map((item) => item.agentName),
      context: ["MIDAS RUNTIME ACTIVE", response.synthesis.summary, ...response.agents.map((item) => `${item.agentName}: ${JSON.stringify(item.result)}`)].join("\n"),
      response,
    };
  }

  async sendMessage(message: NexusMessage): Promise<unknown> {
    const query = typeof message?.payload === "string" ? message.payload : "";
    if (!query) return { ok: false, error: "empty-query" };
    return this.process(query);
  }
}