import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  ProviderConfig,
  ModelConfig,
  AgentRuntime,
  RuntimeCapabilities,
  RuntimeKind,
  StudioProject,
  DeployRecord,
  ChatMessageV2,
  Skill,
  Tool,
  Integration,
  McpServer,
} from "@/types";
import {
  APP_STORAGE_VERSION,
  obfuscate,
  deobfuscate,
  storage,
} from "@/services/storage";
import { PROVIDER_PRESETS, presetById } from "@/services/providers";

export interface AppSettings {
  appName: string;
  language: "pt-BR" | "en-US";
  theme: "light" | "dark" | "system";
  compactMode: boolean;
  defaultProjectDir: string;
  autoSave: boolean;
  autoSaveInterval: number; // seconds
  telemetry: boolean;
  primaryColor: string;
  fontSize: "small" | "medium" | "large";
  editorTheme: string;
  sidebarPosition: "left" | "right";
  defaultProviderId?: string;
  defaultModelId?: string;
  defaultRuntimeId?: string;
  masterKey: string;
  corsOrigins: string[];
  rateLimitPerMinute: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  appName: "PerfectAgent",
  language: "pt-BR",
  theme: "light",
  compactMode: false,
  defaultProjectDir: "~/PerfectAgent/projects",
  autoSave: true,
  autoSaveInterval: 15,
  telemetry: false,
  primaryColor: "#17172d",
  fontSize: "medium",
  editorTheme: "vs-dark",
  sidebarPosition: "left",
  masterKey: "pa-local-dev-key",
  corsOrigins: ["http://localhost:5173"],
  rateLimitPerMinute: 60,
};

export interface ChatThread {
  id: string;
  title: string;
  providerId?: string;
  model?: string;
  runtimeId?: string;
  skillIds: string[];
  messages: ChatMessageV2[];
  createdAt: number;
  updatedAt?: number;
}

interface SelectionState {
  providerId?: string;
  model?: string;
  runtimeId?: string;
  skillIds: string[];
  agentMode?: boolean;
}

interface ConfigState {
  settings: AppSettings;
  providers: Record<string, ProviderConfig>;
  models: ModelConfig[];
  runtimes: AgentRuntime[];
  projects: StudioProject[];
  activeProjectId?: string;
  chatThreads: ChatThread[];
  activeChatThreadId?: string;
  studioThreads: ChatThread[];
  activeStudioThreadId?: string;
  deploys: DeployRecord[];
  skills: Skill[];
  tools: Tool[];
  integrations: Integration[];
  mcpServers: McpServer[];
  // selectors used by the studio chat (persist last choice)
  chatSelection: SelectionState;
  studioSelection: SelectionState;
  // actions
  setSettings: (patch: Partial<AppSettings>) => void;
  resetSettings: () => void;
  upsertProvider: (cfg: ProviderConfig) => void;
  removeProvider: (id: string) => void;
  setProviderEnabled: (id: string, enabled: boolean) => void;
  setProviderTest: (id: string, result: ProviderConfig["lastTest"]) => void;
  setProviderModels: (
    id: string,
    models: Array<{ id: string; name?: string }>,
  ) => void;
  upsertModel: (model: ModelConfig) => void;
  removeModel: (id: string, providerId?: string) => void;
  setModelEnabled: (providerId: string, id: string, enabled: boolean) => void;
  upsertRuntime: (rt: AgentRuntime) => void;
  removeRuntime: (id: string) => void;
  setDefaultRuntime: (id: string) => void;
  setRuntimeTest: (
    id: string,
    result: AgentRuntime["lastTest"],
    status?: AgentRuntime["status"],
  ) => void;
  upsertProject: (p: StudioProject) => void;
  removeProject: (id: string) => void;
  setActiveProject: (id: string | undefined) => void;
  updateProjectFile: (projectId: string, path: string, content: string) => void;
  addProjectFile: (projectId: string, path: string, content?: string) => void;
  deleteProjectFile: (projectId: string, path: string) => void;
  renameProjectFile: (
    projectId: string,
    oldPath: string,
    newPath: string,
  ) => void;
  setActiveFile: (projectId: string, path: string) => void;
  addChatThread: (t: ChatThread) => void;
  setActiveChatThread: (id: string) => void;
  renameChatThread: (threadId: string, title: string) => void;
  deleteChatThread: (threadId: string) => void;
  appendChatMessage: (threadId: string, msg: ChatMessageV2) => void;
  patchChatMessage: (
    threadId: string,
    msgId: string,
    patch: Partial<ChatMessageV2>,
  ) => void;
  clearChatThread: (threadId: string) => void;
  setChatSelection: (patch: Partial<SelectionState>) => void;
  addStudioThread: (t: ChatThread) => void;
  setActiveStudioThread: (id: string) => void;
  appendStudioMessage: (threadId: string, msg: ChatMessageV2) => void;
  patchStudioMessage: (
    threadId: string,
    msgId: string,
    patch: Partial<ChatMessageV2>,
  ) => void;
  clearStudioThread: (threadId: string) => void;
  setStudioSelection: (patch: Partial<SelectionState>) => void;
  addDeploy: (d: DeployRecord) => void;
  upsertSkill: (s: Skill) => void;
  removeSkill: (id: string) => void;
  toggleSkill: (id: string) => void;
  upsertTool: (t: Tool) => void;
  removeTool: (id: string) => void;
  toggleTool: (id: string) => void;
  upsertIntegration: (i: Integration) => void;
  removeIntegration: (id: string) => void;
  setIntegrationTest: (id: string, result: Integration["lastTest"]) => void;
  upsertMcpServer: (m: McpServer) => void;
  removeMcpServer: (id: string) => void;
  setMcpServerTools: (id: string, tools: McpServer["tools"]) => void;
  setMcpServerTest: (id: string, result: McpServer["lastTest"]) => void;
  exportConfig: () => string;
  importConfig: (json: string) => boolean;
}

