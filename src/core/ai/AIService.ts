import { useConfig } from "@/stores/config";
import type { ChatMessageV2, ProviderConfig } from "@/types";
import { unifiedAIService } from "@/core/ai/providers/UnifiedAIService";

export interface ModelInfo {
  id: string;
  providerId: string;
  providerName: string;
  name: string;
  contextWindow?: number;
  capabilities: string[];
}

export interface AIRequestOptions {
  model: string;
  providerId?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

class AIServiceImpl {
  async *stream(
    messages: ChatMessageV2[],
    options: AIRequestOptions,
  ): AsyncIterable<string> {
    for await (const chunk of unifiedAIService.stream({
      messages,
      model: options.model,
      providerId: options.providerId,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      signal: options.signal,
    })) {
      yield chunk.delta;
    }
  }

  async getAvailableModels(): Promise<ModelInfo[]> {
    const state = useConfig.getState();
    const providers = Object.values(state.providers).filter(
      (provider) => provider.configured && provider.enabled,
    );
    const models = state.models.filter((model) =>
      providers.some((provider) => provider.id === model.providerId),
    );
    return models.map((model) => {
      const provider = state.providers[model.providerId];
      return {
        id: model.id,
        providerId: model.providerId,
        providerName: provider?.name ?? model.providerId,
        name: model.label,
        contextWindow: model.contextWindow,
        capabilities: inferCapabilities(provider, model.id),
      };
    });
  }

  getConfiguredProviders(): string[] {
    return Object.values(useConfig.getState().providers)
      .filter((provider) => provider.configured && provider.enabled)
      .map((provider) => provider.id);
  }

  estimateCost(model: string, inputTokens: number): number {
    return unifiedAIService.estimateCost(model, inputTokens);
  }

  getProviderForModel(model: string, preferredProviderId?: string) {
    const state = useConfig.getState();
    if (preferredProviderId) {
      const preferred = state.providers[preferredProviderId];
      if (preferred?.configured && preferred.enabled) return preferred;
    }
    const match = state.models.find((item) => item.id === model);
    if (match) {
      const provider = state.providers[match.providerId];
      if (provider?.configured && provider.enabled) return provider;
    }
    return Object.values(state.providers).find(
      (provider) =>
        provider.configured &&
        provider.enabled &&
        provider.defaultModel === model,
    );
  }
}

function inferCapabilities(
  provider: ProviderConfig | undefined,
  model: string,
): string[] {
  const caps = ["chat"];
  if (/code|coder|claude|gpt-4|deepseek|qwen/i.test(model)) caps.push("code");
  if (/vision|gpt-4o|gemini|claude/i.test(model) || provider?.supportsVision) {
    caps.push("vision");
  }
  if (/audio|tts|whisper/i.test(model)) caps.push("audio");
  return caps;
}

export const AIService = new AIServiceImpl();
