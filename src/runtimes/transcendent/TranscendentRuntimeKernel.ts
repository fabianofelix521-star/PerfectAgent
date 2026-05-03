import { SafeRuntimeLoop } from "@/runtimes/_nextgen/SafeRuntimeLoop";
import type { HealthStatus, IRuntime, NexusMessage, RuntimeContextEnvelope, RuntimeProcessResult } from "@/runtimes/_nextgen/RuntimeTypes";
import type { CapabilityModule, RuntimeSynthesisPacket, TranscendentAgentResult } from "@/runtimes/transcendent/interfaces";
import { AgentRegistry } from "@/runtimes/transcendent/AgentRegistry";
import { RuntimeEventBus } from "@/runtimes/transcendent/RuntimeEventBus";
import { RuntimeOrchestrator } from "@/runtimes/transcendent/RuntimeOrchestrator";
import { ResonanceProtocolBus } from "@/runtimes/transcendent/ResonanceProtocolBus";
import { TranscendentBaseAgent } from "@/runtimes/transcendent/TranscendentBaseAgent";

function band(value: number): "low" | "medium" | "high" {
  if (value < 0.6) return "low";
  if (value < 0.82) return "medium";
  return "high";
}

export class TranscendentRuntimeKernel implements IRuntime {
  private started = false;
  private readonly loop = new SafeRuntimeLoop();