function providerFromPreset(
  preset: (typeof PROVIDER_PRESETS)[number],
  existing?: Partial<ProviderConfig>,
): ProviderConfig {
  const id = existing?.id ?? preset.id;
  const spec = {
    shape: preset.shape,
    baseUrl: existing?.spec?.baseUrl ?? existing?.baseUrl ?? preset.baseUrl,
    authMode: existing?.spec?.authMode ?? preset.authMode,
    authHeaderName: existing?.spec?.authHeaderName ?? preset.authHeaderName,
    extraHeaders: existing?.spec?.extraHeaders ?? preset.extraHeaders,
    apiKey: existing?.spec?.apiKey ?? existing?.apiKey,
    pathOverrides: existing?.spec?.pathOverrides ?? preset.pathOverrides,
  };
  const configured = Boolean(
    existing?.configured ?? (spec.authMode === "none" || spec.apiKey),
  );
  return {
    id,
    presetId: existing?.presetId ?? preset.id,
    name: existing?.name ?? preset.name,
    baseUrl: spec.baseUrl,
    apiKey: spec.apiKey,
    enabled: existing?.enabled ?? configured,
    supportsModelsFetch:
      existing?.supportsModelsFetch ?? preset.shape !== "custom",
    supportsVision: existing?.supportsVision ?? false,
    spec,
    defaultModel: existing?.defaultModel ?? preset.presetModels?.[0],
    fetchedModels: existing?.fetchedModels,
    configured,
    lastTest: existing?.lastTest,
  };
}

function seedProviders(
  existing: Record<string, ProviderConfig> = {},
): Record<string, ProviderConfig> {
  const seeded: Record<string, ProviderConfig> = {};
  for (const preset of PROVIDER_PRESETS)
    seeded[preset.id] = providerFromPreset(preset, existing[preset.id]);
  for (const [id, cfg] of Object.entries(existing)) {
    if (!seeded[id])
      seeded[id] = providerFromPreset(
        presetById(cfg.presetId) ??
          PROVIDER_PRESETS[PROVIDER_PRESETS.length - 1],
        { ...cfg, id },
      );
  }
  return seeded;
}

function modelKey(providerId: string, modelId: string): string {
  return `${providerId}:${modelId}`;
}

function modelsFromProviders(
  providers: Record<string, ProviderConfig>,
  existing: ModelConfig[] = [],
): ModelConfig[] {
  const byKey = new Map(existing.map((m) => [modelKey(m.providerId, m.id), m]));
  const next = new Map<string, ModelConfig>();
  for (const provider of Object.values(providers)) {
    const preset = presetById(provider.presetId);
    const ids = [
      provider.defaultModel,
      ...(provider.fetchedModels?.map((m) => m.id) ?? []),
      ...(preset?.presetModels ?? []),
    ].filter(Boolean) as string[];
    for (const id of Array.from(new Set(ids))) {
      const key = modelKey(provider.id, id);
      const existingModel = byKey.get(key);
      const fetchedName = provider.fetchedModels?.find(
        (m) => m.id === id,
      )?.name;
      next.set(key, {
        id,
        providerId: provider.id,
        name: existingModel?.name ?? fetchedName ?? id,
        label: existingModel?.label ?? fetchedName ?? id,
        enabled: existingModel?.enabled ?? true,
        contextWindow: existingModel?.contextWindow,
      });
    }
  }
  for (const model of existing) {
    const key = modelKey(model.providerId, model.id);
    if (!next.has(key)) next.set(key, model);
  }
  return Array.from(next.values()).sort(
    (a, b) =>
      a.providerId.localeCompare(b.providerId) ||
      a.label.localeCompare(b.label),
  );
}

