import { beforeEach, describe, expect, it } from "vitest";
import { ensurePresetsRegistered, useConfig, defaultCapabilitiesFor } from "@/stores/config";
import {
  getModelOptions,
  getProviderOptions,
  resolveModelId,
  resolveProviderId,
  resolveRuntimeId,
} from "@/services/configSelectors";
import type { AgentRuntime } from "@/types";

function resetStore() {
  useConfig.setState({
    providers: {},
    models: [],
    runtimes: [],
    projects: [],
    activeProjectId: undefined,
    chatThreads: [],
    activeChatThreadId: undefined,
    chatSelection: { skillIds: [] },
    studioSelection: { skillIds: [], agentMode: false },
  } as never);
  ensurePresetsRegistered();
}

function runtime(id: string): AgentRuntime {
  return {
    id,
    name: id,
    kind: "generic",
    capabilities: defaultCapabilitiesFor("generic"),
    nodes: [],
    edges: [],
    entry: "start",
    exits: ["start"],
    memory: false,
    status: "ready",
  };
}

describe("store smoke harness", () => {
  beforeEach(() => resetStore());

  it("settings save and selectors resolve provider/model defaults", () => {
    const state = useConfig.getState();
    state.setProviderEnabled("ollama-local", true);
    state.setSettings({ defaultProviderId: "ollama-local", defaultModelId: "llama3.2" });

    const next = useConfig.getState();
    const providerId = resolveProviderId(next.chatSelection.providerId, next.settings.defaultProviderId, next.providers);
    const modelId = resolveModelId(next.chatSelection.model, next.settings.defaultModelId, providerId, next.providers, next.models);

    expect(getProviderOptions(next.providers).map((p) => p.id)).toContain("ollama-local");
    expect(getModelOptions("ollama-local", next.providers, next.models).map((m) => m.id)).toContain("llama3.2");
    expect(providerId).toBe("ollama-local");
    expect(modelId).toBe("llama3.2");
  });

  it("runtime page changes are reflected by shared picker resolution", () => {
    const state = useConfig.getState();
    state.upsertRuntime(runtime("rt-a"));
    state.upsertRuntime(runtime("rt-b"));
    state.setDefaultRuntime("rt-b");
    expect(resolveRuntimeId(undefined, useConfig.getState().settings.defaultRuntimeId, useConfig.getState().runtimes)).toBe("rt-b");

    useConfig.getState().setStudioSelection({ runtimeId: "rt-b" });
    useConfig.getState().removeRuntime("rt-b");
    const next = useConfig.getState();
    expect(next.studioSelection.runtimeId).toBeUndefined();
    expect(resolveRuntimeId(next.studioSelection.runtimeId, next.settings.defaultRuntimeId, next.runtimes)).toBe("rt-a");
  });

  it("normal chat send state persists in the central chat store", () => {
    const thread = { id: "chat-a", title: "A", skillIds: [], messages: [], createdAt: Date.now() };
    useConfig.getState().addChatThread(thread);
    useConfig.getState().appendChatMessage("chat-a", { id: "m1", role: "user", content: "hello", createdAt: Date.now() });
    useConfig.getState().appendChatMessage("chat-a", { id: "m2", role: "assistant", content: "", createdAt: Date.now(), streaming: true });
    useConfig.getState().patchChatMessage("chat-a", "m2", { content: "world", streaming: false });

    const active = useConfig.getState().chatThreads.find((item) => item.id === "chat-a");
    expect(active?.messages.map((message) => message.content)).toEqual(["hello", "world"]);
  });

  it("project file edits persist through the project store", () => {
    useConfig.getState().upsertProject({
      id: "p1",
      name: "Project",
      files: [{ path: "index.html", content: "<h1>Old</h1>", language: "html" }],
      activeFile: "index.html",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    useConfig.getState().updateProjectFile("p1", "index.html", "<h1>New</h1>");
    expect(useConfig.getState().projects[0].files[0].content).toBe("<h1>New</h1>");
  });
});
