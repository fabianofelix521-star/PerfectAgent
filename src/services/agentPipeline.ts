/**
 * agentPipeline.ts — multi-step code-generation pipeline.
 *
 * Phases:
 *  1. plan     — LLM outputs a JSON manifest: { name, files: [{path, description}] }
 *  2. generate — LLM streams the full content of each file, one call per file.
 *  3. boot     — mount all files into WebContainer.
 *  4. install  — npm install inside the container.
 *  5. start    — run the dev server; capture preview URL.
 *  6. done / error
 *
 * Designed to be called from adapter.generateProject() so every RuntimeAdapter
 * can reuse the same local pipeline when its remote runtime cannot produce code.
 */

import type { ProjectFile, ProviderSpec } from "@/types";
import { api } from "@/services/api";
import { webContainerService } from "@/services/webcontainer";

/* ---------------------------------------------------------------- types */

export type PipelinePhase =
  | "plan"
  | "generate"
  | "boot"
  | "install"
  | "start"
  | "done"
  | "error";

export type PipelineEvent =
  | { type: "phase"; phase: PipelinePhase; message?: string }
  | { type: "token"; delta: string }
  | { type: "file"; path: string }
  | { type: "log"; message: string }
  | { type: "error"; message: string };

export interface PipelineResult {
  ok: boolean;
  files: ProjectFile[];
  previewUrl?: string;
  error?: string;
  durationMs: number;
}

export interface PipelineParams {
  request: string;
  spec: ProviderSpec;
  model: string;
  systemContext?: string;
  maxIterations?: number;
  onEvent: (ev: PipelineEvent) => void;
  onFiles: (files: ProjectFile[]) => void;
  signal?: AbortSignal;
}

/* ---------------------------------------------------------- helpers */

function streamToString(params: {
  spec: ProviderSpec;
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  onToken?: (delta: string) => void;
  signal?: AbortSignal;
}): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    if (params.signal?.aborted) {
      reject(new Error("Cancelado pelo usuário."));
      return;
    }
    let acc = "";
    const stop = api.streamChat({
      spec: params.spec,
      model: params.model,
      messages: params.messages,
      onToken: (delta) => {
        acc += delta;
        params.onToken?.(delta);
      },
      onDone: () => resolve(acc),
      onError: (err) => reject(new Error(err)),
    });
    params.signal?.addEventListener("abort", () => {
      stop();
      reject(new Error("Cancelado pelo usuário."));
    }, { once: true });
  });
}

function extractJson<T>(text: string): T | null {
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (!m) return null;
  try { return JSON.parse(m[1] ?? m[0]) as T; } catch { return null; }
}

function guessMime(path: string): string {
  if (path.endsWith(".ts") || path.endsWith(".tsx")) return "typescript";
  if (path.endsWith(".js") || path.endsWith(".jsx")) return "javascript";
  if (path.endsWith(".css")) return "css";
  if (path.endsWith(".html")) return "html";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".md")) return "markdown";
  return "plaintext";
}

const PLAN_SYSTEM = `You are a senior full-stack developer and project architect.
When the user describes an app, output ONLY a JSON object (no prose, no markdown wrapping):
{
  "name": "<short project name>",
  "description": "<one sentence>",
  "stack": "<e.g. React + Vite + Tailwind>",
  "files": [
    { "path": "package.json",     "description": "project dependencies" },
    { "path": "index.html",       "description": "HTML entry" },
    { "path": "vite.config.ts",   "description": "Vite config" },
    { "path": "src/main.tsx",     "description": "React entry" },
    { "path": "src/App.tsx",      "description": "root component" }
  ]
}
Keep the file list minimal but complete — typically 5-12 files for a React/Vite SPA.`;

const GEN_SYSTEM = `You are a senior developer writing production code.
Output ONLY the raw file content — no markdown fences, no prose, no explanation.
The content must be syntactically valid. Do not truncate.`;

/* ---------------------------------------------------------- main export */

