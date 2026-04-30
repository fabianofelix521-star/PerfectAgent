import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock heavy deps before importing adapters
vi.mock("@/services/api", () => ({
  API_BASE: "http://localhost:3336",
  api: {
    streamChat: vi.fn(({ messages, onToken, onDone }) => {
      // Echo back system prompt so tests can verify OCE prepending
      const sys = messages.find((m: { role: string }) => m.role === "system");
      onToken(`SYS:${sys?.content?.slice(0, 32) ?? "none"}`);
      onDone();
      return () => {};
    }),
    streamGraph: vi.fn(({ onDone }) => { onDone(); return () => {}; }),
    health: vi.fn(async () => ({ ok: true })),
    testRuntime: vi.fn(async () => ({ ok: true, latencyMs: 1 })),
  },
}));
vi.mock("@/services/agentLoop", () => ({
  runAgentLoop: vi.fn(async (p: { systemContext?: string }) => ({
    ok: true,
    files: [],
    iterations: 1,
    method: "bolt-artifact",
    capturedSystemContext: p.systemContext,
  })),
}));
vi.mock("@/services/webcontainer", () => ({ webContainerService: { mount: vi.fn(), boot: vi.fn() } }));
vi.mock("@/stores/config", async () => {
  const actual = await vi.importActual<typeof import("@/stores/config")>("@/stores/config");
  return { ...actual, getRuntimeDecoded: (id: string) => actual.useConfig.getState().runtimes.find((r) => r.id === id) };
});

import { createAdapter } from "@/services/adapters";
import { defaultCapabilitiesFor } from "@/stores/config";
import type { AgentRuntime, ChatMessageV2, ProviderSpec } from "@/types";

const spec: ProviderSpec = { shape: "openai", baseUrl: "x", apiKey: "k" };

function makeRuntime(over: Partial<AgentRuntime>): AgentRuntime {
  return {
    id: "rt", name: "rt", kind: "generic",
    capabilities: defaultCapabilitiesFor(over.kind ?? "generic"),
    nodes: [], edges: [], entry: "n", exits: ["n"], memory: false, status: "ready",
    ...over,
  };
}

describe("createAdapter factory", () => {
  it("returns GenericAdapter for kind=generic", () => {
    const a = createAdapter(makeRuntime({ kind: "generic" }));
    expect(a.config.kind).toBe("generic");
  });
  it("returns OmegaCognitionAdapter for kind=omega-cognition", () => {
    const a = createAdapter(makeRuntime({ kind: "omega-cognition" }));
    expect(a.config.kind).toBe("omega-cognition");
  });
  it("falls back to GenericAdapter for unknown kind", () => {
    const a = createAdapter(makeRuntime({ kind: undefined }));
    expect(a).toBeTruthy();
  });
});

describe("OmegaCognitionAdapter", () => {
  let chunks: { event: string; data: unknown }[];
  beforeEach(() => { chunks = []; });

  it("prepends OCE system prompt when chatting", async () => {
    const a = createAdapter(makeRuntime({ kind: "omega-cognition" }));
    const msgs: ChatMessageV2[] = [{ id: "1", role: "user", content: "hi", createdAt: 0 }];
    await a.chat(msgs, { spec, model: "test", systemPrompt: "USER_SYS" }, (c) => chunks.push(c));
    const tokenChunk = chunks.find((c) => c.event === "token");
    expect(tokenChunk).toBeTruthy();
    // The mock echoes the system prompt prefix; OCE wrapper must be there
    expect(JSON.stringify(tokenChunk)).toContain("OmegaCognitionEngine");
  });

  it("composes OCE prompt with empty user system context too", async () => {
    const a = createAdapter(makeRuntime({ kind: "omega-cognition" }));
    await a.chat([], { spec, model: "test" }, (c) => chunks.push(c));
    expect(JSON.stringify(chunks)).toContain("OmegaCognitionEngine");
  });

  it("generateProject forwards composed system context to pipeline", async () => {
    const { runAgentLoop } = await import("@/services/agentLoop");
    const a = createAdapter(makeRuntime({ kind: "omega-cognition" }));
    await a.generateProject({
      request: "build x", spec, model: "test",
      systemContext: "extra-context",
      onEvent: () => {}, onFiles: () => {},
    });
    const call = (runAgentLoop as unknown as { mock: { calls: unknown[][] } }).mock.calls.at(-1)!;
    const arg = call[0] as { systemContext: string };
    expect(arg.systemContext).toContain("OmegaCognitionEngine");
    expect(arg.systemContext).toContain("extra-context");
  });

  it("healthCheck returns ok without network", async () => {
    const a = createAdapter(makeRuntime({ kind: "omega-cognition" }));
    expect((await a.healthCheck()).ok).toBe(true);
  });

  it("supports() reflects configured capabilities", () => {
    const a = createAdapter(makeRuntime({ kind: "omega-cognition" }));
    expect(a.supports("canPlan")).toBe(true);
    expect(a.supports("canGenerateCode")).toBe(true);
    expect(a.supports("supportsLivePreview")).toBe(false);
  });
});

describe("GenericAdapter", () => {
  it("calls llmFallback (no OCE prompt injected)", async () => {
    const chunks: { event: string; data: unknown }[] = [];
    const a = createAdapter(makeRuntime({ kind: "generic" }));
    await a.chat(
      [{ id: "1", role: "user", content: "hi", createdAt: 0 }],
      { spec, model: "test", systemPrompt: "BARE" },
      (c) => chunks.push(c),
    );
    expect(JSON.stringify(chunks)).toContain("BARE");
    expect(JSON.stringify(chunks)).not.toContain("OmegaCognitionEngine");
  });
});
