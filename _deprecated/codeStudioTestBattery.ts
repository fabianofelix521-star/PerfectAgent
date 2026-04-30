import { previewManager, type PreviewSession } from "@/services/previewManager";
import {
  createDeterministicProjectFiles,
  createImmediatePreviewProject,
} from "@/services/projectArtifacts";
import {
  normalizeAssistantOutput,
  normalizeMarkdown,
} from "@/services/normalize";
import { useConfig } from "@/stores/config";
import type { StudioProject } from "@/types";

export type GenerationTestResult = {
  id: string;
  projectName: string;
  prompt: string;
  providerId?: string;
  modelId?: string;
  runtimeId?: string;
  startedAt: number;
  firstPreviewAt?: number;
  timeToFirstPreviewMs?: number;
  timeToStaticPreviewMs?: number;
  timeToRuntimePreviewMs?: number;
  passed: boolean;
  failures: string[];
  generatedFiles: string[];
  previewMode?: string;
  previewUrl?: string;
  consoleErrors: string[];
  transcriptSample: string;
};

export type GenerationTestSpec = {
  id: string;
  projectName: string;
  prompt: string;
  checks: Array<{
    label: string;
    test: (
      project: StudioProject,
      session: PreviewSession,
      transcript: string,
    ) => boolean;
  }>;
};

const STORAGE_KEY = "perfectagent.codestudio.testResults.v1";

