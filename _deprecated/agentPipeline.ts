/**
 * Agent Pipeline — Planner → Architect → Coder → Executor → Observer → (Critic)
 *
 * Each phase emits structured events so the UI can render a progress panel.
 * The pipeline uses the user-selected provider/model via `api.streamChat`
 * and the WebContainer service for execution + preview.
 *
 * The whole pipeline is provider-agnostic: it asks the LLM for strict JSON
 * outputs at the planning/architecting steps, then iterates file-by-file.
 */
import { api } from "@/services/api";
import { webContainerService, type FileSystemTree } from "@/services/webcontainer";
import type { ProviderSpec, ProjectFile } from "@/types";

export type PhaseId =
  | "planning"
  | "architecting"
  | "coding"
  | "executing"
  | "installing"
  | "preview"
  | "debugging"
  | "critiquing"
  | "complete"
  | "failed";

export interface PipelineEvent {
  phase: PhaseId;
  message: string;
  detail?: string;
  level?: "info" | "warn" | "error" | "success";
  iteration?: number;
}

export interface PlanDoc {
  goal: string;
  type: "vite-react" | "static-html" | "node-script";
  features: string[];
  techStack: string[];
  files: Array<{ path: string; purpose: string }>;
}

export interface PipelineParams {
  request: string;
  spec: ProviderSpec;
  model: string;
  systemContext?: string;     // skills + extra instructions
  maxIterations?: number;     // default 6
  onEvent: (ev: PipelineEvent) => void;
  onFiles: (files: ProjectFile[]) => void;
  signal?: AbortSignal;
}

export interface PipelineResult {
  ok: boolean;
  files: ProjectFile[];
  previewUrl?: string;
  error?: string;
  plan?: PlanDoc;
  iterations: number;
}

/* ----------------------------------------------------------------- helpers */

async function llmJSON<T>(
  spec: ProviderSpec,
  model: string,
  system: string,
  user: string,
  signal?: AbortSignal,
): Promise<{ raw: string; parsed?: T; error?: string }> {
  let acc = "";
  await new Promise<void>((resolve, reject) => {
    const stop = api.streamChat({
      spec, model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      onToken: (delta) => { acc += delta; },
      onDone: () => resolve(),
      onError: (err) => reject(new Error(err)),
    });
    signal?.addEventListener("abort", () => { stop(); reject(new Error("aborted")); });
  });
  // Extract a JSON block (allow ```json fences or raw).
  const fenced = acc.match(/```json\s*([\s\S]*?)```/i) ?? acc.match(/```\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : acc;
  try {
    const parsed = JSON.parse(candidate.trim()) as T;
    return { raw: acc, parsed };
  } catch (err) {
    // Try to find a balanced { ... } region.
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try { return { raw: acc, parsed: JSON.parse(candidate.slice(start, end + 1)) as T }; }
      catch { /* fallthrough */ }
    }
    return { raw: acc, error: (err as Error).message };
  }
}

async function llmCode(
  spec: ProviderSpec,
  model: string,
  system: string,
  user: string,
  signal?: AbortSignal,
): Promise<string> {
  let acc = "";
  await new Promise<void>((resolve, reject) => {
    const stop = api.streamChat({
      spec, model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      onToken: (delta) => { acc += delta; },
      onDone: () => resolve(),
      onError: (err) => reject(new Error(err)),
    });
    signal?.addEventListener("abort", () => { stop(); reject(new Error("aborted")); });
  });
  // Strip markdown code fences if present.
  const fence = acc.match(/```(?:[a-z]+)?\s*([\s\S]*?)```/i);
  return (fence ? fence[1] : acc).trim();
}

function filesToTree(files: ProjectFile[]): FileSystemTree {
  const root: FileSystemTree = {};
  for (const f of files) {
    const parts = f.path.split("/").filter(Boolean);
    let cur: FileSystemTree = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const dir = parts[i];
      if (!cur[dir]) cur[dir] = { directory: {} };
      const node = cur[dir] as { directory: FileSystemTree };
      cur = node.directory;
    }
    const fileName = parts[parts.length - 1];
    cur[fileName] = { file: { contents: f.content } };
  }
  return root;
}

function defaultViteScaffold(): ProjectFile[] {
  return [
    {
      path: "package.json",
      content: JSON.stringify({
        name: "preview-app",
        private: true,
        version: "0.0.0",
        type: "module",
        scripts: { dev: "vite --host 0.0.0.0", build: "vite build", preview: "vite preview" },
        dependencies: { react: "^18.3.1", "react-dom": "^18.3.1" },
        devDependencies: { "@vitejs/plugin-react": "^4.3.4", vite: "^5.4.10" },
      }, null, 2),
      language: "json",
    },
    {
      path: "vite.config.js",
      content: `import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react";\nexport default defineConfig({ plugins: [react()], server: { host: true } });\n`,
      language: "javascript",
    },
    {
      path: "index.html",
      content: `<!doctype html>\n<html><head><meta charset=\"utf-8\"/><title>Preview</title></head><body><div id=\"root\"></div><script type=\"module\" src=\"/src/main.jsx\"></script></body></html>\n`,
      language: "html",
    },
    {
      path: "src/main.jsx",
      content: `import React from "react";\nimport { createRoot } from "react-dom/client";\nimport App from "./App.jsx";\ncreateRoot(document.getElementById("root")).render(<App />);\n`,
      language: "javascript",
    },
  ];
}

