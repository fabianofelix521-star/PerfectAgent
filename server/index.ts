/**
 * PerfectAgent backend — Phase 1
 * Provides:
 *  - GET  /api/health
 *  - POST /api/providers/test       — test connectivity for an AI provider
 *  - POST /api/providers/models     — fetch live model list
 *  - POST /api/chat/stream          — SSE streaming chat completions (OpenAI-compatible)
 *  - POST /api/runtimes/langgraph/run — execute a user-defined LangGraph
 *
 * Design: provider-agnostic. The client passes a "providerSpec" describing how to
 * call the upstream provider (baseUrl, headers, body shape). The server proxies
 * the request to bypass CORS and to keep the streaming token-by-token contract.
 */
import express from "express";
import cors from "cors";
import { spawn } from "node:child_process";
import { searchKnowledge } from "./knowledge";

const app = express();
const PORT = Number(process.env.PORT ?? 3336);

type LangGraphModule = typeof import("@langchain/langgraph");

let langGraphModulePromise: Promise<LangGraphModule> | null = null;

function loadLangGraph(): Promise<LangGraphModule> {
  if (!langGraphModulePromise) {
    langGraphModulePromise = import("@langchain/langgraph");
  }
  return langGraphModulePromise;
}

app.use(cors({ origin: true }));
// Cross-Origin Resource Policy / Embedder Policy: required so the Vite dev page
// (which sets COEP=require-corp for WebContainer) can consume responses from
// this API on a different port. Without these headers the browser silently
// terminates streaming responses, surfacing as "This operation was aborted".
app.use((_req, res, next) => {
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
});
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

app.post("/api/knowledge/search", async (req, res) => {
  const query = typeof req.body?.query === "string" ? req.body.query : "";
  if (query.trim().length < 3) {
    return res.status(400).json({ ok: false, error: "query too short" });
  }
  try {
    const data = await searchKnowledge({
      query,
      limit: typeof req.body?.limit === "number" ? req.body.limit : undefined,
      sources: Array.isArray(req.body?.sources)
        ? req.body.sources.filter((item: unknown): item is string => typeof item === "string")
        : undefined,
    });
    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: (error as Error).message,
    });
  }
});

/* ---------------------------------------------------------------- types ---*/

type ProviderShape = "openai" | "anthropic" | "gemini" | "ollama" | "custom";
type AuthMode = "bearer" | "header" | "query" | "none";

interface ProviderSpec {
  shape: ProviderShape;
  baseUrl: string;
  apiKey?: string;
  authMode?: AuthMode;
  authHeaderName?: string; // e.g. "x-api-key" for Anthropic
  extraHeaders?: Record<string, string>;
  // for Azure / AWS / custom that need extra path bits:
  pathOverrides?: { chat?: string; models?: string };
}

function buildHeaders(spec: ProviderSpec): Record<string, string> {
  const h: Record<string, string> = {
    "content-type": "application/json",
    ...(spec.extraHeaders ?? {}),
  };
  if (!spec.apiKey || spec.authMode === "none") return h;
  switch (spec.authMode ?? "bearer") {
    case "bearer":
      h["authorization"] = `Bearer ${spec.apiKey}`;
      break;
    case "header":
      h[spec.authHeaderName ?? "x-api-key"] = spec.apiKey;
      break;
    case "query":
      // handled at URL build time
      break;
  }
  return h;
}

function buildUrl(spec: ProviderSpec, kind: "chat" | "models"): string {
  const base = spec.baseUrl.replace(/\/+$/, "");
  const defaults = {
    openai: { chat: "/chat/completions", models: "/models" },
    anthropic: { chat: "/messages", models: "/models" },
    gemini: { chat: "/models", models: "/models" },
    ollama: { chat: "/chat/completions", models: "/models" },
    custom: { chat: "/chat/completions", models: "/models" },
  } as const;
  const path = spec.pathOverrides?.[kind] ?? defaults[spec.shape][kind];
  let url = base + path;
  if (spec.authMode === "query" && spec.apiKey) {
    url +=
      (url.includes("?") ? "&" : "?") +
      `key=${encodeURIComponent(spec.apiKey)}`;
  }
  return url;
}

