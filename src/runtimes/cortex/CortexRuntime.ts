import { SafeRuntimeLoop } from "@/runtimes/_nextgen/SafeRuntimeLoop";
import type { HealthStatus, NexusMessage, RuntimeContextEnvelope, RuntimeProcessResult } from "@/runtimes/_nextgen/RuntimeTypes";
import { CognitiveAugmenterAgent } from "@/runtimes/cortex/agents/CognitiveAugmenterAgent";
import { ConnectomeMapperAgent } from "@/runtimes/cortex/agents/ConnectomeMapperAgent";
import { PlasticityEngineAgent } from "@/runtimes/cortex/agents/PlasticityEngineAgent";
import { SignalDecoderAgent } from "@/runtimes/cortex/agents/SignalDecoderAgent";

export class CortexRuntime {
  readonly id = "cortex";
  readonly name = "Cortex Runtime";

  private started = false;
  private readonly loop = new SafeRuntimeLoop();
  private readonly agents = [
    new SignalDecoderAgent(),
    new PlasticityEngineAgent(),
    new ConnectomeMapperAgent(),
    new CognitiveAugmenterAgent(),
  ] as const;

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    this.loop.schedule(3_000, async () => {
      await Promise.allSettled(this.agents.map((agent) => agent.learn({ type: "neural-pulse", at: Date.now() })));
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
      confidence: agents.length ? 0.76 : 0,
      synthesis: {
        summary: "Cortex synthesizes neural decoding, plasticity, connectomics and cognitive augmentation with full technical depth.",
        priorityActions: agents.map((item) => JSON.stringify(item.result).slice(0, 120)).slice(0, 5),
        risks: [],
        disclaimers: [],
      },
    };
  }

  async buildContext(query: string): Promise<RuntimeContextEnvelope<unknown>> {
    const response = await this.process(query);
    return {
      label: "Cortex neuroscience and BCI swarm",
      confidence: response.confidence,
      evidence: response.agents.map((item) => item.agentName),
      context: ["CORTEX RUNTIME ACTIVE", response.synthesis.summary, ...response.agents.map((item) => `${item.agentName}: ${JSON.stringify(item.result)}`)].join("\n"),
      response,
    };
  }

  async sendMessage(message: NexusMessage): Promise<unknown> {
    const query = typeof message?.payload === "string" ? message.payload : "";
    if (!query) return { ok: false, error: "empty-query" };
    return this.process(query);
  }
}