import type {
  AgentCapability,
  AgentInput,
  AgentMemory,
  AgentMetrics,
  AgentOutput,
  AgentStatus,
  AgentTool,
  AgentTier,
  BaseAgent,
  CollaborationRequest,
  CollaborationResponse,
  ExecutionContext,
} from "@/types/agents";
import { clamp01, now, stableId, tokenize, uniqueMerge } from "@/runtimes/shared/cognitiveCore";
import {
  assessOutputActionability,
  assessOutputCoherence,
  assessOutputCompleteness,
  assessOutputDepth,
  assessOutputEvidence,
  calibrateAnalysisConfidence,
} from "@/runtimes/shared/confidenceCalibration";
import {
  CONFIDENCE_CALIBRATION_RULE,
  GLOBAL_CITATION_RULE,
  withRuntimeInstructions,
} from "@/runtimes/shared/runtimeInstructions";

export interface RuntimeAgentConfig {
  id: string;
  name: string;
  description: string;
  supervisorId: string;
  tier: AgentTier;
  tags: string[];
  systemPrompt: string;
  tools?: AgentTool[];
  capabilities?: AgentCapability[];
}

export interface RuntimeAgentAnalysis {
  result: Record<string, unknown>;
  confidence: number;
  reasoning?: string;
  toolsUsed?: string[];
  followUpSuggestions?: string[];
  collaborationNeeded?: string[];
}

function createAgentMemory(): AgentMemory {
  return {
    shortTerm: new Map<string, unknown>(),
    longTerm: new Map<string, unknown>(),
    episodic: [],
    semantic: new Map<string, string[]>(),
  };
}

function createAgentMetrics(): AgentMetrics {
  return {
    totalCalls: 0,
    successRate: 1,
    avgLatencyMs: 0,
    avgQualityScore: 0.7,
  };
}

export function createExecutionContext(seed: string): ExecutionContext {
  return {
    sessionId: stableId(`runtime-session:${seed}`),
    previousAgents: [],
    sharedMemory: new Map<string, unknown>(),
    startTime: now(),
    budgetMs: 8_000,
  };
}

export function buildCapability(id: string, name: string, description: string): AgentCapability {
  return {
    id,
    name,
    description,
    inputSchema: { type: "object" },
    outputSchema: { type: "object" },
    avgLatencyMs: 120,
  };
}

export function buildTool(
  name: string,
  description: string,
  execute?: (params: Record<string, unknown>) => Promise<unknown>,
): AgentTool {
  return {
    name,
    description,
    execute: async (params) => {
      if (execute) return execute(params as Record<string, unknown>);
      return {
        tool: name,
        acknowledged: true,
        params,
      };
    },
  };
}

export function inferKeywords(prompt: string, limit = 10): string[] {
  return uniqueMerge([], tokenize(prompt), limit);
}

