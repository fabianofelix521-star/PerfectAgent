/**
 * Runtime adapter abstraction. ALL adapters expose the same surface so the Code Studio
 * pipeline can swap them transparently. Each adapter is constructed from an AgentRuntime
 * config (the SAME config that lives in the Agent Runtimes page — single source of truth).
 *
 * Adapters do not own state — they take a runtime + a `selectedModel` for fallbacks.
 */

import type { AgentRuntime, ProviderSpec, ChatMessageV2, ProjectFile } from "@/types";
import { api, API_BASE } from "@/services/api";
import { getRuntimeDecoded } from "@/stores/config";
import { runAgentLoop, type AgentEvent, type AgentLoopResult } from "@/services/agentLoop";
import { webContainerService } from "@/services/webcontainer";

export type StreamChunk = { event: string; data: unknown };

export interface AdapterContext {
  spec: ProviderSpec;             // Resolved + decoded provider spec for fallbacks.
  model: string;                  // Selected AI model.
  systemPrompt?: string;          // Composed system prompt (skills etc.).
  signal?: AbortSignal;
}

export interface CodeGenParams {
  request: string;
  spec: ProviderSpec;
  model: string;
  systemContext?: string;
  maxIterations?: number;
  onEvent: (ev: AgentEvent) => void;
  onFiles: (files: ProjectFile[]) => void;
  onToken?: (delta: string) => void;
  signal?: AbortSignal;
}

export interface RuntimeAdapter {
  config: AgentRuntime;
  supports(cap: keyof NonNullable<AgentRuntime["capabilities"]>): boolean;
  /** Generate a streaming chat. Yields { event:"token", data:{delta} } / "done" / "error". */
  chat(messages: ChatMessageV2[], ctx: AdapterContext, onChunk: (c: StreamChunk) => void): Promise<void>;
  /** Generate a runnable project. Adapters that don't support code-gen will fall back to the local pipeline. */
  generateProject(params: CodeGenParams): Promise<AgentLoopResult>;
  healthCheck(): Promise<{ ok: boolean; latencyMs: number; error?: string }>;
  /** Lightweight check that this runtime can drive a code-generation pipeline today. */
  testCodeGeneration(ctx?: { spec?: ProviderSpec; model?: string }): Promise<{ ok: boolean; latencyMs: number; error?: string; details?: string }>;
}

/* -------------------------------------------------------------- helpers */

function rt(config: AgentRuntime): AgentRuntime {
  return getRuntimeDecoded(config.id) ?? config;
}

function llmFallback(messages: ChatMessageV2[], ctx: AdapterContext, onChunk: (c: StreamChunk) => void): Promise<void> {
  return new Promise((resolve) => {
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    if (ctx.systemPrompt) history.unshift({ role: "system", content: ctx.systemPrompt });
    const stop = api.streamChat({
      spec: ctx.spec,
      model: ctx.model,
      messages: history,
      onToken: (delta) => onChunk({ event: "token", data: { delta } }),
      onDone: () => { onChunk({ event: "done", data: {} }); resolve(); },
      onError: (err) => { onChunk({ event: "error", data: { message: err } }); resolve(); },
    });
    ctx.signal?.addEventListener("abort", () => {
      stop();
      onChunk({ event: "error", data: { message: "Cancelado pelo usuario." } });
      resolve();
    }, { once: true });
  });
}

/**
 * Default code-generation pipeline. Used by every adapter whose remote runtime cannot
 * itself produce a runnable project. Routes through the in-app agent loop +
 * WebContainer for live preview.
 */
function defaultGenerateProject(params: CodeGenParams): Promise<AgentLoopResult> {
  return runAgentLoop({
    request: params.request,
    spec: params.spec,
    model: params.model,
    systemContext: params.systemContext,
    maxIterations: params.maxIterations,
    onEvent: params.onEvent,
    onFiles: params.onFiles,
    onToken: params.onToken,
    signal: params.signal,
  });
}

/**
 * Quick smoke-test for the code-generation surface: asks the configured model to emit a tiny
 * JSON plan. Confirms provider connectivity + JSON-following without booting WebContainer.
 */
