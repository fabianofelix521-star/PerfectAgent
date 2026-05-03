import { SafeRuntimeLoop } from "@/runtimes/_nextgen/SafeRuntimeLoop";
import type { HealthStatus, NexusMessage, RuntimeContextEnvelope, RuntimeProcessResult } from "@/runtimes/_nextgen/RuntimeTypes";
import { AudiencePsychographAgent } from "@/runtimes/nextgen-hermes/agents/AudiencePsychographAgent";
import { CampaignOrchestratorAgent } from "@/runtimes/nextgen-hermes/agents/CampaignOrchestratorAgent";
import { MemeEngineerAgent } from "@/runtimes/nextgen-hermes/agents/MemeEngineerAgent";
import { SentimentSurferAgent } from "@/runtimes/nextgen-hermes/agents/SentimentSurferAgent";

export class HermesRuntime {
  readonly id = "hermes-memetics";
  readonly name = "Hermes Runtime";

  private started = false;
  private readonly loop = new SafeRuntimeLoop();
  private readonly agents = [
    new MemeEngineerAgent(),
    new AudiencePsychographAgent(),
    new CampaignOrchestratorAgent(),
    new SentimentSurferAgent(),
  ] as const;

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    this.loop.schedule(20_000, async () => {
      await Promise.allSettled(this.agents.map((agent) => agent.learn({ type: "campaign-pulse", at: Date.now() })));
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
        summary: "Hermes NextGen synthesizes ethical psychographics, memetic content, channel planning and sentiment tracking.",
        priorityActions: agents.map((item) => JSON.stringify(item.result).slice(0, 120)).slice(0, 5),
        risks: ["No dark patterns, sensitive-trait exploitation or abusive manipulation."],
        disclaimers: ["Ethical marketing only. Privacy and vulnerable-audience exploitation are out of scope."],
      },
    };
  }

  async buildContext(query: string): Promise<RuntimeContextEnvelope<unknown>> {
    const response = await this.process(query);
    return {
      label: "Hermes nextgen ethical marketing swarm",
      confidence: response.confidence,
      evidence: response.agents.map((item) => item.agentName),
      context: ["HERMES NEXTGEN ACTIVE", response.synthesis.summary, ...response.agents.map((item) => `${item.agentName}: ${JSON.stringify(item.result)}`)].join("\n"),
      response,
    };
  }

  async sendMessage(message: NexusMessage): Promise<unknown> {
    const query = typeof message?.payload === "string" ? message.payload : "";
    if (!query) return { ok: false, error: "empty-query" };
    return this.process(query);
  }
}