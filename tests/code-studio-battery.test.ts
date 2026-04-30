import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/webcontainer", () => ({
  webContainerService: {
    isSupported: () => false,
    boot: vi.fn(async () => ({ ok: false, error: "unsupported" })),
    onLog: vi.fn(() => () => {}),
    onPreviewError: vi.fn(() => () => {}),
    mount: vi.fn(),
    writeFile: vi.fn(),
    readFile: vi.fn(),
    installDeps: vi.fn(),
    startDevServer: vi.fn(),
    spawn: vi.fn(),
    teardown: vi.fn(),
  },
}));

vi.mock("@/services/api", () => ({
  API_BASE: "http://localhost:3336",
  api: {
    streamChat: vi.fn(({ onDone }: { onDone: () => void }) => {
      onDone();
      return () => {};
    }),
    health: vi.fn(async () => ({ ok: true })),
  },
}));

import { previewManager } from "@/services/previewManager";
import { extractProjectFiles } from "@/services/boltArtifact";
import { ensurePresetsRegistered, useConfig } from "@/stores/config";

const TEST_SPECS = [
  {
    id: "html-landing",
    name: "Single-File HTML Landing",
    prompt: "Create a single-file HTML landing page for a luxury perfume brand.",
    checks: {
      hasFiles: true,
      maxPreviewMs: 60_000,
    },
  },
  {
    id: "vite-dashboard",
    name: "Vite React Dashboard",
    prompt: "Create a Vite + React + TypeScript analytics dashboard with sidebar and charts.",
    checks: {
      hasFiles: true,
      maxPreviewMs: 60_000,
    },
  },
  {
    id: "3d-scene",
    name: "3D Interactive Scene",
    prompt: "Create a Vite + React + TypeScript 3D scene with rotating cube and controls.",
    checks: {
      hasFiles: true,
      maxPreviewMs: 60_000,
    },
  },
];

describe("Code Studio test battery", () => {
  beforeEach(() => {
    localStorage.clear();
    previewManager.reset();
    useConfig.setState({
      projects: [],
      activeProjectId: undefined,
      studioSelection: { skillIds: [] },
    } as never);
    ensurePresetsRegistered();
  });

  it("bolt artifact parser extracts files from structured output", () => {
    const raw = `<boltArtifact id="test" title="Test App">
  <boltAction type="file" filePath="index.html"><!doctype html><html><body><h1>Test</h1></body></html></boltAction>
  <boltAction type="file" filePath="package.json">{"name":"test"}</boltAction>
  <boltAction type="shell">npm install</boltAction>
</boltArtifact>`;
    const result = extractProjectFiles(raw);
    expect(result.method).toBe("bolt-artifact");
    expect(result.files.length).toBe(2);
    expect(result.shellCommands.length).toBe(1);
  });

  it("bolt artifact parser falls back to code fences", () => {
    const raw = '```html index.html\n<!doctype html><html></html>\n```';
    const result = extractProjectFiles(raw);
    expect(result.method).toBe("code-fences");
    expect(result.files.length).toBe(1);
  });

  it("preview manager tracks static preview timing", () => {
    previewManager.startCycle("test-project");
    expect(previewManager.getState().status).toBe("preparing");

    const srcDoc = "<!doctype html><html><body><h1>Test</h1></body></html>";
    previewManager.setStatic(srcDoc);
    const state = previewManager.getState();
    expect(state.status).toBe("running");
    expect(state.mode).toBe("static-iframe");
    expect(state.staticSrcDoc).toBe(srcDoc);
    expect(state.timeToStaticMs).toBeDefined();
    expect(state.timeToStaticMs!).toBeLessThan(5000);
  });

  it("preview manager tracks live preview timing", () => {
    previewManager.startCycle("test-project");
    previewManager.setLive("http://localhost:5173", 5173);
    const state = previewManager.getState();
    expect(state.status).toBe("running");
    expect(state.mode).toBe("webcontainer");
    expect(state.liveUrl).toBe("http://localhost:5173");
    expect(state.timeToLiveMs).toBeDefined();
  });

  for (const spec of TEST_SPECS) {
    it(`${spec.name}: preview cycle initializes correctly`, () => {
      const now = Date.now();
      previewManager.startCycle(`test-${spec.id}`);
      const state = previewManager.getState();
      expect(state.status).toBe("preparing");
      expect(state.startedAt).toBeGreaterThanOrEqual(now);
      expect(state.logs.length).toBeGreaterThan(0);
    });
  }
});
