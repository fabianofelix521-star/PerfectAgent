import { ToolAnalytics } from "@/tools/core/ToolAnalytics";
import { ToolMemory } from "@/tools/core/ToolMemory";

export interface NexusToolInput {
  params: Record<string, unknown>;
  context: ToolExecutionContext;
  priority: "critical" | "high" | "normal" | "low";
  budgetMs?: number;
  budgetTokens?: number;
  qualityThreshold?: number;
}

export interface NexusToolOutput {
  result: unknown;
  quality: number;
  confidence: number;
  latencyMs: number;
  tokensUsed?: number;
  reasoning?: string;
  alternativesConsidered?: string[];
  limitationsEncountered?: string[];
  collaborationUsed?: string[];
  learningExtracted?: string;
  nextTimeWouldDo?: string;
}

export interface ToolExecutionContext {
  agentId: string;
  runtimeId: string;
  sessionId: string;
  previousToolOutputs: Map<string, NexusToolOutput>;
  sharedMemory: Map<string, unknown>;
  executionDepth: number;
}

export interface ToolMetrics {
  totalExecutions: number;
  successRate: number;
  avgLatencyMs: number;
  avgQuality: number;
  avgConfidence: number;
  topFailureReasons: string[];
  adaptationsApplied: number;
  collaborationsInitiated: number;
  lastCalibration: number;
}

export interface ExecutionApproach {
  shouldProceed: boolean;
  reason: string;
  strategy: string;
  reasoning: string;
  alternativesConsidered: string[];
  estimatedQuality: number;
  estimatedLatencyMs: number;
}

export interface QualityAssessment {
  score: number;
  confidence: number;
  limitations: string[];
  improvements: string[];
}

export interface LearningOutput {
  insight: string;
  improvement: string;
  shouldAdapt: boolean;
}

export abstract class NexusToolBase {
  abstract id: string;
  abstract name: string;
  abstract description: string;
  abstract category: string;

  protected memory: ToolMemory;
  protected analytics: ToolAnalytics;
  protected metrics: ToolMetrics = {
    totalExecutions: 0,
    successRate: 1,
    avgLatencyMs: 0,
    avgQuality: 0,
    avgConfidence: 0,
    topFailureReasons: [],
    adaptationsApplied: 0,
    collaborationsInitiated: 0,
    lastCalibration: Date.now(),
  };

  constructor(memory = new ToolMemory(), analytics = new ToolAnalytics()) {
    this.memory = memory;
    this.analytics = analytics;
  }

  async execute(input: NexusToolInput): Promise<NexusToolOutput> {
    const start = Date.now();
    const approach = await this.reason(input);
    if (!approach.shouldProceed) {
      return this.createSkipOutput(approach.reason, start);
    }

    let result: unknown;
    let error: Error | null = null;

    try {
      result = await this.withBudget(
        this.executeCore(input, approach),
        input.budgetMs,
      );
    } catch (caught) {
      error = caught instanceof Error ? caught : new Error(String(caught));
      result = await this.recoverFromError(error, input, approach);
    }

    const quality = await this.evaluate(result, input);
    const learning = await this.learn(input, result, quality, error);
    await this.adapt(learning);
    const latencyMs = Date.now() - start;
    this.updateMetrics(latencyMs, quality.score, !error, quality.confidence, error?.message);

    return {
      result,
      quality: quality.score,
      confidence: quality.confidence,
      latencyMs,
      reasoning: approach.reasoning,
      alternativesConsidered: approach.alternativesConsidered,
      limitationsEncountered: quality.limitations,
      learningExtracted: learning.insight,
      nextTimeWouldDo: learning.improvement,
    };
  }

  protected abstract reason(input: NexusToolInput): Promise<ExecutionApproach>;

  protected abstract executeCore(
    input: NexusToolInput,
    approach: ExecutionApproach,
  ): Promise<unknown>;

  protected abstract evaluate(
    result: unknown,
    input: NexusToolInput,
  ): Promise<QualityAssessment>;

  protected async recoverFromError(
    error: Error,
    input: NexusToolInput,
    approach: ExecutionApproach,
  ): Promise<unknown> {
    await this.memory.record({
      toolId: this.id,
      input: input.params,
      result: null,
      quality: 0,
      error: `${approach.strategy}: ${error.message}`,
      timestamp: Date.now(),
    });
    return null;
  }

  protected async learn(
    input: NexusToolInput,
    result: unknown,
    quality: QualityAssessment,
    error: Error | null,
  ): Promise<LearningOutput> {
    await this.memory.record({
      toolId: this.id,
      input: input.params,
      result,
      quality: quality.score,
      error: error?.message,
      timestamp: Date.now(),
    });

    return {
      insight:
        quality.score > 0.8
          ? `Abordagem efetiva para ${this.id}`
          : `Limitações: ${quality.limitations.join(", ") || "qualidade baixa"}`,
      improvement:
        quality.score < 0.7
          ? quality.improvements[0] ?? "considerar abordagem alternativa"
          : "manter estratégia atual",
      shouldAdapt: quality.score < 0.6,
    };
  }

  protected async adapt(learning: LearningOutput): Promise<void> {
    if (!learning.shouldAdapt) return;
    this.metrics.adaptationsApplied++;
    await this.memory.set(`adaptation:${this.id}`, {
      at: Date.now(),
      insight: learning.insight,
      improvement: learning.improvement,
    });
  }

  protected async collaborate(
    toolId: string,
    input: NexusToolInput,
  ): Promise<NexusToolOutput> {
    if (input.context.executionDepth > 5) {
      throw new Error("Tool collaboration depth exceeded");
    }
    const { ToolRegistry } = await import("@/tools/core/ToolRegistry");
    const tool = ToolRegistry.get(toolId);
    if (!tool) throw new Error(`Tool ${toolId} não encontrada`);
    this.metrics.collaborationsInitiated++;
    return tool.execute({
      ...input,
      context: {
        ...input.context,
        executionDepth: input.context.executionDepth + 1,
      },
    });
  }

  getMetrics(): ToolMetrics {
    return { ...this.metrics };
  }

  private updateMetrics(
    latencyMs: number,
    quality: number,
    success: boolean,
    confidence: number,
    failureReason?: string,
  ): void {
    this.metrics.totalExecutions++;
    const n = this.metrics.totalExecutions;
    this.metrics.avgLatencyMs = rollingAverage(this.metrics.avgLatencyMs, latencyMs, n);
    this.metrics.avgQuality = rollingAverage(this.metrics.avgQuality, quality, n);
    this.metrics.avgConfidence = rollingAverage(this.metrics.avgConfidence, confidence, n);
    this.metrics.successRate = rollingAverage(this.metrics.successRate, success ? 1 : 0, n);
    if (failureReason) {
      this.metrics.topFailureReasons = [...new Set([failureReason, ...this.metrics.topFailureReasons])].slice(0, 5);
    }
    this.analytics.record({
      toolId: this.id,
      latencyMs,
      quality,
      confidence,
      success,
      failureReason,
    });
  }

  private createSkipOutput(reason: string, start: number): NexusToolOutput {
    return {
      result: null,
      quality: 0,
      confidence: 1,
      latencyMs: Date.now() - start,
      reasoning: `Skipped: ${reason}`,
    };
  }

  private withBudget<T>(promise: Promise<T>, budgetMs: number | undefined): Promise<T> {
    if (!budgetMs) return promise;
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Budget exceeded: ${budgetMs}ms`)), budgetMs),
      ),
    ]);
  }
}

function rollingAverage(current: number, value: number, n: number): number {
  return (current * (n - 1) + value) / n;
}
