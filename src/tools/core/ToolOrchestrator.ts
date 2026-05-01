import type {
  NexusToolInput,
  NexusToolOutput,
} from "@/tools/core/NexusToolBase";
import { ToolRegistry } from "@/tools/core/ToolRegistry";
import { mean } from "@/tools/core/toolUtils";

export interface ToolPipelineStage {
  name: string;
  toolIds: string[];
  dependsOn?: string[];
}

export interface ToolPipeline {
  name: string;
  stages: ToolPipelineStage[];
}

export interface PipelineResult {
  stages: Map<string, NexusToolOutput[]>;
  totalLatencyMs: number;
  quality: number;
  failedTools: string[];
}

export class ToolOrchestrator {
  async executeParallel(
    toolIds: string[],
    input: NexusToolInput,
  ): Promise<Map<string, NexusToolOutput>> {
    const entries = await Promise.allSettled(
      toolIds.map(async (toolId) => {
        const tool = ToolRegistry.get(toolId);
        if (!tool) return undefined;
        return [toolId, await tool.execute(input)] as const;
      }),
    );

    const results = new Map<string, NexusToolOutput>();
    for (const entry of entries) {
      if (entry.status === "fulfilled" && entry.value) {
        results.set(entry.value[0], entry.value[1]);
      }
    }
    return results;
  }

  async executeSequential(
    toolIds: string[],
    input: NexusToolInput,
  ): Promise<NexusToolOutput[]> {
    const results: NexusToolOutput[] = [];
    let currentInput = input;

    for (const toolId of toolIds) {
      const tool = ToolRegistry.get(toolId);
      if (!tool) continue;
      const result = await tool.execute(currentInput);
      results.push(result);
      currentInput = {
        ...currentInput,
        context: {
          ...currentInput.context,
          previousToolOutputs: new Map([
            ...currentInput.context.previousToolOutputs,
            [toolId, result],
          ]),
        },
      };
    }

    return results;
  }

  async executePipeline(
    pipeline: ToolPipeline,
    input: NexusToolInput,
  ): Promise<PipelineResult> {
    const start = Date.now();
    const stages = new Map<string, NexusToolOutput[]>();
    const failedTools: string[] = [];
    let currentInput = input;

    for (const stage of pipeline.stages) {
      const outputs = await this.executeParallel(stage.toolIds, currentInput);
      const values = [...outputs.values()];
      stages.set(stage.name, values);
      for (const toolId of stage.toolIds) {
        if (!outputs.has(toolId)) failedTools.push(toolId);
      }
      currentInput = {
        ...currentInput,
        context: {
          ...currentInput.context,
          previousToolOutputs: new Map([
            ...currentInput.context.previousToolOutputs,
            ...outputs,
          ]),
        },
      };
    }

    return {
      stages,
      totalLatencyMs: Date.now() - start,
      quality: this.calculatePipelineQuality(stages),
      failedTools,
    };
  }

  private calculatePipelineQuality(stages: Map<string, NexusToolOutput[]>): number {
    const qualities = [...stages.values()].flat().map((output) => output.quality);
    return qualities.length ? mean(qualities) : 0;
  }
}
