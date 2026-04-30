/**
 * Shared contracts for the Vite frontend and local API client.
 *
 * The app keeps compatibility fields for older screens (`spec`, `presetId`,
 * `defaultModel`) while exposing the normalized contracts used by the current
 * stores and pickers (`baseUrl`, `enabled`, `providerId`, `defaultModelId`).
 */

export type ProviderShape = "openai" | "anthropic" | "gemini" | "ollama" | "custom";
export type AuthMode = "bearer" | "header" | "query" | "none";

export interface ProviderSpec {
  shape: ProviderShape;
  baseUrl: string;
  apiKey?: string;
  authMode?: AuthMode;
  authHeaderName?: string;
  extraHeaders?: Record<string, string>;
  pathOverrides?: { chat?: string; models?: string };
}

/** A registered provider in the user's settings. */
export interface ProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey?: string;
  enabled: boolean;
  supportsModelsFetch?: boolean;
  supportsVision?: boolean;
  presetId: string;                // canonical preset id
  spec: ProviderSpec;
  defaultModel?: string;
  fetchedModels?: Array<{ id: string; name?: string }>;
  configured: boolean;
  lastTest?: { ok: boolean; status?: number; latencyMs?: number; error?: string; at: number };
}

export interface ModelConfig {
  id: string;
  providerId: string;
  name: string;
  label: string;
  enabled: boolean;
  contextWindow?: number;
}

export interface ProviderPreset {
  id: string;
  name: string;
  shape: ProviderShape;
  baseUrl: string;
  authMode: AuthMode;
  authHeaderName?: string;
  extraHeaders?: Record<string, string>;
  envVar?: string;
  presetModels?: string[];
  notes?: string;
  /** fields the user must fill in besides the API key */
  extraFields?: Array<{ key: string; label: string; type?: "text" | "password"; placeholder?: string }>;
}

export interface ChatMessageV2 {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: Array<{ name: string; size: number; type: string; dataUrl?: string }>;
  createdAt: number;
  providerId?: string;
  modelId?: string;
  runtimeId?: string;
  streaming?: boolean;
  error?: string;
}

export interface RuntimeNode {
  id: string;
  type: "llm" | "tool" | "router" | "human" | "transform";
  label?: string;
  prompt?: string;
  toolCode?: string;
  transformCode?: string;
  routerKey?: string;
}

export interface RuntimeEdge {
  id: string;
  from: string;
  to: string;
  condition?: string;
}

export interface RuntimeCapabilities {
  canPlan: boolean;
  canGenerateCode: boolean;
  canExecute: boolean;
  canDebug: boolean;
  canCritiqueVisual: boolean;
  canStream: boolean;
  supportsLivePreview: boolean;
}

export interface RuntimeConfig {
  id: string;
  name: string;
  type: "langgraph" | "crewai" | "autogen" | "llamaindex" | "webcontainer" | "custom";
  endpoint?: string;
  apiKey?: string;
  status: "connected" | "disconnected" | "untested";
  isDefault?: boolean;
  capabilities: RuntimeCapabilities;
}

export type RuntimeKind =
  | "langgraph-dag"   // legacy: in-app LangGraph DAG (uses /api/runtimes/langgraph/run)
  | "langgraph"       // remote LangGraph endpoint
  | "crewai"
  | "autogen"
  | "llamaindex"
  | "webcontainer"
  | "omega-cognition" // OmegaCognitionEngine — 8-layer cognitive runtime overlay
  | "custom"          // generic HTTP webhook
  | "generic";        // pure LLM fallback (no runtime endpoint)

export type RuntimeStatus = "ready" | "running" | "paused" | "error" | "untested" | "connected" | "disconnected";

export interface AgentRuntime {
  id: string;
  name: string;
  description?: string;
  /** Kind of runtime adapter. Defaults to "langgraph-dag" for backwards compatibility. */
  kind?: RuntimeKind;
  /** For remote kinds: HTTP endpoint. */
  endpoint?: string;
  /** Obfuscated API key (use getRuntimeDecoded helper). */
  apiKey?: string;
  /** Capabilities advertised by this runtime. */
  capabilities?: RuntimeCapabilities;
  /** DAG fields (only meaningful for kind="langgraph-dag"). */
  nodes: RuntimeNode[];
  edges: RuntimeEdge[];
  entry: string;
  exits: string[];
  llmProviderId?: string;
  llmModel?: string;
  memory: boolean;
  isDefault?: boolean;
  status: RuntimeStatus;
  lastRun?: { at: number; durationMs: number; ok: boolean; finalOutput?: unknown };
  lastTest?: { ok: boolean; latencyMs?: number; error?: string; at: number };
}

export interface ProjectFile {
  path: string;        // e.g. "src/App.tsx"
  content: string;
  language?: string;
}

export interface StudioProject {
  id: string;
  name: string;
  description?: string;
  files: ProjectFile[];
  activeFile?: string;
  createdAt: number;
  updatedAt: number;
}

export interface GeneratedProject {
  id: string;
  name: string;
  files: ProjectFile[];
  entryFile?: string;
  previewUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiError = { ok: false; error: string; details?: unknown };
export type ApiEnvelope<T> = ApiSuccess<T> | ApiError;

export interface DeployRecord {
  id: string;
  target: string;
  status: "pending" | "success" | "failed";
  url?: string;
  log: string;
  at: number;
}

/* ---------- Phase 2: Skills, Tools, Integrations, MCP ---------- */

export interface Skill {
  id: string;
  name: string;
  description: string;
  /** System prompt injected into chats when this skill is enabled. */
  systemPrompt: string;
  tags: string[];
  enabled: boolean;
  builtIn?: boolean;
}

export interface ToolParam {
  key: string;
  type: "string" | "number" | "boolean" | "json";
  required?: boolean;
  default?: string;
  description?: string;
}

export type ToolKind =
  | "http"          // generic HTTP request
  | "json"          // parse / transform JSON via JS
  | "websearch"     // duckduckgo HTML scrape
  | "calculator"    // math.js eval
  | "fs"            // read project files
  | "shell"         // run a whitelisted shell command (disabled by default)
  | "custom";       // user JS code

export interface Tool {
  id: string;
  name: string;
  description: string;
  kind: ToolKind;
  params: ToolParam[];
  /** For `custom`: JS source `(args) => result`. For others: kind-specific config. */
  code?: string;
  config?: Record<string, unknown>;
  enabled: boolean;
  builtIn?: boolean;
}

export interface Integration {
  id: string;
  name: string;
  kind: "webhook" | "slack" | "github" | "stripe" | "supabase" | "notion" | "google" | "custom";
  url?: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  bodyTemplate?: string;
  /** Tokens / credentials, obfuscated like provider keys. */
  secrets?: Record<string, string>;
  connected: boolean;
  lastTest?: { ok: boolean; status?: number; latencyMs?: number; error?: string; at: number };
}

export interface McpServer {
  id: string;
  name: string;
  /** "http" = MCP-over-HTTP (we POST {action, ...} to url). "command" stub for future stdio. */
  transport: "http" | "command";
  url?: string;
  command?: string;
  apiKey?: string;
  enabled: boolean;
  tools?: Array<{ name: string; description?: string; inputSchema?: Record<string, unknown> }>;
  lastTest?: { ok: boolean; latencyMs?: number; error?: string; at: number };
}
