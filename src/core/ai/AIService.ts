import { api } from "@/services/api";
import { getRuntimeProviderSpec, useConfig } from "@/stores/config";
import type { ChatMessageV2, ProviderConfig } from "@/types";

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
    const provider = this.getProviderForModel(options.model, options.providerId);
    if (!provider) throw new Error("Nenhum provider configurado para o modelo.");
    const spec = getRuntimeProviderSpec(provider.id);
    if (!spec) throw new Error("Provider inválido.");

    const queue: string[] = [];
    let done = false;
    let failure: Error | null = null;
    let wake: (() => void) | null = null;
    const notify = () => {
      wake?.();
      wake = null;
    };

    const stop = api.streamChat({
      spec,
      model: options.model,
      messages: messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      temperature: options.temperature,
      onToken: (delta) => {
        queue.push(delta);
        notify();
      },
      onDone: () => {
        done = true;
        notify();
      },
      onError: (err) => {
        failure = new Error(err);
        done = true;
        notify();
      },
    });

    options.signal?.addEventListener("abort", () => {
      stop();
      done = true;
      notify();
    });

    while (!done || queue.length > 0) {
      const next = queue.shift();
      if (next !== undefined) {
        yield next;
        continue;
      }
      if (failure) throw failure;
      await new Promise<void>((resolve) => {
        wake = resolve;
      });
    }
    if (failure) throw failure;
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
    if (/gpt-4o|claude|opus|sonnet/i.test(model)) return inputTokens * 0.000005;
    if (/mini|haiku|flash|8b/i.test(model)) return inputTokens * 0.0000005;
    return inputTokens * 0.000001;
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
