import type { ProviderSpec } from "@/types";
import type { SystemCommand } from "@/core/permissions/PermissionEngine";
import type {
  KnowledgeSearchResponse,
  KnowledgeSourceId,
} from "@/core/knowledge/types";
import { useConfig } from "@/stores/config";

export const CLIENT_AUTH_STORAGE_KEY = "pa:nexusAuthKey";
export const API_UNAUTHORIZED_EVENT = "nexus:api-unauthorized";
const DEV_FALLBACK_AUTH_KEY = "pa-local-dev-key";

export const API_BASE = (() => {
  if (typeof window === "undefined") return "http://127.0.0.1:3336";
  // Vite dev: same host, port 3336. Production: same origin (assumed reverse-proxied).
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return "http://127.0.0.1:3336";
  }
  return window.location.origin;
})();

function getViteAuthKey(): string {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  return env?.VITE_NEXUS_AUTH_KEY?.trim() ?? "";
}

export function getClientApiAuthKey(): string {
  try {
    const envKey = getViteAuthKey();
    if (envKey) return envKey;
    const isLocalHost =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1");
    if (typeof window !== "undefined") {
      const localOverride = window.localStorage.getItem(CLIENT_AUTH_STORAGE_KEY)?.trim();
      if (localOverride) return localOverride;
    }
    const configuredKey = useConfig.getState().settings.masterKey?.trim();
    if (configuredKey === DEV_FALLBACK_AUTH_KEY && !isLocalHost) return "";
    if (configuredKey) return configuredKey;
    return "";
  } catch {
    return "";
  }
}

export function persistClientApiAuthKey(value: string) {
  const nextKey = value.trim();
  try {
    if (typeof window !== "undefined") {
      if (nextKey) window.localStorage.setItem(CLIENT_AUTH_STORAGE_KEY, nextKey);
      else window.localStorage.removeItem(CLIENT_AUTH_STORAGE_KEY);
    }
    useConfig.getState().setSettings({ masterKey: nextKey });
  } catch {
    // Best effort persistence only.
  }
}

export function clearClientApiAuthKey() {
  persistClientApiAuthKey("");
}

export function apiHeaders(headers?: HeadersInit, authKey = getClientApiAuthKey()): Headers {
  const nextHeaders = new Headers(headers);
  if (authKey) nextHeaders.set("x-nexus-auth", authKey);
  return nextHeaders;
}

export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  authKey?: string,
) {
  const response = await fetch(input, {
    ...init,
    credentials: init.credentials ?? "same-origin",
    headers: apiHeaders(init.headers, authKey),
  });
  if (response.status === 401 && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(API_UNAUTHORIZED_EVENT));
  }
  return response;
}

export interface HealthResult {
  ok: boolean;
  ts?: number;
  error?: string;
  authRequired?: boolean;
}

export interface AuthSessionResult {
  ok: boolean;
  authenticated: boolean;
  status?: number;
  error?: string;
}

export interface TestResult {
  ok: boolean;
  status?: number;
  latencyMs?: number;
  modelCount?: number;
  error?: string;
}

export type MediaGenerateKind = "image" | "audio" | "video";

export interface MediaInputFilePayload {
  name: string;
  type: string;
  dataUrl: string;
}

export interface MediaGeneratePayload {
  kind: MediaGenerateKind;
  providerId: string;
  presetId?: string;
  spec: ProviderSpec;
  model: string;
  prompt: string;
  voiceName?: string;
  audioMode?: string;
  voiceClone?: MediaInputFilePayload;
  lipSync?: {
    audio?: MediaInputFilePayload;
    text?: string;
  };
}