export function summarizePrompt(prompt: string, maxLength = 220): string {
  const normalized = prompt.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

export abstract class RuntimeExpertAgent implements BaseAgent {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly supervisorId: string;
  readonly tier: AgentTier;
  readonly tags: string[];
  readonly capabilities: AgentCapability[];
  readonly systemPrompt: string;
  readonly tools: AgentTool[];

  status: AgentStatus = "idle";
  memory: AgentMemory = createAgentMemory();
  metrics: AgentMetrics = createAgentMetrics();

  constructor(config: RuntimeAgentConfig) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.supervisorId = config.supervisorId;
    this.tier = config.tier;
    this.tags = [...config.tags];
    this.systemPrompt = withRuntimeInstructions(
      config.systemPrompt,
      GLOBAL_CITATION_RULE,
      CONFIDENCE_CALIBRATION_RULE,
    );
    this.tools = config.tools ?? [];
    this.capabilities =
      config.capabilities ??
      [
        buildCapability(
          `${config.id}:analysis`,
          `${config.name} Analysis`,
          config.description,
        ),
      ];
  }

  async execute(input: AgentInput, context: ExecutionContext): Promise<AgentOutput> {
    const startedAt = now();
    this.status = "running";
    try {
      const analysis = await this.analyze(input, context);
      const latencyMs = now() - startedAt;
      const output: AgentOutput = {
        agentId: this.id,
        result: analysis.result,
        reasoning: analysis.reasoning,
        confidence: clamp01(analysis.confidence),
        latencyMs,
        toolsUsed: analysis.toolsUsed,
        followUpSuggestions: analysis.followUpSuggestions,
        collaborationNeeded: analysis.collaborationNeeded,
      };
      output.confidence = await this.selfEvaluate(output);
      this.recordSuccess(input, output, latencyMs);
      this.status = "idle";
      return output;
    } catch (error) {
      const latencyMs = now() - startedAt;
      this.status = "error";
      this.metrics.totalCalls += 1;
      this.metrics.lastError = error instanceof Error ? error.message : String(error);
      this.metrics.lastCalledAt = now();
      this.metrics.successRate = clamp01(this.metrics.successRate * 0.92);
      this.metrics.avgLatencyMs =
        this.metrics.avgLatencyMs === 0
          ? latencyMs
          : Math.round(this.metrics.avgLatencyMs * 0.75 + latencyMs * 0.25);
      throw error;
    }
  }

  async selfEvaluate(output: AgentOutput): Promise<number> {
    return calibrateAnalysisConfidence(output);
  }

  protected assessCompleteness(output: AgentOutput): number {
    return assessOutputCompleteness(output);
  }

  protected assessEvidence(output: AgentOutput): number {
    return assessOutputEvidence(output);
  }

  protected assessActionability(output: AgentOutput): number {
    return assessOutputActionability(output);
  }

  protected assessCoherence(output: AgentOutput): number {
    return assessOutputCoherence(output);
  }

  protected assessDepth(output: AgentOutput): number {
    return assessOutputDepth(output);
  }

  async collaborate(
    targetAgentId: string,
    request: CollaborationRequest,
  ): Promise<CollaborationResponse> {
    return {
      responderAgentId: this.id,
      accepted: true,
      confidence: 0.66,
      result: {
        targetAgentId,
        collaborationVector: this.tags.slice(0, 4),
        request,
      },
      message: `${this.name} prepared a collaboration brief for ${targetAgentId}.`,
    };
  }

  protected abstract analyze(
    input: AgentInput,
    context: ExecutionContext,
  ): Promise<RuntimeAgentAnalysis>;

  protected baseSemanticProfile(prompt: string): Record<string, unknown> {
    return {
      keywords: inferKeywords(prompt),
      promptSummary: summarizePrompt(prompt),
      activeTags: this.tags.filter((tag) => prompt.toLowerCase().includes(tag.toLowerCase())),
    };
  }

  private recordSuccess(input: AgentInput, output: AgentOutput, latencyMs: number): void {
    this.metrics.totalCalls += 1;
    this.metrics.lastCalledAt = now();
    this.metrics.successRate = clamp01(this.metrics.successRate * 0.9 + 0.1);
    this.metrics.avgLatencyMs =
      this.metrics.avgLatencyMs === 0
        ? latencyMs
        : Math.round(this.metrics.avgLatencyMs * 0.75 + latencyMs * 0.25);
    this.metrics.avgQualityScore = clamp01(
      this.metrics.avgQualityScore * 0.8 + output.confidence * 0.2,
    );

    this.memory.shortTerm.set("lastPrompt", input.prompt);
    this.memory.shortTerm.set("lastOutput", output.result);
    this.memory.episodic = [
      {
        timestamp: now(),
        input: input.prompt,
        output: output.result,
        quality: output.confidence,
      },
      ...this.memory.episodic,
    ].slice(0, 40);
    this.memory.semantic.set("keywords", inferKeywords(input.prompt, 12));
  }
}