  constructor(
    readonly id: string,
    readonly name: string,
    private readonly domain: string,
    private readonly systemPrompt: string,
    private readonly agents: TranscendentBaseAgent[],
    private readonly capabilities: CapabilityModule[],
    private readonly disclaimers: string[],
  ) {
    for (const agent of agents) AgentRegistry.register(agent.capabilities());
    RuntimeOrchestrator.register(this);
  }

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    this.loop.schedule(45_000, async () => {
      await Promise.allSettled(this.agents.map((agent) => agent.dream(this.id)));
      RuntimeEventBus.emit({
        runtimeId: this.id,
        type: "runtime.health",
        correlationId: `${this.id}-dream-${Date.now()}`,
        at: Date.now(),
        data: { event: "dream-cycle", agents: this.agents.length },
      });
    });
  }

  async stop(): Promise<void> {
    this.loop.stopAll();
    this.started = false;
  }

  async healthCheck(): Promise<HealthStatus> {
    return this.loop.health(this.started, this.agents.length);
  }

  private calibrateConfidence(
    capabilityConfidences: number[],
    agentConfidences: number[],
    evidenceCount: number,
  ): number {
    const capMean = capabilityConfidences.reduce((sum, value) => sum + value, 0) / Math.max(1, capabilityConfidences.length);
    const agentMean = agentConfidences.reduce((sum, value) => sum + value, 0) / Math.max(1, agentConfidences.length);
    const disagreement = capabilityConfidences.length
      ? Math.max(...capabilityConfidences) - Math.min(...capabilityConfidences)
      : 0;
    const disagreementPenalty = disagreement * 0.28;
    const lowEvidencePenalty = evidenceCount < 6 ? 0.07 : 0;
    const blended = capMean * 0.62 + agentMean * 0.38;
    return Math.max(0.52, Math.min(0.97, blended - disagreementPenalty - lowEvidencePenalty));
  }

  private detectBiasAndRisks(
    query: string,
    capabilityConfidences: number[],
    evidenceCount: number,
  ): string[] {
    const findings: string[] = [];
    const disagreement = capabilityConfidences.length
      ? Math.max(...capabilityConfidences) - Math.min(...capabilityConfidences)
      : 0;
    if (disagreement > 0.22) findings.push("High capability disagreement indicates model uncertainty and scenario sensitivity");
    if (evidenceCount < 6) findings.push("Evidence diversity is low; result may overfit sparse signals");
    if (/\b(always|never|obvious|certain|everyone|nobody)\b/i.test(query)) {
      findings.push("Input framing contains absolute language; apply de-biasing and counterfactual checks");
    }
    if (!findings.length) {
      findings.push("No critical bias signal detected, but maintain adversarial verification before high-impact actions");
    }
    return findings;
  }

  private async synthesize(query: string): Promise<{ agents: TranscendentAgentResult[]; packet: RuntimeSynthesisPacket }> {
    const runs = await Promise.all(this.agents.map(async (agent) => {
      const action = await agent.run({ query });
      const reflections = await agent.reflect({ query, action });
      const simulation = await agent.simulate(query);
      const debate = await agent.debate(query);
      const decision = await agent.reason(await agent.perceive({ query }));
      return {
        agentId: agent.id,
        agentName: agent.name,
        domain: agent.domain,
        action,
        confidence: decision.confidence,
        reflections,
        debate,
        simulation,
      } as TranscendentAgentResult;
    }));

    const capSignals = await Promise.all(this.capabilities.map((capability) => capability.run({
      query,
      runtimeId: this.id,
      evidence: runs.flatMap((run) => run.reflections).slice(0, 6),
    })));

    const capabilityConfidences = capSignals.map((item) => item.confidence);
    const agentConfidences = runs.map((item) => item.confidence);
    const evidenceCount = capSignals.flatMap((item) => item.evidence).length;
    const confidence = this.calibrateConfidence(capabilityConfidences, agentConfidences, evidenceCount);
    const keyActions = runs.map((item) => `${item.agentName}: ${item.action}`).slice(0, 8);
    const adversarialFindings = [
      "Potential confounders under-specified",
      "Tail-event stress test recommended",
      ...this.detectBiasAndRisks(query, capabilityConfidences, evidenceCount),
    ].slice(0, 5);
    const resonanceSignals = [
      ...ResonanceProtocolBus.crossRuntime(this.id),
      ...capSignals.slice(0, 4).map((item) => `${item.capability}:${item.confidence.toFixed(2)}`),
    ].slice(0, 10);
    ResonanceProtocolBus.publish(this.id, keyActions.slice(0, 4));

    return {
      agents: runs,
      packet: {
        summary: `${this.name} synthesized ${runs.length} agents and ${capSignals.length} capability modules for ${this.domain}.`,
        confidence,
        confidenceBand: band(confidence),
        keyActions,
        risks: ["uncertainty under edge regimes", "requires human governance for high-stakes actions"],
        ethicsNotes: [
          "Harmful, deceptive, and exploitative outputs blocked by policy",
          "Bias-audit enforced: confidence is penalized under disagreement and sparse evidence",
        ],
        adversarialFindings,
        resonanceSignals,
      },
    };
  }

  async process(query: string): Promise<RuntimeProcessResult<TranscendentAgentResult>> {
    const { agents, packet } = await this.synthesize(query);
    RuntimeEventBus.emit({
      runtimeId: this.id,
      type: "runtime.process",
      correlationId: `${this.id}-process-${Date.now()}`,
      at: Date.now(),
      data: { confidence: packet.confidence, actions: packet.keyActions.length },
    });
    return {
      agents: agents.map((agent) => ({ agentId: agent.agentId, agentName: agent.agentName, domain: agent.domain, result: agent })),
      confidence: packet.confidence,
      synthesis: {
        summary: packet.summary,
        priorityActions: packet.keyActions,
        risks: [...packet.risks, ...packet.adversarialFindings],
        disclaimers: this.disclaimers,
      },
    };
  }

  async buildContext(query: string): Promise<RuntimeContextEnvelope<TranscendentAgentResult>> {
    const response = await this.process(query);
    return {
      label: `${this.name} transcendence context`,
      confidence: response.confidence,
      evidence: response.agents.flatMap((agent) => agent.result.reflections).slice(0, 8),
      context: [
        `${this.name.toUpperCase()} ACTIVE`,
        this.systemPrompt,
        response.synthesis.summary,
        `Actions: ${response.synthesis.priorityActions.join("; ")}`,
        `Risks: ${response.synthesis.risks.join("; ")}`,
      ].join("\n\n"),
      response,
    };
  }

  async sendMessage(message: NexusMessage): Promise<unknown> {
    const payload = typeof message.payload === "string" ? message.payload : JSON.stringify(message.payload ?? {});
    return this.process(payload);
  }
}