/* ----------------------------------------------------------------- phases */

const PLANNER_SYSTEM = `You are PLANNER, a senior software architect.
Given a user request, produce a STRICT JSON plan to build a runnable browser app inside a WebContainer.
Constraints:
- Stack: Vite + React 18 + plain JavaScript (NO TypeScript) for fastest install in WebContainer.
- Inline CSS or use a single src/styles.css file (NO Tailwind, NO extra build steps).
- Keep dependencies minimal (react, react-dom). Add others ONLY if absolutely needed.
- Target a single-page app. No router unless requested.

Output JSON with this shape (no commentary, no markdown fences):
{
  "goal": "string (1 sentence summary)",
  "type": "vite-react",
  "features": ["..."],
  "techStack": ["vite","react"],
  "files": [{ "path": "src/App.jsx", "purpose": "..." }, { "path": "src/styles.css", "purpose": "..." }]
}

Rules:
- ALWAYS include "src/App.jsx" and "src/styles.css".
- 3 to 8 files total.
- File paths use forward slashes, no leading slash.`;

const ARCHITECT_SYSTEM = `You are ARCHITECT. Refine the file list. Output the SAME JSON shape as PLANNER but with concrete, well-scoped purposes per file. Keep it minimal.`;

const CODER_SYSTEM = `You are CODER. Generate the full content of a single file for a Vite + React 18 (JavaScript, NOT TypeScript) project running inside a WebContainer.
Rules:
- Output ONLY the file contents. No markdown fences. No prose.
- Use modern React 18 patterns (function components, hooks).
- Self-contained imports. Do not invent dependencies that aren't in package.json.
- For src/App.jsx: import "./styles.css" if styles.css exists in the plan.
- Make the UI visually polished using plain CSS (gradients, shadows, spacing, system fonts).
- All event handlers must be safe (no errors on first render).`;

const DEBUGGER_SYSTEM = `You are DEBUGGER. Given an error log from a WebContainer dev server and the current file contents, output the FULL fixed content of the SINGLE FILE that needs the most urgent fix.
Rules:
- Output ONLY the file contents. No prose, no fences.
- Make minimal, surgical changes. Preserve existing structure.`;

/* ----------------------------------------------------------------- runner */