/* ----------------------------------------------------- /api/providers/* ---*/

app.post("/api/providers/test", async (req, res) => {
  const spec = req.body?.spec as ProviderSpec | undefined;
  if (!spec?.baseUrl)
    return res.status(400).json({ ok: false, error: "missing spec.baseUrl" });
  const url = buildUrl(spec, "models");
  const t0 = Date.now();
  try {
    const r = await fetch(url, { method: "GET", headers: buildHeaders(spec) });
    const text = await r.text();
    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* keep raw */
    }
    return res.json({
      ok: r.ok,
      status: r.status,
      latencyMs: Date.now() - t0,
      modelCount: countModels(json),
      sample: text.slice(0, 240),
    });
  } catch (err) {
    return res.json({
      ok: false,
      error: (err as Error).message,
      latencyMs: Date.now() - t0,
    });
  }
});

app.post("/api/providers/models", async (req, res) => {
  const spec = req.body?.spec as ProviderSpec | undefined;
  if (!spec?.baseUrl)
    return res.status(400).json({ ok: false, error: "missing spec.baseUrl" });
  try {
    const r = await fetch(buildUrl(spec, "models"), {
      headers: buildHeaders(spec),
    });
    const data = await r.json().catch(() => null);
    return res.json({
      ok: r.ok,
      status: r.status,
      models: extractModels(data),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

function countModels(data: unknown): number {
  return extractModels(data).length;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function extractModels(data: unknown): Array<{ id: string; name?: string }> {
  if (!isRecord(data)) return [];
  // OpenAI-compatible: { data: [{ id }] }
  if (Array.isArray(data.data)) {
    return data.data
      .filter(isRecord)
      .map((m) => ({
        id: String(m.id ?? m.name ?? ""),
        name: typeof m.name === "string" ? m.name : undefined,
      }))
      .filter((m) => m.id);
  }
  // Anthropic: { data: [{ id, display_name }] } — already covered above
  // Gemini: { models: [{ name }] }
  if (Array.isArray(data.models)) {
    return data.models
      .filter(isRecord)
      .map((m) => ({
        id: String(m.name ?? m.id ?? ""),
        name: typeof m.displayName === "string" ? m.displayName : undefined,
      }))
      .filter((m) => m.id);
  }
  return [];
}

/* ---------------------------------------------------- /api/chat/stream ---*/

interface ChatRequest {
  spec: ProviderSpec;
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  temperature?: number;
  maxTokens?: number;
}

app.post("/api/chat/stream", async (req, res) => {
  const body = req.body as ChatRequest | undefined;
  if (!body?.spec || !body?.model || !body?.messages?.length) {
    return res.status(400).json({ error: "missing spec, model or messages" });
  }
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const abort = new AbortController();
  let completed = false;
  res.on("close", () => {
    if (!completed && !res.writableEnded) abort.abort();
  });

  try {
    const url = buildUrl(body.spec, "chat");
    const headers = buildHeaders(body.spec);
    const upstreamBody = buildChatBody(body);

    const upstream = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(upstreamBody),
      signal: abort.signal,
    });

    if (!upstream.ok || !upstream.body) {
      const err = await upstream.text();
      send("error", { status: upstream.status, message: err.slice(0, 500) });
      return res.end();
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const raw of lines) {
        const line = raw.trim();
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") {
          completed = true;
          send("done", {});
          return res.end();
        }
        try {
          const parsed = JSON.parse(payload);
          const token = extractToken(parsed, body.spec.shape);
          if (token) send("token", { delta: token });
        } catch {
          /* skip non-json keepalive */
        }
      }
    }
    completed = true;
    send("done", {});
    res.end();
  } catch (err) {
    completed = true;
    if (abort.signal.aborted && (res.destroyed || res.writableEnded)) return;
    const message =
      (err as Error).name === "AbortError"
        ? "Stream cancelado antes da resposta terminar."
        : (err as Error).message;
    send("error", { message });
    res.end();
  }
});

function buildChatBody(body: ChatRequest): unknown {
  const { spec, model, messages, temperature = 0.7, maxTokens } = body;
  if (spec.shape === "anthropic") {
    const system = messages.find((m) => m.role === "system")?.content;
    return {
      model,
      max_tokens: maxTokens ?? 1024,
      temperature,
      stream: true,
      system,
      messages: messages.filter((m) => m.role !== "system"),
    };
  }
  // OpenAI-compatible (groq, openrouter, deepseek, ollama, fireworks, together…)
  return {
    model,
    messages,
    temperature,
    stream: true,
    ...(maxTokens ? { max_tokens: maxTokens } : {}),
  };
}

function extractToken(parsed: unknown, shape: ProviderShape): string {
  if (!isRecord(parsed)) return "";
  if (shape === "anthropic") {
    const delta = isRecord(parsed.delta) ? parsed.delta : undefined;
    if (parsed.type === "content_block_delta" && delta?.type === "text_delta")
      return typeof delta.text === "string" ? delta.text : "";
    return "";
  }
  // OpenAI-compatible chunk
  const firstChoice = Array.isArray(parsed.choices)
    ? parsed.choices.find(isRecord)
    : undefined;
  const delta = isRecord(firstChoice?.delta) ? firstChoice.delta : undefined;
  if (typeof delta?.content === "string") return delta.content;
  return typeof firstChoice?.text === "string" ? firstChoice.text : "";
}

/* ---------------------------------------------- /api/runtimes/langgraph ---*/

interface GraphNodeSpec {
  id: string;
  type: "llm" | "tool" | "router" | "human" | "transform";
  prompt?: string; // for llm nodes
  toolCode?: string; // for tool nodes — JS source returning string|object
  routerKey?: string; // for router nodes — state field whose value picks next edge
  transformCode?: string; // for transform nodes — JS that modifies state
}

interface GraphEdgeSpec {
  from: string;
  to: string;
  condition?: string; // optional router branch label
}

interface RunGraphRequest {
  nodes: GraphNodeSpec[];
  edges: GraphEdgeSpec[];
  entry: string;
  exits: string[];
  input: Record<string, unknown>;
  llmSpec?: ProviderSpec;
  llmModel?: string;
}

app.post("/api/runtimes/langgraph/run", async (req, res) => {
  const body = req.body as RunGraphRequest | undefined;
  if (!body?.nodes?.length || !body?.entry) {
    return res.status(400).json({ ok: false, error: "missing nodes or entry" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const { StateGraph, START, END, Annotation } = await loadLangGraph();

    // Build a dynamic graph. State is a free-form record so user-defined transforms
    // can stash arbitrary keys.
    const StateSchema = Annotation.Root({
      input: Annotation<Record<string, unknown>>({
        reducer: (_a, b) => b ?? {},
        default: () => ({}),
      }),
      output: Annotation<Record<string, unknown>>({
        reducer: (a, b) => ({ ...a, ...b }),
        default: () => ({}),
      }),
      log: Annotation<string[]>({
        reducer: (a, b) => [...a, ...b],
        default: () => [],
      }),
      branch: Annotation<string | undefined>({
        reducer: (_a, b) => b,
        default: () => undefined,
      }),
    });

    type SState = typeof StateSchema.State;
    type DynamicGraph = {
      addNode(
        id: string,
        action: (state: SState) => Promise<Partial<SState>>,
      ): unknown;
      addEdge(from: string, to: string): unknown;
      addConditionalEdges(
        from: string,
        path: (state: SState) => string,
        pathMap: Record<string, string>,
      ): unknown;
      compile(): { invoke(input: Partial<SState>): Promise<unknown> };
    };

    const graph = new StateGraph(StateSchema);
    const dynamicGraph = graph as unknown as DynamicGraph;

    for (const node of body.nodes) {
      dynamicGraph.addNode(
        node.id,
        async (state: SState): Promise<Partial<SState>> => {
          send("node:start", { id: node.id, type: node.type });
          const result = await runNode(node, state, body, send);
          send("node:end", { id: node.id, output: result });
          return result;
        },
      );
    }

    // edges
    const grouped = new Map<string, GraphEdgeSpec[]>();
    for (const e of body.edges) {
      if (!grouped.has(e.from)) grouped.set(e.from, []);
      grouped.get(e.from)!.push(e);
    }

    dynamicGraph.addEdge(String(START), body.entry);

    for (const [from, edges] of grouped) {
      const fromNode = body.nodes.find((n) => n.id === from);
      const isRouter = fromNode?.type === "router" && edges.length > 1;
      if (isRouter) {
        const mapping: Record<string, string> = {};
        for (const e of edges) mapping[e.condition ?? "default"] = e.to;
        dynamicGraph.addConditionalEdges(
          from,
          (state: SState) => {
            const branch = state.branch ?? "default";
            return (
              mapping[branch] ??
              mapping["default"] ??
              body.exits[0] ??
              String(END)
            );
          },
          mapping,
        );
      } else {
        for (const e of edges) {
          dynamicGraph.addEdge(from, e.to);
        }
      }
    }
    for (const exit of body.exits) dynamicGraph.addEdge(exit, String(END));

    const compiled = dynamicGraph.compile();
    const finalState = await compiled.invoke({ input: body.input });
    send("final", finalState);
    res.end();
  } catch (err) {
    send("error", {
      message: (err as Error).message,
      stack: (err as Error).stack,
    });
    res.end();
  }
});

async function runNode(
  node: GraphNodeSpec,
  state: { input: Record<string, unknown>; output: Record<string, unknown> },
  ctx: RunGraphRequest,
  send: (event: string, data: unknown) => void,
): Promise<{
  output?: Record<string, unknown>;
  log?: string[];
  branch?: string;
}> {
  switch (node.type) {
    case "llm": {
      if (!ctx.llmSpec || !ctx.llmModel) {
        return { log: [`[${node.id}] no llm configured — skipping`] };
      }
      const userMsg = interpolate(node.prompt ?? "", {
        ...state.input,
        ...state.output,
      });
      const resp = await fetch(buildUrl(ctx.llmSpec, "chat"), {
        method: "POST",
        headers: buildHeaders(ctx.llmSpec),
        body: JSON.stringify(
          buildChatBody({
            spec: ctx.llmSpec,
            model: ctx.llmModel,
            messages: [{ role: "user", content: userMsg }],
          } as ChatRequest),
        ),
      });
      if (!resp.ok) {
        const err = await resp.text();
        return {
          log: [`[${node.id}] llm error ${resp.status}: ${err.slice(0, 200)}`],
        };
      }
      // collapse stream into a single string for this node
      const text = await collectStream(resp, ctx.llmSpec.shape, (delta) =>
        send("token", { node: node.id, delta }),
      );
      return { output: { [node.id]: text }, log: [`[${node.id}] llm ok`] };
    }
    case "transform":
    case "tool": {
      const code = node.transformCode ?? node.toolCode ?? "return {};";
      try {
        // eslint-disable-next-line no-new-func
        const fn = new Function("state", "input", `${code}`);
        const out = await fn(state, state.input);
        return { output: { [node.id]: out } };
      } catch (err) {
        return { log: [`[${node.id}] code error: ${(err as Error).message}`] };
      }
    }
    case "router": {
      const key = node.routerKey ?? "branch";
      const branch = String(
        state.output[key] ?? state.input[key] ?? "default",
      );
      return { branch, log: [`[${node.id}] route -> ${branch}`] };
    }
    case "human": {
      // For Phase 1 we auto-approve and just record a checkpoint event.
      send("human:checkpoint", { id: node.id, state });
      return { log: [`[${node.id}] human checkpoint recorded`] };
    }
  }
}

function interpolate(tpl: string, vars: Record<string, unknown>): string {
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k: string) => {
    const v = k
      .split(".")
      .reduce<unknown>(
        (acc, part) => (isRecord(acc) ? acc[part] : undefined),
        vars,
      );
    return v == null ? "" : String(v);
  });
}

async function collectStream(
  resp: Response,
  shape: ProviderShape,
  onToken: (t: string) => void,
): Promise<string> {
  if (!resp.body) return "";
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let acc = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const raw of lines) {
      const line = raw.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") return acc;
      try {
        const parsed = JSON.parse(payload);
        const token = extractToken(parsed, shape);
        if (token) {
          acc += token;
          onToken(token);
        }
      } catch {
        /* skip */
      }
    }
  }
  return acc;
}