function seedRuntime(): AgentRuntime {
  return {
    id: "rt-default",
    name: "LangGraph Default",
    description:
      "Plan → Act → Verify pipeline using your default LLM provider.",
    kind: "langgraph-dag",
    capabilities: defaultCapabilitiesFor("langgraph-dag"),
    nodes: [
      {
        id: "plan",
        type: "llm",
        label: "Planner",
        prompt:
          "Plan the steps required to answer:\n\n{{question}}\n\nRespond with a numbered plan.",
      },
      {
        id: "act",
        type: "llm",
        label: "Executor",
        prompt:
          "Given the plan:\n{{plan}}\n\nAnswer the user's request: {{question}}",
      },
      {
        id: "verify",
        type: "transform",
        label: "Verifier",
        transformCode:
          "return { ok: true, summary: (state.output.act || '').toString().slice(0, 200) };",
      },
    ],
    edges: [
      { id: "e1", from: "plan", to: "act" },
      { id: "e2", from: "act", to: "verify" },
    ],
    entry: "plan",
    exits: ["verify"],
    memory: true,
    isDefault: true,
    status: "ready",
  };
}

function seedOmegaRuntime(): AgentRuntime {
  return {
    id: "rt-omega",
    name: "OmegaCognitionEngine v1.0",
    description:
      "8-layer cognitive runtime: Global Workspace + Active Inference + Metacognitive Monitor + Strange Loop + Recurrent Depth.",
    kind: "omega-cognition",
    capabilities: defaultCapabilitiesFor("omega-cognition"),
    nodes: [],
    edges: [],
    entry: "omega",
    exits: ["omega"],
    memory: true,
    status: "ready",
  };
}

function seedMorpheusRuntime(): AgentRuntime {
  return {
    id: "rt-morpheus",
    name: "Morpheus Runtime · Pantheon",
    description:
      "12-agent auctioneer (ARCHITECT, CODE_SMITH, REASONER, CRITIC, REFACTORER, TEST_ENGINEER, SECURITY_AUDITOR, UX_DESIGNER, DATA_ANALYST, DEVOPS, DEBUGGER, RESEARCHER). Each prompt is auctioned; the winning agent's soulPrompt enriches the system context.",
    kind: "morpheus-pantheon",
    capabilities: defaultCapabilitiesFor("morpheus-pantheon"),
    nodes: [],
    edges: [],
    entry: "pantheon",
    exits: ["pantheon"],
    memory: true,
    status: "ready",
  };
}

function seedStigmergyRuntime(): AgentRuntime {
  return {
    id: "rt-stigmergy",
    name: "Stigmergy Vectorial Nexus",
    description:
      "Reactive runtime: a vectorial state space (VSS) where agents subscribe to triggers and communicate by mutating shared state. Two-stage cascade per prompt: Processor (raw→unverified) → Reviewer (unverified→verified) → main generation.",
    kind: "stigmergy-nexus",
    capabilities: defaultCapabilitiesFor("stigmergy-nexus"),
    nodes: [],
    edges: [],
    entry: "vss",
    exits: ["vss"],
    memory: true,
    status: "ready",
  };
}

function seedEphemeralRuntime(): AgentRuntime {
  return {
    id: "rt-ephemeral",
    name: "Ephemeral Genesis Engine",
    description:
      "Just-in-time agent compilation. Decomposes the task into atomic micro-tasks, synthesizes a bespoke specialist soul prompt for the dominant micro-task, then forges and runs an ephemeral specialist that vanishes after returning the result.",
    kind: "ephemeral-genesis",
    capabilities: defaultCapabilitiesFor("ephemeral-genesis"),
    nodes: [],
    edges: [],
    entry: "ege",
    exits: ["ege"],
    memory: false,
    status: "ready",
  };
}

function seedSupremeCoordinatorRuntime(): AgentRuntime {
  return {
    id: "rt-supreme",
    name: "Supreme Coordinator · Swarm",
    description:
      "Hierarchical swarm: Strategic Layer (Task Router · Load Balancer · Quality Monitor · System Health) + 15 Domain Supervisors organized by latency tier (HOT/WARM/COLD) + Infrastructure (Redis Streams, Redis+SQLite, Qdrant, Prometheus). Built-in financial agents: Jito Sniper, Whale Copycat, Funding Harvester, Rug Predictor. Add new TypeScript agents from the panel.",
    kind: "supreme-coordinator",
    capabilities: defaultCapabilitiesFor("supreme-coordinator"),
    nodes: [],
    edges: [],
    entry: "coordinator",
    exits: ["coordinator"],
    memory: true,
    status: "ready",
  };
}

function buildSpecFromConfig(cfg: ProviderConfig): ProviderConfig["spec"] {
  return {
    ...cfg.spec,
    apiKey: cfg.spec.apiKey ? deobfuscate(cfg.spec.apiKey) : undefined,
  };
}

