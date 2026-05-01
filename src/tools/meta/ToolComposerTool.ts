import {
  type ExecutionApproach,
  type NexusToolInput,
  type NexusToolOutput,
  NexusToolBase,
  type QualityAssessment,
} from "@/tools/core/NexusToolBase";
import { asString, asStringArray, clamp01, keywordScore, mean, stableId } from "@/tools/core/toolUtils";

interface ComposedPipeline {
  id: string;
  stages: Array<{ name: string; toolIds: string[] }>;
  parallelGroups: string[][];
}

interface ToolComposerResult {
  pipeline: ComposedPipeline;
  results: {
    outputs: NexusToolOutput[];
    quality: number;
    totalLatencyMs: number;
    parallelizationGain: number;
  };
  totalLatencyMs: number;
  parallelizationGain: number;
  quality: number;
}

export class ToolComposerTool extends NexusToolBase {
  id = "tool-composer";
  name = "Intelligent Tool Pipeline Composer";
  description =
    "Compõe múltiplas tools em super-pipelines, paraleliza independentes e aprende pipelines úteis por objetivo.";
  category = "meta";

  protected async reason(input: NexusToolInput): Promise<ExecutionApproach> {
    const objective = asString(input.params.objective);
    return {
      shouldProceed: Boolean(objective),
      reason: objective ? "" : "objective é obrigatório",
      strategy: "dependency-graph",
      reasoning: "Grafo de dependências permite maximizar paralelismo sem perder contexto.",
      alternativesConsidered: ["sequential-always", "single-best-tool"],
      estimatedQuality: 0.9,
      estimatedLatencyMs: 300,
    };
  }

  protected async executeCore(input: NexusToolInput): Promise<ToolComposerResult> {
    const objective = asString(input.params.objective);
    const constraints = asStringArray(input.params.constraints);
    const availableTools = asStringArray(input.params.availableTools);
    const requiredCapabilities = this.analyzeObjective(objective);
    const selectedTools = this.selectTools(requiredCapabilities, availableTools);
    const dependencyGraph = this.buildDependencyGraph(selectedTools);
    const optimizedPipeline = this.optimizePipeline(dependencyGraph, constraints);
    const results = await this.executePipeline(optimizedPipeline, input);
    if (results.quality > 0.8) {
      await this.memory.savePipeline(objective, optimizedPipeline);
    }
    return {
      pipeline: optimizedPipeline,
      results,
      totalLatencyMs: results.totalLatencyMs,
      parallelizationGain: results.parallelizationGain,
      quality: results.quality,
    };
  }

  protected async evaluate(result: unknown): Promise<QualityAssessment> {
    const composed = result as ToolComposerResult | null;
    return {
      score: composed?.quality ?? 0,
      confidence: composed ? 0.88 : 0,
      limitations:
        composed && composed.parallelizationGain < 0.3
          ? ["baixo ganho de paralelização; dependências fortes"]
          : [],
      improvements:
        composed && composed.pipeline.stages.length < 2
          ? ["adicionar tools complementares para reduzir ponto único de falha"]
          : [],
    };
  }

  private analyzeObjective(objective: string): string[] {
    const capabilityRules = [
      ["perception", ["scan", "monitor", "market", "blockchain", "social", "news"]],
      ["cognition", ["reason", "bayes", "causal", "hypothesis", "contradiction"]],
      ["synthesis", ["report", "synthesize", "narrative", "insight"]],
      ["execution", ["deploy", "publish", "trade", "email", "execute"]],
      ["memory", ["remember", "memory", "pattern", "knowledge"]],
    ] as const;
    return capabilityRules
      .filter(([, keywords]) => keywordScore(objective, [...keywords]) > 0)
      .map(([capability]) => capability);
  }

  private selectTools(capabilities: string[], available: string[]): string[] {
    const defaults: Record<string, string[]> = {
      perception: ["dark-pool-detector", "blockchain-scanner"],
      cognition: ["bayesian-updater", "causal-reasoning"],
      synthesis: ["narrative-builder", "multi-source-synthesizer"],
      execution: ["code-deployer", "content-publisher"],
      memory: ["episodic-recorder", "pattern-extractor"],
    };
    const candidates = capabilities.flatMap((capability) => defaults[capability] ?? []);
    const pool = available.length ? available : candidates;
    return candidates.filter((candidate) => pool.includes(candidate)).slice(0, 8);
  }

  private buildDependencyGraph(tools: string[]): { nodes: string[]; edges: Array<[string, string]> } {
    const edges: Array<[string, string]> = [];
    for (const tool of tools) {
      if (/synthesizer|report|narrative/.test(tool)) {
        for (const source of tools.filter((item) => item !== tool)) edges.push([source, tool]);
      }
      if (/deployer|publisher|trader|email/.test(tool)) {
        for (const source of tools.filter((item) => !/deployer|publisher|trader|email/.test(item))) {
          edges.push([source, tool]);
        }
      }
    }
    return { nodes: tools, edges };
  }

  private optimizePipeline(
    graph: { nodes: string[]; edges: Array<[string, string]> },
    constraints: string[],
  ): ComposedPipeline {
    const dependent = new Set(graph.edges.map(([, target]) => target));
    const firstStage = graph.nodes.filter((node) => !dependent.has(node));
    const later = graph.nodes.filter((node) => dependent.has(node));
    const preferSpeed = constraints.some((constraint) => /speed|latency|rapido/i.test(constraint));
    return {
      id: stableId(`${graph.nodes.join(":")}:${constraints.join(":")}`),
      stages: [
        { name: preferSpeed ? "parallel-fast" : "perception-cognition", toolIds: firstStage },
        ...(later.length ? [{ name: "dependent-synthesis-execution", toolIds: later }] : []),
      ].filter((stage) => stage.toolIds.length),
      parallelGroups: [firstStage, later].filter((group) => group.length > 1),
    };
  }

  private async executePipeline(
    pipeline: ComposedPipeline,
    input: NexusToolInput,
  ): Promise<ToolComposerResult["results"]> {
    const { ToolRegistry } = await import("@/tools/core/ToolRegistry");
    const start = Date.now();
    const outputs: NexusToolOutput[] = [];
    for (const stage of pipeline.stages) {
      const stageOutputs = await Promise.all(
        stage.toolIds.map(async (toolId) => {
          const tool = ToolRegistry.get(toolId);
          if (!tool || tool.id === this.id) return undefined;
          return tool.execute(input);
        }),
      );
      outputs.push(...stageOutputs.filter((item): item is NexusToolOutput => Boolean(item)));
    }
    const serialLatency = outputs.reduce((sum, output) => sum + output.latencyMs, 0);
    const totalLatencyMs = Date.now() - start;
    return {
      outputs,
      quality: outputs.length ? mean(outputs.map((output) => output.quality)) : 0.5,
      totalLatencyMs,
      parallelizationGain: clamp01(1 - totalLatencyMs / Math.max(1, serialLatency)),
    };
  }
}
