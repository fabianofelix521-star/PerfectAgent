import type { ProviderSpec } from "@/types";
import type { SystemCommand } from "@/core/permissions/PermissionEngine";
import type {
  KnowledgeSearchResponse,
  KnowledgeSourceId,
} from "@/core/knowledge/types";
import { useConfig } from "@/stores/config";

export const API_BASE = (() => {
  if (typeof window === "undefined") return "http://127.0.0.1:3336";
  // Vite dev: same host, port 3336. Production: same origin (assumed reverse-proxied).
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return "http://127.0.0.1:3336";
  }
  return window.location.origin;
})();

export function getClientApiAuthKey(): string {
  try {
    const configuredKey = useConfig.getState().settings.masterKey?.trim();
    if (configuredKey) return configuredKey;
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("pa:nexusAuthKey")?.trim() ?? "";
  } catch {
    return "";
  }
}

export function apiHeaders(headers?: HeadersInit): Headers {
  const nextHeaders = new Headers(headers);
  const authKey = getClientApiAuthKey();
  if (authKey) nextHeaders.set("x-nexus-auth", authKey);
  return nextHeaders;
}

export function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  return fetch(input, { ...init, headers: apiHeaders(init.headers) });
}

export interface TestResult {
  ok: boolean;
  status?: number;
  latencyMs?: number;
  modelCount?: number;
  error?: string;
}

export const api = {
  async health(): Promise<{ ok: boolean; ts?: number; error?: string }> {
    try {
      const r = await apiFetch(`${API_BASE}/api/health`, { method: "GET" });
      if (!r.ok) return { ok: false, error: `HTTP ${r.status}` };
      return await r.json();
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
    return r.json();
  },

  async fetchModels(spec: ProviderSpec): Promise<Array<{ id: string; name?: string }>> {
    const r = await apiFetch(`${API_BASE}/api/providers/models`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ spec }),
    });
    const data = await r.json();
    return data.models ?? [];
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