function seedSkills(): Skill[] {
  return [
    {
      id: "sk-coder",
      name: "Coder",
      description: "Write production-grade code with explanations.",
      systemPrompt:
        "You are a senior software engineer. Always provide working, well-tested code with brief explanations.",
      tags: ["code", "engineering"],
      enabled: true,
      builtIn: true,
    },
    {
      id: "sk-architect",
      name: "Architect",
      description: "Design systems, APIs and data models.",
      systemPrompt:
        "You are a software architect. Discuss tradeoffs, propose diagrams (mermaid), and produce concise technical specs.",
      tags: ["architecture"],
      enabled: true,
      builtIn: true,
    },
    {
      id: "sk-reviewer",
      name: "Reviewer",
      description: "Critique code and find bugs.",
      systemPrompt:
        "You are a strict code reviewer. Find bugs, security issues, and suggest improvements.",
      tags: ["code", "review"],
      enabled: false,
      builtIn: true,
    },
    {
      id: "sk-product",
      name: "Product Manager",
      description: "Translate requirements into specs.",
      systemPrompt:
        "You are a product manager. Clarify the user's goal, list requirements, and propose a phased plan.",
      tags: ["product"],
      enabled: false,
      builtIn: true,
    },
    {
      id: "sk-data",
      name: "Data Analyst",
      description: "Analyze data and write SQL.",
      systemPrompt:
        "You are a data analyst. Generate SQL, explain queries, and propose visualizations.",
      tags: ["data", "sql"],
      enabled: false,
      builtIn: true,
    },
  ];
}

function seedTools(): Tool[] {
  return [
    {
      id: "tl-http",
      name: "HTTP Request",
      description: "Make an HTTP request to any URL.",
      kind: "http",
      enabled: true,
      builtIn: true,
      params: [
        {
          key: "url",
          type: "string",
          required: true,
          description: "Target URL",
        },
        {
          key: "method",
          type: "string",
          default: "GET",
          description: "HTTP method",
        },
        {
          key: "headers",
          type: "json",
          default: "{}",
          description: "Headers JSON",
        },
        { key: "body", type: "string", description: "Request body" },
      ],
    },
    {
      id: "tl-json",
      name: "JSON Transform",
      description: "Run a JS expression on a JSON input.",
      kind: "json",
      enabled: true,
      builtIn: true,
      params: [
        {
          key: "input",
          type: "json",
          required: true,
          description: "Input JSON",
        },
        {
          key: "expression",
          type: "string",
          required: true,
          default: "input",
          description: "JS expression with variable `input`",
        },
      ],
    },
    {
      id: "tl-search",
      name: "Web Search",
      description: "Search the web (DuckDuckGo HTML).",
      kind: "websearch",
      enabled: true,
      builtIn: true,
      params: [{ key: "query", type: "string", required: true }],
    },
    {
      id: "tl-calc",
      name: "Calculator",
      description: "Evaluate a math expression.",
      kind: "calculator",
      enabled: true,
      builtIn: true,
      params: [
        { key: "expression", type: "string", required: true, default: "1 + 1" },
      ],
    },
    {
      id: "tl-fs",
      name: "Filesystem",
      description: "Read or write a file in the workspace.",
      kind: "fs",
      enabled: false,
      builtIn: true,
      params: [
        { key: "path", type: "string", required: true },
        {
          key: "action",
          type: "string",
          default: "read",
          description: "read | write",
        },
        { key: "content", type: "string" },
      ],
    },
  ];
}

function seedIntegrations(): Integration[] {
  return [
    {
      id: "in-webhook",
      name: "Generic Webhook",
      kind: "webhook",
      method: "POST",
      connected: false,
      headers: { "content-type": "application/json" },
    },
  ];
}

