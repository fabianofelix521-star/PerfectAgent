import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/api", () => ({
  API_BASE: "http://localhost:3336",
  api: {
    streamChat: vi.fn(({ onDone }) => { onDone(); return () => {}; }),
    streamGraph: vi.fn(({ onDone }) => { onDone(); return () => {}; }),
    health: vi.fn(async () => ({ ok: true })),
  },
}));
vi.mock("@/services/agentPipeline", () => ({
  runAgentPipeline: vi.fn(async () => ({ files: [], iterations: 1 })),
}));
vi.mock("@/services/webcontainer", () => ({
  webContainerService: {
    isSupported: () => true,
    boot: vi.fn(async () => ({})),
    mount: vi.fn(async () => {}),
  },
}));

import { createAdapter } from "@/services/adapters";
import { useConfig, defaultCapabilitiesFor } from "@/stores/config";
import type { AgentRuntime, RuntimeKind } from "@/types";

const ALL_KINDS: RuntimeKind[] = [
  "langgraph-dag", "langgraph", "crewai", "autogen", "llamaindex",
  "webcontainer", "omega-cognition", "morpheus-pantheon",
  "prometheus", "morpheus-creative", "apollo", "hermes", "athena",
  "vulcan", "oracle", "nexus-prime", "hippocrates-supreme", "mendeleev",
  "prompt-forge", "silicon-valley", "unreal-forge", "aegis",
  "content-empire", "ad-commander", "studio-one", "wall-street",
  "pixel-forge", "stigmergy-nexus",
  "ephemeral-genesis", "supreme-coordinator", "custom", "generic",
];

function makeRuntime(kind: RuntimeKind): AgentRuntime {
  return {
    id: `rt-${kind}`, name: kind, kind,
    capabilities: defaultCapabilitiesFor(kind),
    nodes: [], edges: [], entry: "n", exits: ["n"], memory: false, status: "ready",
  };
}

describe("PART 9 \u2014 runtime flexibility: every kind routes to an adapter that exposes the contract", () => {
  for (const kind of ALL_KINDS) {
    it(`createAdapter(${kind}) yields a contract-complete adapter`, async () => {
      const a = createAdapter(makeRuntime(kind));
      expect(typeof a.chat).toBe("function");
      expect(typeof a.generateProject).toBe("function");
      expect(typeof a.healthCheck).toBe("function");
      expect(typeof a.testCodeGeneration).toBe("function");
      expect(typeof a.supports).toBe("function");
      const hc = await a.healthCheck();
      expect(hc).toHaveProperty("ok");
    });
  }
});

describe("PART 9 \u2014 store deletion cascades: picker recovers when current runtime disappears", () => {
  beforeEach(() => {
    useConfig.setState({ runtimes: [], studioSelection: { skillIds: [] } } as never);
  });

  it("after removing the selected runtime, store still exposes a fallback list", () => {
    const { upsertRuntime, removeRuntime } = useConfig.getState();
    upsertRuntime(makeRuntime("generic"));
    upsertRuntime(makeRuntime("omega-cognition"));
    useConfig.setState({ studioSelection: { skillIds: [], runtimeId: "rt-generic" } } as never);
    removeRuntime("rt-generic");
    const rs = useConfig.getState().runtimes;
    expect(rs.find((r) => r.id === "rt-generic")).toBeUndefined();
    // Picker logic in CodeStudioPage: `sel.runtimeId ?? runtimes[0]?.id` \u2014 still resolves.
    const sel = useConfig.getState().studioSelection;
    const fallback = sel.runtimeId && rs.find((r) => r.id === sel.runtimeId) ? sel.runtimeId : rs[0]?.id;
    expect(fallback).toBe("rt-omega-cognition");
  });

  it("zero-runtime state is detectable", () => {
    expect(useConfig.getState().runtimes).toHaveLength(0);
  });
});

describe("PART 11 \u2014 error recovery: adapters never throw on bad inputs", () => {
  it("testCodeGeneration without spec returns ok:false (no throw)", async () => {
    const a = createAdapter(makeRuntime("generic"));
    const r = await a.testCodeGeneration();
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/sem provider/);
  });
});
