/**
 * @deprecated Este store não está sendo usado por nenhum módulo da aplicação.
 * O store autoritativo é `src/stores/config.ts` (exporta `useConfig`).
 * Este arquivo pode ser removido com segurança após confirmação.
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface AppConfig {
  apiKeys: {
    openai: string;
    anthropic: string;
    gemini: string;
    groq: string;
    openrouter: string;
    stability: string;
    elevenlabs: string;
    replicate: string;
  };
  defaultModels: {
    chat: string;
    codeStudio: string;
    agents: string;
    imageGen: string;
    audioGen: string;
  };
  preferences: {
    theme: "dark" | "light" | "system";
    language: "pt-BR" | "en" | "es";
    fontSize: number;
    sidebarCollapsed: boolean;
    soundEnabled: boolean;
    streamingEnabled: boolean;
    autoSave: boolean;
  };
  codeStudio: {
    editorTheme: string;
    fontSize: number;
    tabSize: number;
    wordWrap: boolean;
    minimap: boolean;
    autoFormat: boolean;
    defaultFramework: string;
  };
  agents: {
    maxConcurrentAgents: number;
    defaultTimeout: number;
    autoRetry: boolean;
    retryAttempts: number;
  };
  usage: {
    tokensUsed: number;
    tokensLimit: number;
    requestsToday: number;
    resetDate: string;
  };
}

interface ConfigStoreState {
  config: AppConfig;
  updateConfig: (patch: Partial<AppConfig>) => void;
  updateApiKey: (provider: keyof AppConfig["apiKeys"], key: string) => void;
  exportConfig: () => string;
  importConfig: (json: string) => boolean;
  resetConfig: () => void;
}

export const DEFAULT_APP_CONFIG: AppConfig = {
  apiKeys: {
    openai: "",
    anthropic: "",
    gemini: "",
    groq: "",
    openrouter: "",
    stability: "",
    elevenlabs: "",
    replicate: "",
  },
  defaultModels: {
    chat: "gpt-4o",
    codeStudio: "claude-3-5-sonnet-latest",
    agents: "gpt-4o",
    imageGen: "dall-e-3",
    audioGen: "eleven_multilingual_v2",
  },
  preferences: {
    theme: "light",
    language: "pt-BR",
    fontSize: 14,
    sidebarCollapsed: false,
    soundEnabled: false,
    streamingEnabled: true,
    autoSave: true,
  },
  codeStudio: {
    editorTheme: "vs-dark",
    fontSize: 14,
    tabSize: 2,
    wordWrap: true,
    minimap: true,
    autoFormat: true,
    defaultFramework: "react-vite",
  },
  agents: {
    maxConcurrentAgents: 3,
    defaultTimeout: 120_000,
    autoRetry: true,
    retryAttempts: 2,
  },
  usage: {
    tokensUsed: 0,
    tokensLimit: 1_000_000,
    requestsToday: 0,
    resetDate: new Date().toISOString().slice(0, 10),
  },
};

function encode(value: string): string {
  if (!value) return "";
  try {
    return btoa(unescape(encodeURIComponent(value)));
  } catch {
    return value;
  }
}

function decode(value: string): string {
  if (!value) return "";
  try {
    return decodeURIComponent(escape(atob(value)));
  } catch {
    return value;
  }
}

function mergeConfig(base: AppConfig, patch: Partial<AppConfig>): AppConfig {
  return {
    ...base,
    ...patch,
    apiKeys: { ...base.apiKeys, ...patch.apiKeys },
    defaultModels: { ...base.defaultModels, ...patch.defaultModels },
    preferences: { ...base.preferences, ...patch.preferences },
    codeStudio: { ...base.codeStudio, ...patch.codeStudio },
    agents: { ...base.agents, ...patch.agents },
    usage: { ...base.usage, ...patch.usage },
  };
}

export const useAppConfig = create<ConfigStoreState>()(
  persist(
    (set, get) => ({
      config: DEFAULT_APP_CONFIG,
      updateConfig: (patch) =>
        set((state) => ({ config: mergeConfig(state.config, patch) })),
      updateApiKey: (provider, key) =>
        set((state) => ({
          config: {
            ...state.config,
            apiKeys: { ...state.config.apiKeys, [provider]: key },
          },
        })),
      exportConfig: () => JSON.stringify(get().config, null, 2),
      importConfig: (json) => {
        try {
          const parsed = JSON.parse(json) as Partial<AppConfig>;
          set({ config: mergeConfig(DEFAULT_APP_CONFIG, parsed) });
          return true;
        } catch {
          return false;
        }
      },
      resetConfig: () => set({ config: DEFAULT_APP_CONFIG }),
    }),
    {
      name: "perfectagent:app-config",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        config: {
          ...state.config,
          apiKeys: Object.fromEntries(
            Object.entries(state.config.apiKeys).map(([provider, key]) => [
              provider,
              encode(key),
            ]),
          ) as AppConfig["apiKeys"],
        },
      }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<ConfigStoreState> | undefined;
        const savedConfig = saved?.config;
        if (!savedConfig) return current;
        return {
          ...current,
          config: mergeConfig(DEFAULT_APP_CONFIG, {
            ...savedConfig,
            apiKeys: Object.fromEntries(
              Object.entries(savedConfig.apiKeys ?? {}).map(
                ([provider, key]) => [provider, decode(String(key))],
              ),
            ) as AppConfig["apiKeys"],
          }),
        };
      },
    },
  ),
);