export interface MediaGenerateResult {
  kind: MediaGenerateKind;
  url: string;
  filename: string;
  mimeType: string;
  createdAt: number;
  providerId: string;
  model: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeBackendUnauthorized<T extends { ok?: boolean; error?: string }>(
  response: Response,
  data: T,
): T {
  if (response.status !== 401) return data;
  const record: Record<string, unknown> = isRecord(data) ? data : {};
  const code = record.code;
  const error = record.error;
  const isBackendAuth =
    code === "BACKEND_UNAUTHORIZED" ||
    error === "unauthorized" ||
    (typeof error === "string" && /x-nexus-auth|NEXUS_AUTH_KEY|APP_AUTH_KEY/i.test(error));
  if (!isBackendAuth) return data;
  return {
    ...data,
    ok: false,
    error:
      "Backend nao autorizado. A Master API Key do app precisa bater com NEXUS_AUTH_KEY/APP_AUTH_KEY do servidor.",
  };
}

export const api = {
  async health(): Promise<HealthResult> {
    try {
      const r = await apiFetch(`${API_BASE}/api/health`, { method: "GET" });
      if (!r.ok) return { ok: false, error: `HTTP ${r.status}` };
      return await r.json();
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  },

  async authSession(authKey?: string): Promise<AuthSessionResult> {
    try {
      const r = await apiFetch(
        `${API_BASE}/api/auth/session`,
        { method: "GET" },
        authKey?.trim() || undefined,
      );
      const data = await r.json().catch(() => null) as
        | { ok?: boolean; authenticated?: boolean; error?: string }
        | null;
      if (!r.ok) {
        return {
          ok: false,
          authenticated: false,
          status: r.status,
          error: data?.error ?? `HTTP ${r.status}`,
        };
      }
      return {
        ok: Boolean(data?.ok ?? true),
        authenticated: Boolean(data?.authenticated ?? true),
        status: r.status,
      };
    } catch (err) {
      return {
        ok: false,
        authenticated: false,
        error: (err as Error).message,
      };
    }
  },

  async authLogin(key: string): Promise<AuthSessionResult> {
    try {
      const r = await apiFetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const data = await r.json().catch(() => null) as
        | { ok?: boolean; authenticated?: boolean; error?: string }
        | null;
      if (!r.ok) {
        return {
          ok: false,
          authenticated: false,
          status: r.status,
          error: data?.error ?? `HTTP ${r.status}`,
        };
      }
      return {
        ok: Boolean(data?.ok ?? true),
        authenticated: Boolean(data?.authenticated ?? true),
        status: r.status,
      };
    } catch (err) {
      return {
        ok: false,
        authenticated: false,
        error: (err as Error).message,
      };
    }
  },

  async authLogout(): Promise<{ ok: boolean; error?: string }> {
    try {
      const r = await apiFetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      const data = await r.json().catch(() => null) as { ok?: boolean; error?: string } | null;
      if (!r.ok || data?.ok === false) {
        return { ok: false, error: data?.error ?? `HTTP ${r.status}` };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  },

  async runTool(payload: { kind: string; args: Record<string, unknown>; code?: string }): Promise<{ ok: boolean; result?: unknown; error?: string; latencyMs?: number }> {
    const r = await apiFetch(`${API_BASE}/api/tools/run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    return r.json();
  },

  async runSystemCommand(command: SystemCommand): Promise<{ success: boolean; exitCode: number; stdout: string; stderr: string; durationMs: number }> {
    const r = await apiFetch(`${API_BASE}/api/system/command`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ command }),
    });
    return r.json();
  },

  async testIntegration(payload: { url: string; method?: string; headers?: Record<string, string>; body?: unknown }): Promise<{ ok: boolean; status?: number; latencyMs?: number; sample?: string; error?: string }> {
    const r = await apiFetch(`${API_BASE}/api/integrations/test`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    return r.json();
  },

  async mcpList(payload: { url: string; apiKey?: string }): Promise<{ ok: boolean; tools?: Array<{ name: string; description?: string; inputSchema?: Record<string, unknown> }>; latencyMs?: number; error?: string }> {
    const r = await apiFetch(`${API_BASE}/api/mcp/list`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    return r.json();
  },

  async mcpCall(payload: { url: string; apiKey?: string; name: string; arguments?: Record<string, unknown> }): Promise<{ ok: boolean; result?: unknown; latencyMs?: number; error?: string }> {
    const r = await apiFetch(`${API_BASE}/api/mcp/call`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    return r.json();
  },

  async testRuntime(payload: { url: string; apiKey?: string }): Promise<{ ok: boolean; status?: number; latencyMs?: number; sample?: string; error?: string }> {
    const r = await apiFetch(`${API_BASE}/api/runtimes/test`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    return r.json();
  },

  async testProvider(spec: ProviderSpec): Promise<TestResult> {
    const r = await apiFetch(`${API_BASE}/api/providers/test`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ spec }),
    });
    const data = (await r.json()) as TestResult;
    return normalizeBackendUnauthorized(r, data);
  },

  async fetchModels(spec: ProviderSpec): Promise<Array<{ id: string; name?: string }>> {
    const r = await apiFetch(`${API_BASE}/api/providers/models`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ spec }),
    });
    const data = normalizeBackendUnauthorized(
      r,
      (await r.json()) as { ok?: boolean; models?: Array<{ id: string; name?: string }>; error?: string },
    );
    if (!r.ok || data.ok === false) {
      throw new Error(data.error ?? `HTTP ${r.status}`);
    }
    return data.models ?? [];
  },

  async generateMedia(payload: MediaGeneratePayload): Promise<MediaGenerateResult> {
    const r = await apiFetch(`${API_BASE}/api/media/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = normalizeBackendUnauthorized(
      r,
      (await r.json()) as { ok?: boolean; data?: MediaGenerateResult; error?: string },
    );
    if (!r.ok || data.ok === false || !data.data) {
      throw new Error(data.error ?? `HTTP ${r.status}`);
    }
    return data.data;
  },

  async searchKnowledge(payload: {
    query: string;
    limit?: number;
    sources?: Array<Exclude<KnowledgeSourceId, "local">>;
  }): Promise<KnowledgeSearchResponse> {
    const r = await apiFetch(`${API_BASE}/api/knowledge/search`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    if (!r.ok || !data?.ok) {
      throw new Error(data?.error ?? `HTTP ${r.status}`);
    }
    return data.data as KnowledgeSearchResponse;
  },

  /**
   * Streams chat tokens via Server-Sent Events. Calls `onToken` for each delta,
   * `onDone` when finished, `onError` on failure. Returns a function to abort.
   */
  streamChat(params: {
    spec: ProviderSpec;
    model: string;
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
    temperature?: number;
    onToken: (delta: string) => void;
    onDone: () => void;
    onError: (err: string) => void;
  }): () => void {
    const ctrl = new AbortController();
    (async () => {
      try {
        const r = await apiFetch(`${API_BASE}/api/chat/stream`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            spec: params.spec,
            model: params.model,
            messages: params.messages,
            temperature: params.temperature,
          }),
          signal: ctrl.signal,
        });
        if (!r.ok || !r.body) {
          params.onError(`HTTP ${r.status}`);
          return;
        }
        const reader = r.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const blocks = buf.split("\n\n");
          buf = blocks.pop() ?? "";
          for (const block of blocks) {
            const ev = parseSseBlock(block);
            if (!ev) continue;
            const delta = readSseStringField(ev.data, "delta");
            if (ev.event === "token" && delta) params.onToken(delta);
            else if (ev.event === "error") {
              params.onError(readSseMessage(ev.data) ?? "stream error");
              return;
            }
            else if (ev.event === "done") { params.onDone(); return; }
          }
        }
        params.onDone();
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          params.onDone();
          return;
        }
        const msg = (err as Error).message;
        const friendly = /Failed to fetch|NetworkError|ECONNREFUSED/i.test(msg)
          ? `Backend offline em ${API_BASE}. Rode \`npm run server\` em outro terminal.`
          : msg;
        params.onError(friendly);
      }
    })();
    return () => ctrl.abort();
  },

  /** Stream LangGraph runtime execution events. */
  streamGraph(params: {
    body: unknown;
    onEvent: (name: string, data: unknown) => void;
    onDone: () => void;
    onError: (err: string) => void;
  }): () => void {
    const ctrl = new AbortController();
    (async () => {
      try {
        const r = await apiFetch(`${API_BASE}/api/runtimes/langgraph/run`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(params.body),
          signal: ctrl.signal,
        });
        if (!r.ok || !r.body) { params.onError(`HTTP ${r.status}`); return; }
        const reader = r.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const blocks = buf.split("\n\n");
          buf = blocks.pop() ?? "";
          for (const block of blocks) {
            const ev = parseSseBlock(block);
            if (!ev) continue;
            if (ev.event === "error") {
              params.onError(readSseMessage(ev.data) ?? "graph error");
              return;
            }
            params.onEvent(ev.event, ev.data);
            if (ev.event === "final") { params.onDone(); return; }
          }
        }
        params.onDone();
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          params.onDone();
          return;
        }
        const msg = (err as Error).message;
        const friendly = /Failed to fetch|NetworkError|ECONNREFUSED/i.test(msg)
          ? `Backend offline em ${API_BASE}. Rode \`npm run server\` em outro terminal.`
          : msg;
        params.onError(friendly);
      }
    })();
    return () => ctrl.abort();
  },
};

function parseSseBlock(block: string): { event: string; data: unknown } | null {
  const lines = block.split("\n");
  let event = "message";
  let data = "";
  for (const l of lines) {
    if (l.startsWith("event:")) event = l.slice(6).trim();
    else if (l.startsWith("data:")) data += l.slice(5).trim();
  }
  if (!data) return null;
  try { return { event, data: JSON.parse(data) }; } catch { return { event, data }; }
}

function readSseMessage(data: unknown): string | undefined {
  return readSseStringField(data, "message") ?? (typeof data === "string" ? data : undefined);
}

function readSseStringField(data: unknown, field: string): string | undefined {
  if (typeof data === "string") return data;
  if (!data || typeof data !== "object") return undefined;
  const value = (data as Record<string, unknown>)[field];
  return typeof value === "string" ? value : undefined;
}