export async function runAgentPipeline(params: PipelineParams): Promise<PipelineResult> {
  const t0 = Date.now();
  const { request, spec, model, systemContext, onEvent, onFiles, signal } = params;
  const emit = onEvent;

  try {
    /* ---- 1. Plan ---- */
    emit({ type: "phase", phase: "plan", message: "Planejando estrutura do projeto..." });

    const planMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: [PLAN_SYSTEM, systemContext].filter(Boolean).join("\n\n") },
      { role: "user", content: request },
    ];

    const planRaw = await streamToString({ spec, model, messages: planMessages, signal });

    interface FilePlan { path: string; description: string }
    interface Plan { name: string; description?: string; stack?: string; files: FilePlan[] }
    const plan = extractJson<Plan>(planRaw);
    if (!plan?.files?.length) {
      throw new Error(`Falha no plano: resposta inválida do modelo.\n${planRaw.slice(0, 400)}`);
    }

    emit({ type: "log", message: `Plano: ${plan.name} — ${plan.files.length} arquivos` });

    /* ---- 2. Generate files ---- */
    emit({ type: "phase", phase: "generate", message: `Gerando ${plan.files.length} arquivo(s)...` });

    const generatedFiles: ProjectFile[] = [];

    for (const filePlan of plan.files) {
      if (signal?.aborted) throw new Error("Cancelado pelo usuário.");
      emit({ type: "log", message: `Gerando ${filePlan.path}...` });

      const genMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: GEN_SYSTEM },
        {
          role: "user",
          content: [
            `Project: ${plan.name}`,
            `Description: ${plan.description ?? request}`,
            `Stack: ${plan.stack ?? "React + Vite + TypeScript + Tailwind"}`,
            ``,
            `Write the complete content for: ${filePlan.path}`,
            `Purpose: ${filePlan.description}`,
            ``,
            `Already generated files: ${generatedFiles.map((f) => f.path).join(", ") || "none"}`,
          ].join("\n"),
        },
      ];

      let content = "";
      await streamToString({
        spec,
        model,
        messages: genMessages,
        onToken: (delta) => {
          content += delta;
          emit({ type: "token", delta });
        },
        signal,
      });

      // Strip accidental markdown fences if the model wrapped output.
      const fenced = content.match(/^```[^\n]*\n([\s\S]*?)```\s*$/);
      if (fenced) content = fenced[1];

      generatedFiles.push({
        path: filePlan.path,
        content: content.trim(),
        language: guessMime(filePlan.path),
      });

      emit({ type: "file", path: filePlan.path });
    }

    onFiles(generatedFiles);

    /* ---- 3. Boot WebContainer ---- */
    emit({ type: "phase", phase: "boot", message: "Iniciando WebContainer..." });

    const bootResult = await webContainerService.boot();
    if (!bootResult.ok) {
      // Return files without preview if WebContainer isn't supported.
      emit({ type: "log", message: `WebContainer indisponível: ${bootResult.error ?? "sem cross-origin isolation"}. Arquivos gerados com sucesso.` });
      return { ok: true, files: generatedFiles, durationMs: Date.now() - t0 };
    }

    /* Mount files */
    const tree: Record<string, unknown> = {};
    for (const file of generatedFiles) {
      const parts = file.path.split("/");
      let node = tree;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!node[parts[i]]) node[parts[i]] = { directory: {} };
        node = (node[parts[i]] as { directory: Record<string, unknown> }).directory;
      }
      node[parts[parts.length - 1]] = { file: { contents: file.content } };
    }
    await webContainerService.mount(tree as Parameters<typeof webContainerService.mount>[0]);

    /* ---- 4. Install ---- */
    emit({ type: "phase", phase: "install", message: "Instalando dependências..." });

    const pkgFile = generatedFiles.find((f) => f.path === "package.json");
    const installResult = await webContainerService.installDeps(pkgFile?.content);
    if (!installResult.success) {
      emit({ type: "log", message: `npm install falhou (exit ${installResult.exitCode}). Continuando...` });
    }

    /* ---- 5. Start dev server ---- */
    emit({ type: "phase", phase: "start", message: "Iniciando servidor de desenvolvimento..." });

    let previewUrl: string | undefined;
    try {
      const serverResult = await webContainerService.startDevServer();
      previewUrl = serverResult.url;
      emit({ type: "log", message: `Preview disponível em ${previewUrl}` });
    } catch (err) {
      emit({ type: "log", message: `Servidor de dev falhou: ${(err as Error).message}` });
    }

    emit({ type: "phase", phase: "done" });
    return { ok: true, files: generatedFiles, previewUrl, durationMs: Date.now() - t0 };

  } catch (err) {
    const message = (err as Error).message;
    emit({ type: "phase", phase: "error", message });
    emit({ type: "error", message });
    return { ok: false, files: [], error: message, durationMs: Date.now() - t0 };
  }
}