/* ---------------------------------------------- /api/tools/run -----------*/

interface ToolRunRequest {
  kind:
    | "http"
    | "json"
    | "websearch"
    | "calculator"
    | "fs"
    | "shell"
    | "custom";
  args: Record<string, unknown>;
  code?: string;
}

app.post("/api/tools/run", async (req, res) => {
  const body = req.body as ToolRunRequest | undefined;
  if (!body?.kind)
    return res.status(400).json({ ok: false, error: "missing kind" });
  const t0 = Date.now();
  try {
    const result = await runTool(body);
    return res.json({ ok: true, result, latencyMs: Date.now() - t0 });
  } catch (err) {
    return res
      .status(500)
      .json({
        ok: false,
        error: (err as Error).message,
        latencyMs: Date.now() - t0,
      });
  }
});

/* ---------------------------------------------- /api/system/command -----*/

interface SystemCommandRequest {
  command: {
    id: string;
    command: string;
    args: string[];
    cwd?: string;
    env?: Record<string, string>;
    estimatedDurationMs?: number;
  };
}

app.post("/api/system/command", async (req, res) => {
  const body = req.body as SystemCommandRequest | undefined;
  const command = body?.command;
  if (!command?.command) {
    return res.status(400).json({
      success: false,
      exitCode: 1,
      stdout: "",
      stderr: "missing command",
      durationMs: 0,
    });
  }

  const started = Date.now();
  const timeoutMs = Math.max(1000, command.estimatedDurationMs ?? 120_000);
  const child = spawn(command.command, command.args ?? [], {
    cwd: command.cwd,
    env: { ...process.env, ...(command.env ?? {}) },
    shell: false,
  });

  let stdout = "";
  let stderr = "";
  const timer = setTimeout(() => {
    stderr += `\nTimeout after ${timeoutMs}ms`;
    child.kill("SIGTERM");
  }, timeoutMs);

  child.stdout.on("data", (chunk: Buffer) => {
    stdout += chunk.toString();
    if (stdout.length > 200_000) stdout = stdout.slice(-200_000);
  });
  child.stderr.on("data", (chunk: Buffer) => {
    stderr += chunk.toString();
    if (stderr.length > 200_000) stderr = stderr.slice(-200_000);
  });

  child.on("error", (error) => {
    clearTimeout(timer);
    res.json({
      success: false,
      exitCode: 1,
      stdout,
      stderr: stderr || error.message,
      durationMs: Date.now() - started,
    });
  });
  child.on("close", (code) => {
    clearTimeout(timer);
    res.json({
      success: code === 0,
      exitCode: code ?? 1,
      stdout,
      stderr,
      durationMs: Date.now() - started,
    });
  });
});

