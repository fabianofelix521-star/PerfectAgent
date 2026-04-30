import type { AgentRuntime, ModelConfig, ProviderConfig } from "@/types";
import { presetById } from "@/services/providers";

export function providerIsUsable(provider: ProviderConfig | undefined): provider is ProviderConfig {
  if (!provider) return false;
  return provider.enabled && (provider.configured || provider.spec.authMode === "none" || Boolean(provider.spec.apiKey || provider.apiKey));
}

export function getProviderOptions(providers: Record<string, ProviderConfig>, includeDisabled = false): ProviderConfig[] {
  return Object.values(providers)
    .filter((provider) => includeDisabled || providerIsUsable(provider))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getModelOptions(
  providerId: string | undefined,
  providers: Record<string, ProviderConfig>,
  models: ModelConfig[],
  includeDisabled = false,
): ModelConfig[] {
  if (!providerId) return [];
  const provider = providers[providerId];
  if (!provider || (!includeDisabled && !providerIsUsable(provider))) return [];
  const fromRegistry = models.filter((model) => model.providerId === providerId && (includeDisabled || model.enabled));
  if (fromRegistry.length) return fromRegistry;
  const preset = presetById(provider.presetId);
  return Array.from(new Set([provider.defaultModel, ...(preset?.presetModels ?? [])].filter(Boolean) as string[]))
    .map((id) => ({ id, providerId, name: id, label: id, enabled: true }));
}

export function resolveProviderId(
  selectedProviderId: string | undefined,
  defaultProviderId: string | undefined,
  providers: Record<string, ProviderConfig>,
): string | undefined {
  if (providerIsUsable(selectedProviderId ? providers[selectedProviderId] : undefined)) return selectedProviderId;
  if (providerIsUsable(defaultProviderId ? providers[defaultProviderId] : undefined)) return defaultProviderId;
  return getProviderOptions(providers)[0]?.id;
}

export function resolveModelId(
  selectedModelId: string | undefined,
  defaultModelId: string | undefined,
  providerId: string | undefined,
  providers: Record<string, ProviderConfig>,
  models: ModelConfig[],
): string | undefined {
  const options = getModelOptions(providerId, providers, models);
  if (selectedModelId && options.some((model) => model.id === selectedModelId)) return selectedModelId;
  if (defaultModelId && options.some((model) => model.id === defaultModelId)) return defaultModelId;
  return options[0]?.id;
}

export function resolveRuntimeId(
  selectedRuntimeId: string | undefined,
  defaultRuntimeId: string | undefined,
  runtimes: AgentRuntime[],
): string | undefined {
  if (selectedRuntimeId && runtimes.some((runtime) => runtime.id === selectedRuntimeId)) return selectedRuntimeId;
  if (defaultRuntimeId && runtimes.some((runtime) => runtime.id === defaultRuntimeId)) return defaultRuntimeId;
  return runtimes.find((runtime) => runtime.isDefault)?.id ?? runtimes[0]?.id;
}
