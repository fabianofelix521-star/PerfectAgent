import {
  type NexusToolInput,
  type NexusToolOutput,
  NexusToolBase,
  type ExecutionApproach,
  type QualityAssessment,
} from "@/tools/core/NexusToolBase";
import {
  type ToolPipeline,
  ToolOrchestrator,
} from "@/tools/core/ToolOrchestrator";
import { ToolRegistry } from "@/tools/core/ToolRegistry";
import { clamp01, keywordScore, mean } from "@/tools/core/toolUtils";

export interface SuperToolDefinition {
  id: string;
  name: string;
  description: string;
  pipeline: ToolPipeline;
}

export class ToolComposer {
  composeForObjective(objective: string): ToolPipeline {
    const perception = keywordScore(objective, ["market", "news", "blockchain", "social", "scan"]) > 0;
    const cognition = keywordScore(objective, ["bayes", "causal", "reason", "hypothesis", "decision"]) > 0;
    const synthesis = keywordScore(objective, ["report", "summary", "narrative", "insight", "synthesis"]) > 0;
    const execution = keywordScore(objective, ["deploy", "publish", "trade", "email", "execute"]) > 0;

    return {
      name: `composed:${objective.slice(0, 48) || "general"}`,
      stages: [
        perception
          ? { name: "perception", toolIds: ["dark-pool-detector", "blockchain-scanner", "social-radar"] }
          : undefined,
        cognition
          ? { name: "cognition", toolIds: ["bayesian-updater", "causal-reasoning", "hypothesis-generator"] }
          : undefined,
        synthesis
          ? { name: "synthesis", toolIds: ["multi-source-synthesizer", "report-generator"] }
          : undefined,
        execution
          ? { name: "execution", toolIds: ["code-deployer", "content-publisher"] }
          : undefined,
      ].filter((stage): stage is ToolPipeline["stages"][number] => Boolean(stage)),
    };
  }

  createSuperTool(definition: SuperToolDefinition): NexusToolBase {
    return new ComposedSuperTool(definition);
  }
}

class ComposedSuperTool extends NexusToolBase {
  id: string;
  name: string;
  description: string;
  category = "meta";
  private readonly orchestrator = new ToolOrchestrator();

  constructor(private readonly definition: SuperToolDefinition) {
    super();
    this.id = definition.id;
    this.name = definition.name;
    this.description = definition.description;
  }

  protected async reason(): Promise<ExecutionApproach> {
    const existingTools = this.definition.pipeline.stages
      .flatMap((stage) => stage.toolIds)
      .filter((toolId) => ToolRegistry.get(toolId));
    return {
      shouldProceed: existingTools.length > 0,
      reason: existingTools.length ? "" : "pipeline sem tools registradas",
      strategy: "composed-super-tool",
      reasoning: `Super-tool executara ${existingTools.length} tools registradas em pipeline.`,
      alternativesConsidered: ["single-tool", "manual orchestration"],
      estimatedQuality: clamp01(0.6 + existingTools.length * 0.05),
      estimatedLatencyMs: 250,
    };
  }

  protected async executeCore(input: NexusToolInput): Promise<unknown> {
    const result = await this.orchestrator.executePipeline(this.definition.pipeline, input);
    return {
      pipeline: this.definition.pipeline.name,
      stages: [...result.stages.entries()],
      failedTools: result.failedTools,
      quality: result.quality,
      totalLatencyMs: result.totalLatencyMs,
    };
  }

  protected async evaluate(result: unknown): Promise<QualityAssessment> {
    const pipelineResult = result as { quality?: number; failedTools?: string[] } | null;
    const quality = pipelineResult?.quality ?? 0;
    const failedTools = pipelineResult?.failedTools ?? [];
    const stageCount = this.definition.pipeline.stages.length;
    return {
      score: clamp01(quality || mean([0.5, stageCount / 4])),
      confidence: failedTools.length ? 0.65 : 0.86,
      limitations: failedTools.length ? [`tools indisponiveis: ${failedTools.join(", ")}`] : [],
      improvements: failedTools.length ? ["registrar tools faltantes antes da proxima execucao"] : [],
    };
  }
}

export type { ToolPipeline, NexusToolOutput };