async function runTool(body: ToolRunRequest): Promise<unknown> {
  const a = body.args ?? {};
  switch (body.kind) {
    case "http": {
      const url = String(a.url ?? "");
      if (!url) throw new Error("missing url");
      const method = String(a.method ?? "GET").toUpperCase();
      let headers: Record<string, string> = {};
      if (typeof a.headers === "string") {
        try {
          headers = JSON.parse(a.headers);
        } catch {
          /* ignore */
        }
      } else if (a.headers && typeof a.headers === "object")
        headers = a.headers as Record<string, string>;
      const init: RequestInit = { method, headers };
      if (method !== "GET" && method !== "HEAD" && a.body)
        init.body = String(a.body);
      const r = await fetch(url, init);
      const text = await r.text();
      let parsed: unknown = text;
      try {
        parsed = JSON.parse(text);
      } catch {
        /* keep text */
      }
      return {
        status: r.status,
        headers: Object.fromEntries(r.headers),
        body: parsed,
      };
    }
    case "json": {
      const input = a.input;
      const expr = String(a.expression ?? "input");
      const fn = new Function("input", `return (${expr});`);
      return fn(input);
    }
    case "calculator": {
      const expr = String(a.expression ?? "");
      if (!/^[\d\s+\-*/().,%^eE]+$/.test(expr))
        throw new Error("only arithmetic allowed");
      return new Function(`return (${expr});`)();
    }
    case "websearch": {
      const q = String(a.query ?? "");
      if (!q) throw new Error("missing query");
      const r = await fetch(
        `https://duckduckgo.com/html/?q=${encodeURIComponent(q)}`,
        {
          headers: { "user-agent": "Mozilla/5.0 PerfectAgent" },
        },
      );
      const html = await r.text();
      const results: Array<{ title: string; url: string; snippet: string }> =
        [];
      const re =
        /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(html)) && results.length < 8) {
        results.push({
          url: m[1]
            .replace(/^\/\/duckduckgo\.com\/l\/\?uddg=/, "")
            .replace(/&.*$/, ""),
          title: stripTags(m[2]),
          snippet: stripTags(m[3]),
        });
      }
      return { query: q, results };
    }
    case "fs": {
      const fs = await import("node:fs/promises");
      const p = String(a.path ?? "");
      if (!p) throw new Error("missing path");
      if (p.includes("..")) throw new Error("path traversal blocked");
      const action = String(a.action ?? "read");
      if (action === "write") {
        await fs.writeFile(p, String(a.content ?? ""), "utf8");
        return { ok: true, path: p, written: true };
      }
      const content = await fs.readFile(p, "utf8");
      return { ok: true, path: p, content };
    }
    case "shell": {
      throw new Error("shell tool disabled in Phase 2");
    }
    case "custom": {
      if (!body.code) throw new Error("missing code");
      const fn = new Function("args", body.code);
      return await fn(a);
    }
  }
  throw new Error(`unknown kind: ${body.kind}`);
}