export const CODE_STUDIO_TEST_SPECS: GenerationTestSpec[] = [
  {
    id: "perfume-landing",
    projectName: "Perfume Landing Page",
    prompt:
      "Create a luxury perfume sales landing page in Portuguese with hero section, product showcase, brand story, testimonials, newsletter CTA, cart interaction, elegant gold/black visual style, responsive design, and smooth animations. Single-file HTML is acceptable if it enables faster preview.",
    checks: [
      {
        label: "Preview opens in iframe within 60 seconds",
        test: (_project, session) =>
          Boolean(
            session.firstPreviewAt &&
            (session.timeToFirstPreviewMs ?? Infinity) <= 60_000,
          ),
      },
      {
        label: "/index.html exists",
        test: (project) =>
          project.files.some((file) => file.path === "index.html"),
      },
      {
        label: "Hero section renders",
        test: (project) =>
          /<section class="hero"|Luxo que permanece|hero/i.test(
            project.files[0]?.content ?? "",
          ),
      },
      {
        label: "CTA button exists",
        test: (project) =>
          /<button[^>]*class="btn"|Adicionar ao carrinho|Quero acesso/i.test(
            project.files[0]?.content ?? "",
          ),
      },
      {
        label: "No raw plan JSON in main chat",
        test: (_project, _session, transcript) => !/plan\s*\{/.test(transcript),
      },
      {
        label: "Code block normalized",
        test: (_project, _session, transcript) => /```html/.test(transcript),
      },
    ],
  },
  {
    id: "saas-dashboard",
    projectName: "SaaS Dashboard",
    prompt:
      "Create a SaaS analytics dashboard with sidebar, top navigation, KPI cards, line chart placeholder, bar chart placeholder, data table with fake rows, status badges, dark theme, responsive layout, and interactive date filter.",
    checks: [
      {
        label: "Preview opens in iframe within 60 seconds",
        test: (_project, session) =>
          Boolean(
            session.firstPreviewAt &&
            (session.timeToFirstPreviewMs ?? Infinity) <= 60_000,
          ),
      },
      {
        label: "Generated files exist",
        test: (project) =>
          project.files.some((file) => file.path === "package.json") &&
          project.files.some((file) => file.path === "vite.config.ts") &&
          project.files.some((file) => file.path === "src/App.tsx"),
      },
      {
        label: "Sidebar/topbar visible",
        test: (project) =>
          /Executive Dashboard|SaaS analytics/i.test(joinFiles(project)),
      },
      {
        label: "KPI cards visible",
        test: (project) => /MRR|Users|Churn|NPS/i.test(joinFiles(project)),
      },
      {
        label: "Table visible",
        test: (project) => /<table>|<thead>|<tbody>/i.test(joinFiles(project)),
      },
      {
        label: "Sort and pagination controls exist",
        test: (project) =>
          /Sort ARR|Previous|Next|setPage|setSortKey/i.test(joinFiles(project)),
      },
      {
        label: "Chat output clean",
        test: (_project, _session, transcript) => !/act\s*\{/.test(transcript),
      },
    ],
  },
  {
    id: "interactive-3d-scene",
    projectName: "3D Interactive Scene",
    prompt:
      "Create an interactive 3D scene using React Three Fiber if available, or fallback to CSS/Canvas 3D if runtime dependencies are slow. Include a rotating object, lighting or visual depth, UI overlay, pause/play rotation button, and responsive full-screen preview.",
    checks: [
      {
        label: "Preview opens in iframe within 60 seconds",
        test: (_project, session) =>
          Boolean(
            session.firstPreviewAt &&
            (session.timeToFirstPreviewMs ?? Infinity) <= 60_000,
          ),
      },
      {
        label: "Scene or fallback visual renders",
        test: (project) => /<canvas|canvasRef|rotat/i.test(joinFiles(project)),
      },
      {
        label: "Pause/play button exists",
        test: (project) =>
          /Pause rotation|Play rotation|setPaused/i.test(joinFiles(project)),
      },
      {
        label: "Vite React TS files appear",
        test: (project) =>
          project.files.some((file) => file.path === "package.json") &&
          project.files.some((file) => file.path === "src/App.tsx") &&
          project.files.some((file) => file.path === "src/main.tsx"),
      },
      {
        label: "Chat formatting remains clean",
        test: (_project, _session, transcript) =>
          !/verify\s*\{/.test(transcript),
      },
    ],
  },
];

export async function runCodeStudioGenerationTest(
  spec: GenerationTestSpec,
): Promise<GenerationTestResult> {
  const state = useConfig.getState();
  const startedAt = Date.now();
  const providerId =
    state.studioSelection.providerId ?? state.settings.defaultProviderId;
  const modelId = state.studioSelection.model ?? state.settings.defaultModelId;
  const runtimeId =
    state.studioSelection.runtimeId ?? state.settings.defaultRuntimeId;
  const project = createImmediatePreviewProject(spec.prompt, {
    id: `test-${spec.id}-${startedAt.toString(36)}`,
    name: spec.projectName,
    now: startedAt,
  });
  project.files = createDeterministicProjectFiles(spec.prompt);
  project.activeFile = project.files[0]?.path ?? "index.html";

  previewManager.startCycle(project.id, startedAt);
  state.upsertProject(project);
  previewManager.prepareProject(
    project,
    "Test battery: opening immediate preview shell...",
  );
  const session = await previewManager.ensureFirstPreviewWithin60s(project);

  const normalized = normalizeAssistantOutput({
    raw: {
      plan: {
        output: {
          plan: `Generate ${spec.projectName} with a fast static shell first.`,
        },
      },
      act: {
        output: {
          act: `html\n${project.files[0]?.content.slice(0, 500) ?? ""}`,
        },
      },
      verify: {
        output: { verify: { summary: `${spec.projectName} preview ready.` } },
      },
    },
  });
  const transcriptSample = `${normalized.finalMarkdown}\n\n${normalizeMarkdown(`html\n${project.files[0]?.content.slice(0, 500) ?? ""}`)}`;

  const failures = spec.checks
    .filter((check) => !check.test(project, session, transcriptSample))
    .map((check) => check.label);

  const result: GenerationTestResult = {
    id: `${spec.id}-${startedAt.toString(36)}`,
    projectName: spec.projectName,
    prompt: spec.prompt,
    providerId,
    modelId,
    runtimeId,
    startedAt,
    firstPreviewAt: session.firstPreviewAt,
    timeToFirstPreviewMs: session.timeToFirstPreviewMs,
    timeToStaticPreviewMs:
      session.mode === "static-iframe" || session.mode === "fallback"
        ? session.timeToFirstPreviewMs
        : undefined,
    timeToRuntimePreviewMs:
      session.mode === "webcontainer" || session.mode === "external-runtime"
        ? session.timeToFirstPreviewMs
        : undefined,
    passed: failures.length === 0 && session.status !== "error",
    failures,
    generatedFiles: project.files.map((file) => file.path),
    previewMode: session.mode,
    previewUrl: session.url,
    consoleErrors: session.errors,
    transcriptSample,
  };

  saveGenerationTestResult(result);
  return result;
}

function joinFiles(project: StudioProject): string {
  return project.files.map((file) => file.content).join("\n\n");
}

export async function runCodeStudioTestBattery(
  onResult?: (result: GenerationTestResult) => void,
): Promise<GenerationTestResult[]> {
  const results: GenerationTestResult[] = [];
  for (const spec of CODE_STUDIO_TEST_SPECS) {
    const result = await runCodeStudioGenerationTest(spec);
    results.push(result);
    onResult?.(result);
  }
  saveGenerationTestResults(results);
  return results;
}

export function loadGenerationTestResults(): GenerationTestResult[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GenerationTestResult[]) : [];
  } catch {
    return [];
  }
}

export function saveGenerationTestResults(results: GenerationTestResult[]) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(results.slice(0, 20)));
}

function saveGenerationTestResult(result: GenerationTestResult) {
  const existing = loadGenerationTestResults().filter(
    (item) => item.projectName !== result.projectName,
  );
  saveGenerationTestResults([result, ...existing]);
}
