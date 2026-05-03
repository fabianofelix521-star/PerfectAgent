import { SafeRuntimeLoop } from "@/runtimes/_nextgen/SafeRuntimeLoop";
import type { HealthStatus, NexusMessage, RuntimeContextEnvelope, RuntimeProcessResult } from "@/runtimes/_nextgen/RuntimeTypes";
import { EntanglementOptimizerAgent } from "@/runtimes/quantum/agents/EntanglementOptimizerAgent";
import { ErrorCorrectionAgent } from "@/runtimes/quantum/agents/ErrorCorrectionAgent";
import { HamiltonianSolverAgent } from "@/runtimes/quantum/agents/HamiltonianSolverAgent";
import { QuantumClassicalBridgeAgent } from "@/runtimes/quantum/agents/QuantumClassicalBridgeAgent";

export class QuantumRuntime {
  readonly id = "quantum";
  readonly name = "Quantum Runtime";

  private started = false;
  private readonly loop = new SafeRuntimeLoop();
  private readonly agents = [
    new EntanglementOptimizerAgent(),
    new HamiltonianSolverAgent(),
    new ErrorCorrectionAgent(),
    new QuantumClassicalBridgeAgent(),
  ] as const;

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    this.loop.schedule(7_500, async () => {
      await Promise.allSettled(this.agents.map((agent) => agent.learn({ type: "noise-scan", at: Date.now() })));
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
      confidence: agents.length ? 0.77 : 0,
      synthesis: {
        summary: "Quantum synthesizes entanglement, Hamiltonian modeling, fault tolerance and hybrid optimization guidance.",
        priorityActions: agents.map((item) => JSON.stringify(item.result).slice(0, 120)).slice(0, 4),
        risks: ["Conceptual quantum planning only when no hardware backend is configured."],
        disclaimers: ["Simulation-first runtime. No assumption of real quantum hardware execution."],
      },
    };
  }

  async buildContext(query: string): Promise<RuntimeContextEnvelope<unknown>> {
    const response = await this.process(query);
    return {
      label: "Quantum algorithmic swarm",
      confidence: response.confidence,
      evidence: response.agents.map((item) => item.agentName),
      context: [
        "QUANTUM RUNTIME ACTIVE",
        response.synthesis.summary,
        ...response.agents.map((item) => `${item.agentName}: ${JSON.stringify(item.result)}`),
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