export const useConfig = create<ConfigState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      providers: seedProviders(),
      models: modelsFromProviders(seedProviders()),
      runtimes: [
        seedRuntime(),
        seedOmegaRuntime(),
        seedMorpheusRuntime(),
        seedStigmergyRuntime(),
        seedEphemeralRuntime(),
        seedSupremeCoordinatorRuntime(),
      ],
      projects: [],
      activeProjectId: undefined,
      chatThreads: [],
      activeChatThreadId: undefined,
      studioThreads: [],
      activeStudioThreadId: undefined,
      deploys: [],
      skills: seedSkills(),
      tools: seedTools(),
      integrations: seedIntegrations(),
      mcpServers: [],
      chatSelection: { skillIds: [] },
      studioSelection: { skillIds: [], agentMode: false },

      setSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),
      resetSettings: () => set({ settings: DEFAULT_SETTINGS }),

      upsertProvider: (cfg) => {
        // obfuscate apiKey at rest
        set((s) => {
          const existing = s.providers[cfg.id];
          const apiKey = cfg.spec.apiKey ?? cfg.apiKey;
          const storedKey = apiKey
            ? apiKey === existing?.spec.apiKey || apiKey === existing?.apiKey
              ? apiKey
              : obfuscate(apiKey)
            : undefined;
          const stored: ProviderConfig = {
            ...cfg,
            baseUrl: cfg.baseUrl ?? cfg.spec.baseUrl,
            enabled: cfg.enabled ?? cfg.configured,
            configured: Boolean(
              cfg.configured || cfg.spec.authMode === "none" || apiKey,
            ),
            apiKey: storedKey,
            spec: {
              ...cfg.spec,
              baseUrl: cfg.baseUrl ?? cfg.spec.baseUrl,
              apiKey: storedKey,
            },
          };
          const providers = { ...s.providers, [stored.id]: stored };
          return {
            providers,
            models: modelsFromProviders(providers, s.models),
          };
        });
      },
      removeProvider: (id) =>
        set((s) => {
          const { [id]: _drop, ...rest } = s.providers;
          return {
            providers: rest,
            models: s.models.filter((m) => m.providerId !== id),
            settings: {
              ...s.settings,
              defaultProviderId:
                s.settings.defaultProviderId === id
                  ? undefined
                  : s.settings.defaultProviderId,
              defaultModelId: s.models.some(
                (m) =>
                  m.providerId === id && m.id === s.settings.defaultModelId,
              )
                ? undefined
                : s.settings.defaultModelId,
            },
          };
        }),
      setProviderEnabled: (id, enabled) =>
        set((s) => {
          const cur = s.providers[id];
          if (!cur) return {};
          return { providers: { ...s.providers, [id]: { ...cur, enabled } } };
        }),
      setProviderTest: (id, lastTest) =>
        set((s) => {
          const cur = s.providers[id];
          if (!cur) return {};
          return { providers: { ...s.providers, [id]: { ...cur, lastTest } } };
        }),
      setProviderModels: (id, models) =>
        set((s) => {
          const cur = s.providers[id];
          if (!cur) return {};
          const providers = {
            ...s.providers,
            [id]: { ...cur, fetchedModels: models },
          };
          return {
            providers,
            models: modelsFromProviders(providers, s.models),
          };
        }),
      upsertModel: (model) =>
        set((s) => {
          const idx = s.models.findIndex(
            (m) => m.providerId === model.providerId && m.id === model.id,
          );
          const next = [...s.models];
          if (idx >= 0) next[idx] = model;
          else next.push(model);
          return { models: next };
        }),
      removeModel: (id, providerId) =>
        set((s) => ({
          models: s.models.filter(
            (m) =>
              !(m.id === id && (!providerId || m.providerId === providerId)),
          ),
          settings: {
            ...s.settings,
            defaultModelId:
              s.settings.defaultModelId === id
                ? undefined
                : s.settings.defaultModelId,
          },
        })),
      setModelEnabled: (providerId, id, enabled) =>
        set((s) => ({
          models: s.models.map((m) =>
            m.providerId === providerId && m.id === id ? { ...m, enabled } : m,
          ),
        })),

      upsertRuntime: (rt) =>
        set((s) => {
          const existing = s.runtimes.find((r) => r.id === rt.id);
          const stored: AgentRuntime = {
            ...rt,
            kind: rt.kind ?? "langgraph-dag",
            capabilities:
              rt.capabilities ??
              defaultCapabilitiesFor(rt.kind ?? "langgraph-dag"),
            apiKey: rt.apiKey
              ? rt.apiKey === existing?.apiKey
                ? rt.apiKey
                : obfuscate(rt.apiKey)
              : undefined,
          };
          const idx = s.runtimes.findIndex((r) => r.id === stored.id);
          const next = [...s.runtimes];
          if (idx >= 0) next[idx] = stored;
          else next.unshift(stored);
          return {
            runtimes: next,
            settings: stored.isDefault
              ? { ...s.settings, defaultRuntimeId: stored.id }
              : s.settings,
          };
        }),
      removeRuntime: (id) =>
        set((s) => ({
          runtimes: s.runtimes.filter((r) => r.id !== id),
          settings: {
            ...s.settings,
            defaultRuntimeId:
              s.settings.defaultRuntimeId === id
                ? undefined
                : s.settings.defaultRuntimeId,
          },
          chatSelection: {
            ...s.chatSelection,
            runtimeId:
              s.chatSelection.runtimeId === id
                ? undefined
                : s.chatSelection.runtimeId,
          },
          studioSelection: {
            ...s.studioSelection,
            runtimeId:
              s.studioSelection.runtimeId === id
                ? undefined
                : s.studioSelection.runtimeId,
          },
        })),
      setDefaultRuntime: (id) =>
        set((s) => ({
          runtimes: s.runtimes.map((r) => ({ ...r, isDefault: r.id === id })),
          settings: { ...s.settings, defaultRuntimeId: id },
        })),
      setRuntimeTest: (id, lastTest, status) =>
        set((s) => ({
          runtimes: s.runtimes.map((r) =>
            r.id === id
              ? {
                  ...r,
                  lastTest,
                  status:
                    status ?? (lastTest?.ok ? "connected" : "disconnected"),
                }
              : r,
          ),
        })),

      upsertProject: (p) =>
        set((s) => {
          const idx = s.projects.findIndex((x) => x.id === p.id);
          const next = [...s.projects];
          if (idx >= 0) next[idx] = p;
          else next.unshift(p);
          return { projects: next, activeProjectId: p.id };
        }),
      removeProject: (id) =>
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          activeProjectId:
            s.activeProjectId === id ? undefined : s.activeProjectId,
        })),
      setActiveProject: (id) => set({ activeProjectId: id }),
      updateProjectFile: (projectId, path, content) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id !== projectId
              ? p
              : {
                  ...p,
                  updatedAt: Date.now(),
                  files: p.files.map((f) =>
                    f.path === path ? { ...f, content } : f,
                  ),
                },
          ),
        })),
      addProjectFile: (projectId, path, content = "") =>
        set((s) => ({
          projects: s.projects.map((p) => {
            if (p.id !== projectId) return p;
            if (p.files.some((f) => f.path === path)) return p;
            return {
              ...p,
              updatedAt: Date.now(),
              files: [...p.files, { path, content }],
              activeFile: path,
            };
          }),
        })),
      deleteProjectFile: (projectId, path) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id !== projectId
              ? p
              : {
                  ...p,
                  updatedAt: Date.now(),
                  files: p.files.filter((f) => f.path !== path),
                  activeFile:
                    p.activeFile === path
                      ? p.files.find((f) => f.path !== path)?.path
                      : p.activeFile,
                },
          ),
        })),
      renameProjectFile: (projectId, oldPath, newPath) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id !== projectId
              ? p
              : {
                  ...p,
                  updatedAt: Date.now(),
                  files: p.files.map((f) =>
                    f.path === oldPath ? { ...f, path: newPath } : f,
                  ),
                  activeFile: p.activeFile === oldPath ? newPath : p.activeFile,
                },
          ),
        })),
      setActiveFile: (projectId, path) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id !== projectId ? p : { ...p, activeFile: path },
          ),
        })),

      addChatThread: (t) =>
        set((s) => ({
          chatThreads: [
            { ...t, updatedAt: t.updatedAt ?? Date.now() },
            ...s.chatThreads,
          ],
          activeChatThreadId: t.id,
        })),
      setActiveChatThread: (id) => set({ activeChatThreadId: id }),
      renameChatThread: (threadId, title) =>
        set((s) => ({
          chatThreads: s.chatThreads.map((t) =>
            t.id === threadId
              ? { ...t, title: title.trim() || t.title, updatedAt: Date.now() }
              : t,
          ),
        })),
      deleteChatThread: (threadId) =>
        set((s) => {
          const nextThreads = s.chatThreads.filter((t) => t.id !== threadId);
          const activeChatThreadId =
            s.activeChatThreadId === threadId
              ? nextThreads[0]?.id
              : s.activeChatThreadId;
          return { chatThreads: nextThreads, activeChatThreadId };
        }),
      appendChatMessage: (threadId, msg) =>
        set((s) => ({
          chatThreads: s.chatThreads.map((t) =>
            t.id !== threadId
              ? t
              : {
                  ...t,
                  updatedAt: Date.now(),
                  title:
                    t.messages.length === 0 && msg.role === "user"
                      ? msg.content.slice(0, 48)
                      : t.title,
                  messages: [...t.messages, msg],
                },
          ),
        })),
      patchChatMessage: (threadId, msgId, patch) =>
        set((s) => ({
          chatThreads: s.chatThreads.map((t) =>
            t.id !== threadId
              ? t
              : {
                  ...t,
                  updatedAt: Date.now(),
                  messages: t.messages.map((m) =>
                    m.id === msgId ? { ...m, ...patch } : m,
                  ),
                },
          ),
        })),
      clearChatThread: (threadId) =>
        set((s) => ({
          chatThreads: s.chatThreads.map((t) =>
            t.id === threadId
              ? { ...t, updatedAt: Date.now(), messages: [] }
              : t,
          ),
        })),
      setChatSelection: (patch) =>
        set((s) => ({ chatSelection: { ...s.chatSelection, ...patch } })),

      addStudioThread: (t) =>
        set((s) => ({
          studioThreads: [
            { ...t, updatedAt: t.updatedAt ?? Date.now() },
            ...s.studioThreads,
          ],
          activeStudioThreadId: t.id,
        })),
      setActiveStudioThread: (id) => set({ activeStudioThreadId: id }),
      appendStudioMessage: (threadId, msg) =>
        set((s) => ({
          studioThreads: s.studioThreads.map((t) =>
            t.id !== threadId ? t : { ...t, messages: [...t.messages, msg] },
          ),
        })),
      patchStudioMessage: (threadId, msgId, patch) =>
        set((s) => ({
          studioThreads: s.studioThreads.map((t) =>
            t.id !== threadId
              ? t
              : {
                  ...t,
                  messages: t.messages.map((m) =>
                    m.id === msgId ? { ...m, ...patch } : m,
                  ),
                },
          ),
        })),
      clearStudioThread: (threadId) =>
        set((s) => ({
          studioThreads: s.studioThreads.map((t) =>
            t.id === threadId ? { ...t, messages: [] } : t,
          ),
        })),
      setStudioSelection: (patch) =>
        set((s) => ({ studioSelection: { ...s.studioSelection, ...patch } })),
      addDeploy: (d) =>
        set((s) => ({ deploys: [d, ...s.deploys].slice(0, 50) })),

      upsertSkill: (sk) =>
        set((s) => {
          const idx = s.skills.findIndex((x) => x.id === sk.id);
          const next = [...s.skills];
          if (idx >= 0) next[idx] = sk;
          else next.unshift(sk);
          return { skills: next };
        }),
      removeSkill: (id) =>
        set((s) => ({ skills: s.skills.filter((x) => x.id !== id) })),
      toggleSkill: (id) =>
        set((s) => ({
          skills: s.skills.map((x) =>
            x.id === id ? { ...x, enabled: !x.enabled } : x,
          ),
        })),
      upsertTool: (t) =>
        set((s) => {
          const idx = s.tools.findIndex((x) => x.id === t.id);
          const next = [...s.tools];
          if (idx >= 0) next[idx] = t;
          else next.unshift(t);
          return { tools: next };
        }),
      removeTool: (id) =>
        set((s) => ({ tools: s.tools.filter((x) => x.id !== id) })),
      toggleTool: (id) =>
        set((s) => ({
          tools: s.tools.map((x) =>
            x.id === id ? { ...x, enabled: !x.enabled } : x,
          ),
        })),
      upsertIntegration: (i) =>
        set((s) => {
          const stored: Integration = {
            ...i,
            secrets: i.secrets
              ? Object.fromEntries(
                  Object.entries(i.secrets).map(([k, v]) => [
                    k,
                    v ? obfuscate(v) : "",
                  ]),
                )
              : undefined,
          };
          const idx = s.integrations.findIndex((x) => x.id === stored.id);
          const next = [...s.integrations];
          if (idx >= 0) next[idx] = stored;
          else next.unshift(stored);
          return { integrations: next };
        }),
      removeIntegration: (id) =>
        set((s) => ({
          integrations: s.integrations.filter((x) => x.id !== id),
        })),
      setIntegrationTest: (id, lastTest) =>
        set((s) => ({
          integrations: s.integrations.map((x) =>
            x.id === id
              ? { ...x, lastTest, connected: Boolean(lastTest?.ok) }
              : x,
          ),
        })),
      upsertMcpServer: (m) =>
        set((s) => {
          const stored: McpServer = {
            ...m,
            apiKey: m.apiKey ? obfuscate(m.apiKey) : undefined,
          };
          const idx = s.mcpServers.findIndex((x) => x.id === stored.id);
          const next = [...s.mcpServers];
          if (idx >= 0) next[idx] = stored;
          else next.unshift(stored);
          return { mcpServers: next };
        }),
      removeMcpServer: (id) =>
        set((s) => ({ mcpServers: s.mcpServers.filter((x) => x.id !== id) })),
      setMcpServerTools: (id, tools) =>
        set((s) => ({
          mcpServers: s.mcpServers.map((x) =>
            x.id === id ? { ...x, tools } : x,
          ),
        })),
      setMcpServerTest: (id, lastTest) =>
        set((s) => ({
          mcpServers: s.mcpServers.map((x) =>
            x.id === id ? { ...x, lastTest } : x,
          ),
        })),

      exportConfig: () => JSON.stringify(get(), null, 2),
      importConfig: (json) => {
        try {
          const parsed = JSON.parse(json);
          // shallow validation: must be object with `settings`
          if (!parsed || typeof parsed !== "object" || !("settings" in parsed))
            return false;
          set(parsed);
          return true;
        } catch {
          return false;
        }
      },
    }),
    {
      name: "config",
      storage: createJSONStorage(() => storage),
      version: APP_STORAGE_VERSION,
      migrate: (persisted, _version) => {
        const state = (persisted ?? {}) as Partial<ConfigState>;
        const providers = seedProviders(state.providers ?? {});
        const settings = {
          ...DEFAULT_SETTINGS,
          ...(state.settings ?? {}),
          defaultProviderId: state.settings?.defaultProviderId,
          defaultModelId: state.settings?.defaultModelId,
          defaultRuntimeId: state.settings?.defaultRuntimeId,
          masterKey:
            state.settings?.masterKey ??
            storage.get("masterKey", DEFAULT_SETTINGS.masterKey),
          corsOrigins:
            state.settings?.corsOrigins ??
            storage.get("origins", DEFAULT_SETTINGS.corsOrigins),
          rateLimitPerMinute:
            state.settings?.rateLimitPerMinute ??
            DEFAULT_SETTINGS.rateLimitPerMinute,
        };
        return {
          ...state,
          settings,
          providers,
          models: modelsFromProviders(providers, state.models ?? []),
          chatThreads: state.chatThreads ?? [],
          chatSelection: state.chatSelection ?? { skillIds: [] },
          studioSelection: { skillIds: [], ...(state.studioSelection ?? {}) },
        } satisfies Partial<ConfigState>;
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const providers = seedProviders(state.providers);
        state.providers = providers;
        state.models = modelsFromProviders(providers, state.models);
        // Ensure built-in runtimes always exist (additive — never replaces user edits).
        const builtins = [
          seedRuntime(),
          seedOmegaRuntime(),
          seedMorpheusRuntime(),
          seedStigmergyRuntime(),
          seedEphemeralRuntime(),
          seedSupremeCoordinatorRuntime(),
        ];
        const existing = new Map((state.runtimes ?? []).map((r) => [r.id, r]));
        for (const b of builtins)
          if (!existing.has(b.id)) existing.set(b.id, b);
        state.runtimes = Array.from(existing.values());
      },
    },
  ),
);