export async function runAgentPipeline(p: PipelineParams): Promise<PipelineResult> {
  const maxIter = p.maxIterations ?? 6;
  const emit = (ev: PipelineEvent) => p.onEvent(ev);
  let iteration = 0;
  let files: ProjectFile[] = [];

  try {
    /* ---------- Phase 1: Plan ---------- */
    emit({ phase: "planning", message: "Planejando arquitetura...", level: "info" });
    const planRes = await llmJSON<PlanDoc>(p.spec, p.model,
      [PLANNER_SYSTEM, p.systemContext].filter(Boolean).join("\n\n"),
      `User request:\n${p.request}`, p.signal);
    if (!planRes.parsed) {
      emit({ phase: "planning", message: "Falha ao parsear plano, usando fallback", level: "warn", detail: planRes.error });
    }
    const plan: PlanDoc = planRes.parsed ?? {
      goal: p.request,
      type: "vite-react",
      features: [],
      techStack: ["vite", "react"],
      files: [{ path: "src/App.jsx", purpose: "App root" }, { path: "src/styles.css", purpose: "global styles" }],
    };
    emit({ phase: "planning", message: `Plano: ${plan.goal}`, level: "success", detail: plan.files.map((f) => f.path).join(", ") });

    /* ---------- Phase 2: Architect (refine) ---------- */
    emit({ phase: "architecting", message: "Refinando estrutura...", level: "info" });
    const refined = await llmJSON<PlanDoc>(p.spec, p.model, ARCHITECT_SYSTEM,
      `Original request:\n${p.request}\n\nDraft plan:\n${JSON.stringify(plan, null, 2)}`, p.signal);
    const finalPlan: PlanDoc = refined.parsed ?? plan;
    emit({ phase: "architecting", message: `${finalPlan.files.length} arquivos`, level: "success" });

    /* ---------- Phase 3: Code ---------- */
    files = defaultViteScaffold();
    p.onFiles(files);
    for (const f of finalPlan.files) {
      if (p.signal?.aborted) throw new Error("aborted");
      // Skip scaffolded files unless plan wants to override (App.jsx common case → we replace).
      if (!/\.(jsx?|tsx?|css|html|json|md)$/i.test(f.path)) continue;
      emit({ phase: "coding", message: `Gerando ${f.path}...`, level: "info" });
      try {
        const content = await llmCode(p.spec, p.model, CODER_SYSTEM,
          `Project goal: ${finalPlan.goal}\nFeatures: ${finalPlan.features.join(", ")}\nFile to write: ${f.path}\nPurpose: ${f.purpose}\nFull file list: ${finalPlan.files.map((x) => x.path).join(", ")}\n\nReturn the COMPLETE file contents only.`,
          p.signal);
        const language = f.path.endsWith(".css") ? "css" : f.path.endsWith(".html") ? "html" : f.path.endsWith(".json") ? "json" : "javascript";
        const idx = files.findIndex((x) => x.path === f.path);
        if (idx >= 0) files[idx] = { path: f.path, content, language };
        else files.push({ path: f.path, content, language });
        p.onFiles([...files]);
      } catch (err) {
        emit({ phase: "coding", message: `Falha ao gerar ${f.path}`, level: "warn", detail: (err as Error).message });
      }
    }

    /* ---------- Phase 4: Boot WebContainer + mount ---------- */
    emit({ phase: "executing", message: "Inicializando WebContainer...", level: "info" });
    const boot = await webContainerService.boot();
    if (!boot.ok) {
      emit({ phase: "failed", message: "WebContainer indisponivel", level: "error", detail: boot.error });
      return { ok: false, files, error: boot.error, plan: finalPlan, iterations: iteration };
    }

    const tree = filesToTree(files);
    await webContainerService.mount(tree);
    emit({ phase: "executing", message: "Arquivos montados", level: "success" });

    /* ---------- Phase 5: Install + dev server with debug loop ---------- */
    let logs: string[] = [];
    const offLog = webContainerService.onLog((c) => { logs.push(c); if (logs.length > 400) logs = logs.slice(-200); });

    try {
      while (iteration < maxIter) {
        if (p.signal?.aborted) throw new Error("aborted");
        iteration += 1;
        emit({ phase: "installing", message: "npm install...", level: "info", iteration });
        const inst = await webContainerService.installDeps();
        if (!inst.success) {
          emit({ phase: "debugging", message: "Falha no install, tentando corrigir package.json", level: "warn", iteration });
          const recent = logs.slice(-80).join("");
          const fixed = await llmCode(p.spec, p.model, DEBUGGER_SYSTEM,
            `File: package.json\nCurrent contents:\n${files.find((f) => f.path === "package.json")?.content ?? ""}\n\nError logs:\n${recent}\n\nReturn the corrected full package.json.`,
            p.signal);
          const idx = files.findIndex((f) => f.path === "package.json");
          if (idx >= 0) {
            files[idx] = { ...files[idx], content: fixed };
            await webContainerService.writeFile("package.json", fixed);
            p.onFiles([...files]);
          }
          continue;
        }
        emit({ phase: "preview", message: "Iniciando dev server...", level: "info", iteration });
        try {
          const ds = await webContainerService.startDevServer("dev");
          emit({ phase: "complete", message: `Preview pronto em ${ds.url}`, level: "success" });
          offLog();
          return { ok: true, files, previewUrl: ds.url, plan: finalPlan, iterations: iteration };
        } catch (err) {
          emit({ phase: "debugging", message: "Dev server falhou, analisando", level: "warn", iteration, detail: (err as Error).message });
          const recent = logs.slice(-120).join("");
          // Identify a likely culprit file from logs.
          const fileMatch = recent.match(/\b(src\/[A-Za-z0-9_.\-/]+\.(?:jsx?|tsx?|css|html))\b/);
          const target = fileMatch?.[1] ?? "src/App.jsx";
          const cur = files.find((f) => f.path === target);
          if (!cur) continue;
          const fixed = await llmCode(p.spec, p.model, DEBUGGER_SYSTEM,
            `File: ${target}\nCurrent contents:\n${cur.content}\n\nError logs:\n${recent}\n\nReturn the corrected full file.`,
            p.signal);
          const idx = files.findIndex((f) => f.path === target);
          files[idx] = { ...files[idx], content: fixed };
          await webContainerService.writeFile(target, fixed);
          p.onFiles([...files]);
        }
      }
      emit({ phase: "failed", message: `Max iterations (${maxIter}) sem sucesso`, level: "error" });
      return { ok: false, files, error: "max iterations", plan: finalPlan, iterations: iteration };
    } finally {
      offLog();
    }
  } catch (err) {
    const message = (err as Error).message;
    if (message === "aborted") {
      emit({ phase: "failed", message: "Cancelado pelo usuario", level: "warn" });
    } else {
      emit({ phase: "failed", message, level: "error" });
    }
    return { ok: false, files, error: message, iterations: iteration };
  }
}
