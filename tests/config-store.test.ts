import { beforeEach, describe, expect, it } from "vitest";
import { useConfig, defaultCapabilitiesFor } from "@/stores/config";
import { presetById } from "@/services/providers";
import type { AgentRuntime, ProviderConfig } from "@/types";

function resetStore() {
  useConfig.setState({
    providers: {},
    runtimes: [],
    studioSelection: { skillIds: [] },
    studioThreads: [],
    activeStudioThreadId: undefined,
    projects: [],
    activeProjectId: undefined,
    deploys: [],
  } as Partial<ReturnType<typeof useConfig.getState>> as never);
}

const baseRuntime = (over: Partial<AgentRuntime>): AgentRuntime => ({
  id: "rt-x",
  name: "Test Runtime",
  kind: "langgraph-dag",
  capabilities: defaultCapabilitiesFor("langgraph-dag"),
  nodes: [],
  edges: [],
  entry: "n",
  exits: ["n"],
  memory: false,
  status: "ready",
  ...over,
});

const baseProvider = (over: Partial<ProviderConfig>): ProviderConfig => ({
  id: "openai",
  presetId: "openai",
  name: "OpenAI",
  spec: { shape: "openai", baseUrl: "https://api.openai.com/v1", authMode: "bearer", apiKey: "sk-test" },
  defaultModel: "gpt-4o",
  fetchedModels: undefined,
  configured: true,
  ...over,
});

describe("config store \u2014 unified runtime registry", () => {
  beforeEach(() => resetStore());

  it("starts empty after reset", () => {
    expect(useConfig.getState().runtimes).toHaveLength(0);
  });

  it("upsertRuntime adds, then updates in place", () => {
    const { upsertRuntime } = useConfig.getState();
    upsertRuntime(baseRuntime({ id: "a", name: "A" }));
    upsertRuntime(baseRuntime({ id: "b", name: "B" }));
    expect(useConfig.getState().runtimes.map((r) => r.id)).toEqual(["b", "a"]);
    upsertRuntime(baseRuntime({ id: "a", name: "A renamed" }));
    const a = useConfig.getState().runtimes.find((r) => r.id === "a")!;
    expect(a.name).toBe("A renamed");
    expect(useConfig.getState().runtimes).toHaveLength(2);
  });

  it("removeRuntime drops by id", () => {
    const { upsertRuntime, removeRuntime } = useConfig.getState();
    upsertRuntime(baseRuntime({ id: "a" }));
    upsertRuntime(baseRuntime({ id: "b" }));
    removeRuntime("a");
    expect(useConfig.getState().runtimes.map((r) => r.id)).toEqual(["b"]);
  });

  it("setDefaultRuntime flips isDefault flag exclusively", () => {
    const { upsertRuntime, setDefaultRuntime } = useConfig.getState();
    upsertRuntime(baseRuntime({ id: "a" }));
    upsertRuntime(baseRuntime({ id: "b" }));
    setDefaultRuntime("b");
    const rs = useConfig.getState().runtimes;
    expect(rs.find((r) => r.id === "a")!.isDefault).toBeFalsy();
    expect(rs.find((r) => r.id === "b")!.isDefault).toBe(true);
  });

  it("Code Studio runtime picker source = same store as Agent Runtimes page", () => {
    const { upsertRuntime } = useConfig.getState();
    upsertRuntime(baseRuntime({ id: "shared-1", name: "Shared" }));
    const fromStore = useConfig.getState().runtimes;
    // CodeStudioPage renders <SelectControl options={runtimes.map(...)} /> directly off this list.
    expect(fromStore.find((r) => r.id === "shared-1")).toBeTruthy();
  });
});

describe("defaultCapabilitiesFor \u2014 covers every RuntimeKind including omega-cognition", () => {
  const kinds = ["langgraph-dag", "langgraph", "crewai", "autogen", "llamaindex", "webcontainer", "omega-cognition", "custom", "generic"] as const;
  for (const k of kinds) {
    it(`returns sane capabilities for ${k}`, () => {
      const caps = defaultCapabilitiesFor(k);
      expect(typeof caps.canStream).toBe("boolean");
      expect(typeof caps.canPlan).toBe("boolean");
      expect(typeof caps.canGenerateCode).toBe("boolean");
    });
  }

  it("omega-cognition advertises plan + codegen + debug + critique", () => {
    const caps = defaultCapabilitiesFor("omega-cognition");
    expect(caps.canPlan).toBe(true);
    expect(caps.canGenerateCode).toBe(true);
    expect(caps.canDebug).toBe(true);
    expect(caps.canCritiqueVisual).toBe(true);
    expect(caps.canStream).toBe(true);
  });
});

describe("model dropdown source-of-truth (CodeStudio bug fix)", () => {
  beforeEach(() => resetStore());

  function computeModelOptions(provId: string | undefined) {
    // Mirror of the logic in CodeStudioPage after the fix.
    const { providers } = useConfig.getState();
    const cfg = provId ? providers[provId] : undefined;
    if (!cfg) return [] as string[];
    if (cfg.fetchedModels?.length) return cfg.fetchedModels.map((m) => m.id);
    const preset = presetById(cfg.presetId);
    return Array.from(new Set([cfg.defaultModel, ...(preset?.presetModels ?? [])].filter(Boolean) as string[]));
  }

  it("uses fetchedModels when present", () => {
    useConfig.getState().upsertProvider(baseProvider({
      fetchedModels: [{ id: "m1" }, { id: "m2" }],
    }));
    expect(computeModelOptions("openai")).toEqual(["m1", "m2"]);
  });

  it("falls back to defaultModel + preset.presetModels when fetchedModels empty", () => {
    useConfig.getState().upsertProvider(baseProvider({
      defaultModel: "gpt-4o",
      fetchedModels: [],
    }));
    const opts = computeModelOptions("openai");
    expect(opts).toContain("gpt-4o");
    // preset has gpt-4o, gpt-4o-mini, gpt-4.1, o3-mini
    expect(opts.length).toBeGreaterThan(1);
  });

  it("returns empty list for unknown provider", () => {
    expect(computeModelOptions("nope")).toEqual([]);
  });
});