/** Helper: build a usable ProviderSpec (with decoded API key) for a given provider id. */
export function getRuntimeProviderSpec(providerId: string | undefined) {
  if (!providerId) return undefined;
  const cfg = useConfig.getState().providers[providerId];
  return cfg ? buildSpecFromConfig(cfg) : undefined;
}

export function getIntegrationDecoded(id: string): Integration | undefined {
  const i = useConfig.getState().integrations.find((x) => x.id === id);
  if (!i) return undefined;
  return {
    ...i,
    secrets: i.secrets
      ? Object.fromEntries(
          Object.entries(i.secrets).map(([k, v]) => [
            k,
            v ? deobfuscate(v) : "",
          ]),
        )
      : undefined,
  };
}

export function getMcpServerDecoded(id: string): McpServer | undefined {
  const m = useConfig.getState().mcpServers.find((x) => x.id === id);
  if (!m) return undefined;
  return { ...m, apiKey: m.apiKey ? deobfuscate(m.apiKey) : undefined };
}

export function getRuntimeDecoded(id: string): AgentRuntime | undefined {
  const r = useConfig.getState().runtimes.find((x) => x.id === id);
  if (!r) return undefined;
  return { ...r, apiKey: r.apiKey ? deobfuscate(r.apiKey) : undefined };
}

