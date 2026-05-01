import type {
  AgentCapability,
  AgentInput,
  AgentMemory,
  AgentMetrics,
  AgentOutput,
  AgentStatus,
  AgentTier,
  AgentTool,
  BaseAgent,
  CollaborationRequest,
  CollaborationResponse,
  ExecutionContext,
} from "@/types/agents";

interface AgentDescriptor {
  id: string;
  name: string;
  description: string;
  supervisorId: string;
  tier: AgentTier;
  tags: string[];
  systemPrompt: string;
  confidence: number;
  capabilities?: AgentCapability[];
  tools?: AgentTool[];
}

export abstract class ConceptualAgentBase implements BaseAgent {
  id: string;
  name: string;
  description: string;
  supervisorId: string;
  tier: AgentTier;
  tags: string[];
  status: AgentStatus = "idle";
  capabilities: AgentCapability[];
  memory: AgentMemory;
  metrics: AgentMetrics;
  systemPrompt: string;
  tools: AgentTool[];

  private readonly baseConfidence: number;

  constructor(descriptor: AgentDescriptor) {
    this.id = descriptor.id;
    this.name = descriptor.name;
    this.description = descriptor.description;
    this.supervisorId = descriptor.supervisorId;
    this.tier = descriptor.tier;
    this.tags = descriptor.tags;
    this.systemPrompt = descriptor.systemPrompt.trim();
    this.baseConfidence = descriptor.confidence;
    this.capabilities = descriptor.capabilities ?? [];
    this.tools = descriptor.tools ?? [];
    this.memory = {
      shortTerm: new Map<string, any>(),
      longTerm: new Map<string, any>(),
      episodic: [],
      semantic: new Map<string, string[]>(),
    };
    this.metrics = {
      totalCalls: 0,
      successRate: 1,
      avgLatencyMs: 0,
      avgQualityScore: descriptor.confidence,
    };
  }

  async execute(input: AgentInput, context: ExecutionContext): Promise<AgentOutput> {
    const startedAt = Date.now();
    this.status = "running";
    this.metrics.totalCalls += 1;
    this.metrics.lastCalledAt = startedAt;

    try {
      const summary = await this.runDomainLogic(input, context);
      const latencyMs = Date.now() - startedAt;
      const output: AgentOutput = {
        agentId: this.id,
        result: {
          ...summary.result,
          supervisorId: this.supervisorId,
          domainTags: this.tags,
        },
        reasoning: summary.reasoning,
        confidence: summary.confidence ?? this.baseConfidence,
        latencyMs,
        toolsUsed: summary.toolsUsed,
        followUpSuggestions: summary.followUpSuggestions,
        collaborationNeeded: summary.collaborationNeeded,
      };
      const quality = await this.selfEvaluate(output);
      this.updateMetrics(latencyMs, quality, undefined);
      this.memory.shortTerm.set(input.requestId, output.result);
      this.memory.episodic.push({
        timestamp: Date.now(),
        input,
        output,
        quality,
      });
      this.status = "idle";
      return output;
    } catch (err) {
      const latencyMs = Date.now() - startedAt;
      const message = (err as Error).message;
      this.updateMetrics(latencyMs, 0, message);
      this.status = "error";
      return {
        agentId: this.id,
        result: { error: message },
        confidence: 0,
        latencyMs,
        reasoning: `${this.name} encontrou erro ao processar a tarefa.`,
      };
    }
  }

  async selfEvaluate(output: AgentOutput): Promise<number> {
    if (typeof output.confidence !== "number") return this.baseConfidence;
    return Math.max(0, Math.min(1, output.confidence));
  }

  async collaborate(
    targetAgentId: string,
    request: CollaborationRequest,
  ): Promise<CollaborationResponse> {
    return {
      responderAgentId: this.id,
      accepted: true,
      confidence: this.baseConfidence,
      message: `Colaboração preparada para ${targetAgentId}`,
      result: {
        from: request.fromAgentId,
        task: request.task,
        sharedContextKeys: Object.keys(request.payload ?? {}),
      },
    };
  }

  protected createTool(name: string, description: string, result: any): AgentTool {
    return {
      name,
      description,
      execute: async () => result,
    };
  }

  protected abstract runDomainLogic(
    input: AgentInput,
    context: ExecutionContext,
  ): Promise<{
    result: Record<string, any>;
    reasoning: string;
    confidence?: number;
    toolsUsed?: string[];
    followUpSuggestions?: string[];
    collaborationNeeded?: string[];
  }>;

  private updateMetrics(latencyMs: number, quality: number, error?: string) {
    const prevCalls = Math.max(this.metrics.totalCalls - 1, 0);
    this.metrics.avgLatencyMs =
      (this.metrics.avgLatencyMs * prevCalls + latencyMs) /
      Math.max(this.metrics.totalCalls, 1);
    this.metrics.avgQualityScore =
      (this.metrics.avgQualityScore * prevCalls + quality) /
      Math.max(this.metrics.totalCalls, 1);
    if (error) {
      this.metrics.lastError = error;
      this.metrics.successRate =
        (this.metrics.successRate * prevCalls + 0) /
        Math.max(this.metrics.totalCalls, 1);
    } else {
      this.metrics.successRate =
        (this.metrics.successRate * prevCalls + 1) /
        Math.max(this.metrics.totalCalls, 1);
    }
  }
}