function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/* ---------------------------------------------- /api/integrations/test ---*/

app.post("/api/integrations/test", async (req, res) => {
  const { url, method = "POST", headers = {}, body } = req.body ?? {};
  if (!url) return res.status(400).json({ ok: false, error: "missing url" });
  const t0 = Date.now();
  try {
    const init: RequestInit = { method, headers };
    if (method !== "GET" && method !== "HEAD" && body !== undefined) {
      init.body = typeof body === "string" ? body : JSON.stringify(body);
    }
    const r = await fetch(url, init);
    const text = await r.text();
    return res.json({
      ok: r.ok,
      status: r.status,
      latencyMs: Date.now() - t0,
      sample: text.slice(0, 500),
    });
  } catch (err) {
    return res.json({
      ok: false,
      error: (err as Error).message,
      latencyMs: Date.now() - t0,
    });
  }
});

/* ---------------------------------------------- /api/mcp/* --------------*/

async function mcpRpc(
  url: string,
  apiKey: string | undefined,
  method: string,
  params?: unknown,
): Promise<unknown> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (apiKey) headers["authorization"] = `Bearer ${apiKey}`;
  const r = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
  });
  const text = await r.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`mcp non-json: ${text.slice(0, 200)}`);
  }
  const payload = isRecord(json) ? json : {};
  if (payload.error) {
    const error = isRecord(payload.error) ? payload.error : {};
    throw new Error(
      `mcp ${method} error: ${
        typeof error.message === "string"
          ? error.message
          : JSON.stringify(payload.error)
      }`,
    );
  }
  return payload.result;
}

