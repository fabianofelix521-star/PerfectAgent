import type { ChronoJobContext } from "@/tools/chrono/ChronoEngine";
import type { NexusToolInput, NexusToolOutput } from "@/tools/core/NexusToolBase";
import { ToolRegistry } from "@/tools/core/ToolRegistry";
import { mean } from "@/tools/core/toolUtils";

export function ensureToolsRegistered(): void {
  if (!ToolRegistry.getAll().length) ToolRegistry.autoRegister();
}

export function makeToolInput(
  ctx: ChronoJobContext,
  params: Record<string, unknown>,
): NexusToolInput {
  return {
    params,
    priority: ctx.systemState.stress > 0.7 ? "high" : "normal",
    budgetMs: 5000,
    qualityThreshold: 0.65,
    context: {
      agentId: "chrono-engine",
      runtimeId: "nexus-prime",
      sessionId: ctx.executionId,
      previousToolOutputs: new Map(),
      sharedMemory: ctx.sharedData,
      executionDepth: 0,
    },
  };
}

export async function runTool(
  toolId: string,
  ctx: ChronoJobContext,
  params: Record<string, unknown>,
): Promise<NexusToolOutput | undefined> {
  ensureToolsRegistered();
  const tool = ToolRegistry.get(toolId);
  if (!tool) return undefined;
  return tool.execute(makeToolInput(ctx, params));
}

export function outputsQuality(outputs: Array<NexusToolOutput | undefined>): number {
  const present = outputs.filter((output): output is NexusToolOutput => Boolean(output));
  return present.length ? mean(present.map((output) => output.quality)) : 0;
}

export function outputResults(outputs: Array<NexusToolOutput | undefined>): unknown[] {
  return outputs.filter((output): output is NexusToolOutput => Boolean(output)).map((output) => output.result);
}
