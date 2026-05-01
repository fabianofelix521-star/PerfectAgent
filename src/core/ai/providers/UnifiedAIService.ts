import { buildSpecFromConfig } from "@/stores/config";
import { providerRegistry } from "@/core/ai/providers/AIProviderRegistry";
import { CostOptimizer } from "@/core/ai/routing/CostOptimizer";
import { FallbackChain } from "@/core/ai/routing/FallbackChain";
import { ModelRouter } from "@/core/ai/routing/ModelRouter";
import type { AIRequest, StreamChunk } from "@/core/ai/providers/types";

export class UnifiedAIService {
  private readonly router = new ModelRouter();
  private readonly fallback = new FallbackChain();
  private readonly cost = new CostOptimizer();

  async *stream(request: AIRequest): AsyncIterable<StreamChunk> {
    const routed = await this.router.route(request);
    const attempts = this.fallback.build({
      ...request,
      model: routed.model,
      providerId: routed.providerId ?? request.providerId,
    });

    let lastError: Error | null = null;

    for (const attempt of attempts) {
      const providerConfig = providerRegistry.resolveProviderForModel(
        attempt.model,
        attempt.providerId,
      );
      if (!providerConfig) continue;

      const spec = buildSpecFromConfig(providerConfig);
      if (!spec) continue;

      try {
        const provider = providerRegistry.get(providerConfig.id);
        for await (const chunk of provider.stream({
          spec,
          model: attempt.model,
          messages: request.messages,
          temperature: request.temperature,
          maxTokens: request.maxTokens,
          signal: request.signal,
        })) {
          yield chunk;
        }
        return;
      } catch (error) {
        lastError = error as Error;
      }
    }

    throw lastError ?? new Error("Nenhum provider disponivel para processar a solicitacao.");
  }

  async complete(request: AIRequest): Promise<string> {
    let acc = "";
    for await (const chunk of this.stream(request)) acc += chunk.delta;
    return acc;
  }

  estimateCost(model: string, inputTokens: number, outputTokens?: number): number {
    return this.cost.estimate({ model, inputTokens, outputTokens });
  }
}

export const unifiedAIService = new UnifiedAIService();