app.post("/api/mcp/list", async (req, res) => {
  const { url, apiKey } = req.body ?? {};
  if (!url) return res.status(400).json({ ok: false, error: "missing url" });
  const t0 = Date.now();
  try {
    const result = await mcpRpc(url, apiKey, "tools/list");
    const resultRecord = isRecord(result) ? result : {};
    const tools = (Array.isArray(resultRecord.tools) ? resultRecord.tools : [])
      .filter(isRecord)
      .map((tool) => ({
        name: String(tool.name ?? ""),
        description:
          typeof tool.description === "string" ? tool.description : undefined,
        inputSchema: isRecord(tool.inputSchema)
          ? tool.inputSchema
          : undefined,
      }))
      .filter((tool) => tool.name) as Array<{
      name: string;
      description?: string;
      inputSchema?: Record<string, unknown>;
    }>;
    return res.json({ ok: true, tools, latencyMs: Date.now() - t0 });
  } catch (err) {
    return res.json({
      ok: false,
      error: (err as Error).message,
      latencyMs: Date.now() - t0,
    });
  }
});

app.post("/api/mcp/call", async (req, res) => {
  const { url, apiKey, name, arguments: args } = req.body ?? {};
  if (!url || !name)
    return res.status(400).json({ ok: false, error: "missing url or name" });
  const t0 = Date.now();
  try {
    const result = await mcpRpc(url, apiKey, "tools/call", {
      name,
      arguments: args ?? {},
    });
    return res.json({ ok: true, result, latencyMs: Date.now() - t0 });
  } catch (err) {
    return res.json({
      ok: false,
      error: (err as Error).message,
      latencyMs: Date.now() - t0,
    });
  }
});

