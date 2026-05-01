import type { ProviderConfig } from "@/types";
import { useConfig } from "@/stores/config";
import type { AIProvider } from "@/core/ai/providers/types";
import { AnthropicProvider } from "@/core/ai/providers/AnthropicProvider";
import { OpenAIProvider } from "@/core/ai/providers/OpenAIProvider";
import { GeminiProvider } from "@/core/ai/providers/GeminiProvider";
import { GroqProvider } from "@/core/ai/providers/GroqProvider";
import { CohereProvider } from "@/core/ai/providers/CohereProvider";
import { MistralProvider } from "@/core/ai/providers/MistralProvider";
import { HuggingFaceProvider } from "@/core/ai/providers/HuggingFaceProvider";
import { OllamaProvider } from "@/core/ai/providers/OllamaProvider";
import { OpenRouterProvider } from "@/core/ai/providers/OpenRouterProvider";

const DEFAULT_PROVIDER = new OpenAIProvider();

export class AIProviderRegistry {
  private readonly providers = new Map<string, AIProvider>();

  constructor() {
    this.register(new AnthropicProvider());
    this.register(new OpenAIProvider());
    this.register(new GeminiProvider());
    this.register(new GroqProvider());
    this.register(new CohereProvider());
    this.register(new MistralProvider());
    this.register(new HuggingFaceProvider());
    this.register(new OllamaProvider());
    this.register(new OpenRouterProvider());
  }

  register(provider: AIProvider): void {
    this.providers.set(provider.id, provider);
  }

  get(providerId: string | undefined): AIProvider {
    if (!providerId) return DEFAULT_PROVIDER;
    return this.providers.get(providerId) ?? DEFAULT_PROVIDER;
  }

  list(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  resolveProviderForModel(model: string, explicitProviderId?: string): ProviderConfig | undefined {
    const state = useConfig.getState();

    if (explicitProviderId) {
      const explicit = state.providers[explicitProviderId];
      if (explicit?.enabled && explicit.configured) return explicit;
    }

    const modelHit = state.models.find((item) => item.id === model && item.enabled);
    if (modelHit) {
      const provider = state.providers[modelHit.providerId];
      if (provider?.enabled && provider.configured) return provider;
    }

    return Object.values(state.providers).find((provider) => {
      if (!provider.enabled || !provider.configured) return false;
      const adapter = this.get(provider.id);
      return adapter.supportsModel(model);
    });
  }
}

export const providerRegistry = new AIProviderRegistry();