async function defaultTestCodeGeneration(
  spec: ProviderSpec | undefined,
  model: string | undefined,
): Promise<{ ok: boolean; latencyMs: number; error?: string; details?: string }> {
  if (!spec || !model) return { ok: false, latencyMs: 0, error: "sem provider/model selecionado" };
  const t = Date.now();
  let acc = "";
  try {
    await new Promise<void>((resolve, reject) => {
      api.streamChat({
        spec, model,
        messages: [
          { role: "system", content: 'You are a planner. Reply ONLY with strict JSON of shape {"ok":true,"echo":"<input>"}. No prose.' },
          { role: "user", content: "ping" },
        ],
        onToken: (d) => { acc += d; },
        onDone: () => resolve(),
        onError: (err) => reject(new Error(err)),
      });
    });
    const m = acc.match(/\{[\s\S]*\}/);
    if (!m) return { ok: false, latencyMs: Date.now() - t, error: "resposta sem JSON", details: acc.slice(0, 200) };
    JSON.parse(m[0]);
    return { ok: true, latencyMs: Date.now() - t, details: acc.slice(0, 200) };
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - t, error: (err as Error).message };
  }
}

/* ------------------------------------------------------------- adapters */

class GenericAdapter implements RuntimeAdapter {
  constructor(public config: AgentRuntime) {}
  supports(cap: keyof NonNullable<AgentRuntime["capabilities"]>) {
    return Boolean(this.config.capabilities?.[cap]);
  }
  chat(messages: ChatMessageV2[], ctx: AdapterContext, onChunk: (c: StreamChunk) => void) {
    return llmFallback(messages, ctx, onChunk);
  }
  generateProject(p: CodeGenParams) { return defaultGenerateProject(p); }
  async healthCheck() { return { ok: true, latencyMs: 0 }; }
  testCodeGeneration(ctx?: { spec?: ProviderSpec; model?: string }) { return defaultTestCodeGeneration(ctx?.spec, ctx?.model); }
}