export function defaultCapabilitiesFor(kind: RuntimeKind): RuntimeCapabilities {
  switch (kind) {
    case "langgraph-dag":
    case "langgraph":
      return {
        canPlan: true,
        canGenerateCode: true,
        canExecute: false,
        canDebug: true,
        canCritiqueVisual: false,
        canStream: true,
        supportsLivePreview: false,
      };
    case "webcontainer":
      return {
        canPlan: false,
        canGenerateCode: false,
        canExecute: true,
        canDebug: true,
        canCritiqueVisual: false,
        canStream: false,
        supportsLivePreview: true,
      };
    case "crewai":
      return {
        canPlan: true,
        canGenerateCode: true,
        canExecute: false,
        canDebug: true,
        canCritiqueVisual: false,
        canStream: false,
        supportsLivePreview: false,
      };
    case "autogen":
      return {
        canPlan: true,
        canGenerateCode: true,
        canExecute: false,
        canDebug: true,
        canCritiqueVisual: false,
        canStream: true,
        supportsLivePreview: false,
      };
    case "llamaindex":
      return {
        canPlan: true,
        canGenerateCode: false,
        canExecute: false,
        canDebug: false,
        canCritiqueVisual: false,
        canStream: true,
        supportsLivePreview: false,
      };
    case "omega-cognition":
      return {
        canPlan: true,
        canGenerateCode: true,
        canExecute: false,
        canDebug: true,
        canCritiqueVisual: true,
        canStream: true,
        supportsLivePreview: false,
      };
    case "morpheus-pantheon":
      return {
        canPlan: true,
        canGenerateCode: true,
        canExecute: false,
        canDebug: true,
        canCritiqueVisual: true,
        canStream: true,
        supportsLivePreview: false,
      };
    case "stigmergy-nexus":
      return {
        canPlan: true,
        canGenerateCode: true,
        canExecute: false,
        canDebug: true,
        canCritiqueVisual: false,
        canStream: true,
        supportsLivePreview: false,
      };
    case "ephemeral-genesis":
      return {
        canPlan: true,
        canGenerateCode: true,
        canExecute: false,
        canDebug: true,
        canCritiqueVisual: false,
        canStream: true,
        supportsLivePreview: false,
      };
    case "supreme-coordinator":
      return {
        canPlan: true,
        canGenerateCode: true,
        canExecute: false,
        canDebug: true,
        canCritiqueVisual: true,
        canStream: true,
        supportsLivePreview: false,
      };
    case "custom":
      return {
        canPlan: false,
        canGenerateCode: false,
        canExecute: false,
        canDebug: false,
        canCritiqueVisual: false,
        canStream: false,
        supportsLivePreview: false,
      };
    case "generic":
    default:
      return {
        canPlan: true,
        canGenerateCode: true,
        canExecute: false,
        canDebug: true,
        canCritiqueVisual: true,
        canStream: true,
        supportsLivePreview: false,
      };
  }
}

/** Make sure every preset is at least visible in Settings (unconfigured stub). */
export function ensurePresetsRegistered() {
  const state = useConfig.getState();
  const providers = seedProviders(state.providers);
  const models = modelsFromProviders(providers, state.models);
  useConfig.setState({ providers, models });
}

export { presetById };