/* --------------------------------------- /api/runtimes/test + proxy ---*/
/** Best-effort GET on a runtime endpoint to check reachability. */
app.post("/api/runtimes/test", async (req, res) => {
  const { url, apiKey } = req.body ?? {};
  if (!url) return res.status(400).json({ ok: false, error: "missing url" });
  const t0 = Date.now();
  try {
    const headers: Record<string, string> = {};
    if (apiKey) headers["authorization"] = `Bearer ${apiKey}`;
    const r = await fetch(url, { method: "GET", headers });
    const latencyMs = Date.now() - t0;
    const text = await r.text();
    return res.json({
      ok: r.ok,
      status: r.status,
      latencyMs,
      sample: text.slice(0, 200),
    });
  } catch (err) {
    return res.json({
      ok: false,
      error: (err as Error).message,
      latencyMs: Date.now() - t0,
    });
  }
});

/** Generic POST proxy for custom-runtime adapters. Returns text + parsed JSON if any. */
app.post("/api/runtimes/proxy", async (req, res) => {
  const { url, headers, payload, method } = req.body ?? {};
  if (!url) return res.status(400).json({ ok: false, error: "missing url" });
  const t0 = Date.now();
  try {
    const r = await fetch(url, {
      method: method || "POST",
      headers: { "content-type": "application/json", ...(headers || {}) },
      body: JSON.stringify(payload ?? {}),
    });
    const text = await r.text();
    let body: unknown = undefined;
    try {
      body = JSON.parse(text);
    } catch {
      /* not json */
    }
    return res.json({
      ok: r.ok,
      status: r.status,
      latencyMs: Date.now() - t0,
      text,
      body,
    });
  } catch (err) {
    return res.json({
      ok: false,
      error: (err as Error).message,
      latencyMs: Date.now() - t0,
    });
  }
});

app.listen(PORT, () => {
  process.stdout.write(`[perfectagent] api ready on http://127.0.0.1:${PORT}\n`);
});