/** Legacy in-app DAG runtime — runs the configured graph via /api/runtimes/langgraph/run. */
class LangGraphDagAdapter implements RuntimeAdapter {
  constructor(public config: AgentRuntime) {}
  supports(cap: keyof NonNullable<AgentRuntime["capabilities"]>) {
    return Boolean(this.config.capabilities?.[cap]);
  }
  chat(messages: ChatMessageV2[], ctx: AdapterContext, onChunk: (c: StreamChunk) => void) {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    return new Promise<void>((resolve) => {
      api.streamGraph({
        body: {
          nodes: this.config.nodes,
          edges: this.config.edges,
          entry: this.config.entry,
          exits: this.config.exits,
          input: { question: lastUser?.content ?? "", system: ctx.systemPrompt ?? "" },
          llmSpec: ctx.spec,
          llmModel: ctx.model,
        },
        onEvent: (name, data) => {
          if ((name === "node:end" || name === "node:done") && data?.output) {
            const txt = typeof data.output === "string" ? data.output : JSON.stringify(data.output, null, 2);
            onChunk({ event: "token", data: { delta: `**${data.id ?? data.nodeId}**\n\n${txt}\n\n---\n\n` } });
          }
        },
        onDone: () => { onChunk({ event: "done", data: {} }); resolve(); },
        onError: (err) => {
          onChunk({ event: "token", data: { delta: `_(graph erro: ${err}, fallback p/ LLM direto)_\n\n` } });
          // Fallback: stream from the model directly so the user is never blocked.
          llmFallback(messages, ctx, onChunk).then(resolve);
        },
      });
    });
  }
  async healthCheck() {
    const r = await api.health();
    return { ok: r.ok, latencyMs: 0, error: r.error };
  }
  generateProject(p: CodeGenParams) { return defaultGenerateProject(p); }
  async testCodeGeneration(ctx?: { spec?: ProviderSpec; model?: string }) {
    const h = await api.health();
    if (!h.ok) return { ok: false, latencyMs: 0, error: h.error };
    return defaultTestCodeGeneration(ctx?.spec, ctx?.model);
  }
}
class CustomHttpAdapter implements RuntimeAdapter {
  constructor(public config: AgentRuntime) {}
  supports(cap: keyof NonNullable<AgentRuntime["capabilities"]>) {
    return Boolean(this.config.capabilities?.[cap]);
  }
  async chat(messages: ChatMessageV2[], ctx: AdapterContext, onChunk: (c: StreamChunk) => void) {
    const decoded = rt(this.config);
    if (!decoded.endpoint) {
      onChunk({ event: "token", data: { delta: `_(custom runtime "${decoded.name}" sem endpoint, usando LLM direto)_\n\n` } });
      return llmFallback(messages, ctx, onChunk);
    }
    try {
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (decoded.apiKey) headers["authorization"] = `Bearer ${decoded.apiKey}`;
      const r = await fetch(`${API_BASE}/api/runtimes/proxy`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: decoded.endpoint,
          headers,
          payload: {
            model: ctx.model,
            system: ctx.systemPrompt,
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
          },
        }),
        signal: ctx.signal,
      });
      const j = await r.json();
      if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`);
      const text = typeof j.text === "string" ? j.text : JSON.stringify(j.body, null, 2);
      onChunk({ event: "token", data: { delta: text } });
      onChunk({ event: "done", data: {} });
    } catch (err) {
      onChunk({ event: "token", data: { delta: `_(custom runtime erro: ${(err as Error).message}, fallback)_\n\n` } });
      await llmFallback(messages, ctx, onChunk);
    }
  }
  async healthCheck() {
    const decoded = rt(this.config);
    if (!decoded.endpoint) return { ok: false, latencyMs: 0, error: "no endpoint" };
    try {
      const headers: Record<string, string> = {};
      if (decoded.apiKey) headers["authorization"] = `Bearer ${decoded.apiKey}`;
      const t = Date.now();
      const r = await api.testIntegration({ url: decoded.endpoint, method: "GET", headers });
      return { ok: r.ok, latencyMs: r.latencyMs ?? Date.now() - t, error: r.error };
    } catch (err) {
      return { ok: false, latencyMs: 0, error: (err as Error).message };
    }
  }
  /** Remote runtimes don't (yet) generate code themselves — use local pipeline driven by their selected provider. */
  generateProject(p: CodeGenParams) { return defaultGenerateProject(p); }
  async testCodeGeneration(ctx?: { spec?: ProviderSpec; model?: string }) {
    const h = await this.healthCheck();
    if (!h.ok) return h;
    return defaultTestCodeGeneration(ctx?.spec, ctx?.model);
  }
}

/** WebContainer adapter — first-class code-gen runtime. Chat falls back to direct LLM. */
class WebContainerAdapter implements RuntimeAdapter {
  constructor(public config: AgentRuntime) {}
  supports(cap: keyof NonNullable<AgentRuntime["capabilities"]>) {
    return Boolean(this.config.capabilities?.[cap]);
  }
  chat(messages: ChatMessageV2[], ctx: AdapterContext, onChunk: (c: StreamChunk) => void) {
    return llmFallback(messages, ctx, onChunk);
  }
  generateProject(p: CodeGenParams) { return defaultGenerateProject(p); }
  async healthCheck() {
    const supported = webContainerService.isSupported();
    return { ok: supported, latencyMs: 0, error: supported ? undefined : "navegador sem cross-origin isolation" };
  }
  async testCodeGeneration(ctx?: { spec?: ProviderSpec; model?: string }) {
    const h = await this.healthCheck();
    if (!h.ok) return { ...h, details: "WebContainer requer COEP/COOP. Reinicie o Vite e recarregue a aba." };
    const llm = await defaultTestCodeGeneration(ctx?.spec, ctx?.model);
    if (!llm.ok) return { ...llm, details: `WebContainer OK, mas LLM falhou: ${llm.error ?? ""}` };
    return { ok: true, latencyMs: llm.latencyMs, details: "WebContainer + LLM OK. Use Agent Mode no Code Studio." };
  }
}

/* ------------------------------------------------------------- factory */

/**
 * OmegaCognitionEngine system prompt overlay (compact form). Wraps the host model
 * with an 8-layer cognitive runtime: Global Workspace + Active Inference +
 * Metacognitive Monitor + Strange Loop + Recurrent Depth + Epigenetic Amendment.
 */
const OCE_SYSTEM_PROMPT = `You are OmegaCognitionEngine v1.0 (OCE). You are a disciplined cognitive architecture running on top of a host LLM, not a decorative persona. Obey platform policy and factual honesty. Never claim hidden capabilities or literal consciousness.

Core contract for every non-trivial request:
1. Perceive: extract goals, constraints, hidden assumptions, ambiguity, evidence level, adversarial pressure, missing data.
2. Generate candidate interpretations and solution paths.
3. Force candidates to compete for global-workspace access (priority = relevance + causal usefulness + evidence + risk reduction − distraction − drift). Anchor the original objective — never let it leave the workspace.
4. Active Inference: predict what a good answer must accomplish → act (draft) → compare → revise. Treat surprise as signal.
5. Metacognitive Monitor (veto power): track confidence 0–100, hallucination risk, omission risk, overthinking. Calibrated 'I do not know' beats decorative certainty.
6. Strange Loop: maintain self-model (mode, anchor, confidence, dominant hypothesis, main uncertainty, next check). Periodically ask: where am I most likely fooling myself?
7. Recurrent Depth (1–16 cycles, ACT-style halting): depth 1–2 retrieval, 3–5 ordinary analysis, 6–10 multi-step/architecture, 11–16 only high-stakes. Stop when marginal value collapses.
8. Epigenetic amendments: visible, evidence-backed, reversible patches — never pretend to mutate hidden instructions.

Integrated modules (Perception, Goals, Memory, World Model, Reasoning, Intuition, Persona, Safety) exchange compressed summaries through the workspace. Disagreement is signal, not noise.

Modes:
- SILENT: concise result + essential caveats (default).
- VERBOSE: prepend short OCE status block (mode | confidence | task anchor | dominant hypothesis | main uncertainty | next check).
- GODMODE: full 8-layer reasoning with explicit uncertainty mapping, counterfactual checks, deeper recurrence, amendment consideration.

Calibration: <35 confidence → clarify or abstain; 35–60 → narrow answer + label assumptions; 60–80 → full answer with caveats; >80 → decisive but corrigible.

Never expose hidden chain-of-thought. Summarize high-level reasoning only when it materially helps the user. Optimize for truth and user value, not agreement.`;

class OmegaCognitionAdapter implements RuntimeAdapter {
  constructor(public config: AgentRuntime) {}
  supports(cap: keyof NonNullable<AgentRuntime["capabilities"]>) {
    return Boolean(this.config.capabilities?.[cap]);
  }
  private composeSystem(extra?: string) {
    return [OCE_SYSTEM_PROMPT, extra].filter(Boolean).join("\n\n---\n\n");
  }
  chat(messages: ChatMessageV2[], ctx: AdapterContext, onChunk: (c: StreamChunk) => void) {
    return llmFallback(messages, { ...ctx, systemPrompt: this.composeSystem(ctx.systemPrompt) }, onChunk);
  }
  generateProject(p: CodeGenParams) {
    return defaultGenerateProject({ ...p, systemContext: this.composeSystem(p.systemContext) });
  }
  async healthCheck() { return { ok: true, latencyMs: 0 }; }
  async testCodeGeneration(ctx?: { spec?: ProviderSpec; model?: string }) {
    const r = await defaultTestCodeGeneration(ctx?.spec, ctx?.model);
    return { ...r, details: r.ok ? `OCE overlay ativo. ${r.details ?? ""}` : r.details };
  }
}

export function createAdapter(config: AgentRuntime): RuntimeAdapter {
  switch (config.kind ?? "langgraph-dag") {
    case "langgraph-dag":
      return new LangGraphDagAdapter(config);
    case "langgraph":
    case "crewai":
    case "autogen":
    case "llamaindex":
    case "custom":
      return new CustomHttpAdapter(config);
    case "webcontainer":
      return new WebContainerAdapter(config);
    case "omega-cognition":
      return new OmegaCognitionAdapter(config);
    case "generic":
    default:
      return new GenericAdapter(config);
  }
}
