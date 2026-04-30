/**
 * Agent Loop — Streaming code generation with self-healing
 *
 * 1. Build context (system prompt + file state + conversation + skills)
 * 2. Stream response from selected model/provider
 * 3. Parse <boltArtifact> in real-time as it streams
 * 4. Write files to WebContainer as they appear
 * 5. Execute shell commands in sequence
 * 6. Auto-fix failures (max 8 iterations)
 * 7. Wait for server-ready → update preview
 */
import { api } from "@/services/api";
import { webContainerService } from "@/services/webcontainer";
import { previewManager, filesToWebContainerTree } from "@/services/previewManager";
import {
  CODE_STUDIO_SYSTEM_PROMPT,
  extractProjectFiles,
} from "@/services/boltArtifact";
import type { ProviderSpec, ProjectFile } from "@/types";

export type AgentPhase =
  | "idle"
  | "streaming"
  | "parsing"
  | "writing-files"
  | "installing"
  | "starting-server"
  | "preview-ready"
  | "debugging"
  | "complete"
  | "failed";

export interface AgentEvent {
  phase: AgentPhase;
  message: string;
  detail?: string;
  level?: "info" | "warn" | "error" | "success";
  iteration?: number;
}

export interface AgentLoopParams {
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

export interface AgentLoopResult {
  ok: boolean;
  files: ProjectFile[];
  previewUrl?: string;
  error?: string;
  iterations: number;
  method: "bolt-artifact" | "code-fences" | "none";
}

const MAX_SELF_HEAL = 8;

export async function runAgentLoop(params: AgentLoopParams): Promise<AgentLoopResult> {
  const {
    request,
    spec,
    model,
    systemContext,
    maxIterations = MAX_SELF_HEAL,
    onEvent,
    onFiles,
    onToken,
    signal,
  } = params;

  const emit = (ev: AgentEvent) => onEvent(ev);
  let iteration = 0;
  let allFiles: ProjectFile[] = [];

  try {
    /* ---- Phase 1: Stream AI response ---- */
    emit({ phase: "streaming", message: "Generating code...", level: "info" });

    const systemPrompt = [
      CODE_STUDIO_SYSTEM_PROMPT,
      systemContext,
    ].filter(Boolean).join("\n\n---\n\n");

    let raw = "";
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const stop = api.streamChat({
        spec,
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: request },
        ],
        onToken: (delta) => {
          raw += delta;
          onToken?.(delta);
        },
        onDone: () => { if (!settled) { settled = true; resolve(); } },
        onError: (err) => { if (!settled) { settled = true; reject(new Error(err)); } },
      });
      signal?.addEventListener("abort", () => {
        stop();
        if (!settled) { settled = true; reject(new Error("aborted")); }
      }, { once: true });
    });

    if (signal?.aborted) throw new Error("aborted");

    /* ---- Phase 2: Parse artifacts ---- */
    emit({ phase: "parsing", message: "Parsing generated code...", level: "info" });
    const { files, method } = extractProjectFiles(raw);

    if (files.length === 0) {
      emit({ phase: "failed", message: "No files generated", level: "error" });
      return { ok: false, files: [], iterations: 0, method: "none", error: "No files generated" };
    }

    allFiles = files;
    onFiles(files);
    emit({
      phase: "writing-files",
      message: `Writing ${files.length} files...`,
      level: "success",
      detail: files.map((f) => f.path).join(", "),
    });

    /* ---- Phase 3: Boot WebContainer + mount ---- */
    if (!webContainerService.isSupported()) {
      emit({ phase: "complete", message: "Files generated (WebContainer unavailable)", level: "warn" });
      return { ok: true, files, iterations: 0, method };
    }

    emit({ phase: "writing-files", message: "Booting WebContainer...", level: "info" });
    const boot = await webContainerService.boot();
    if (!boot.ok) {
      emit({ phase: "failed", message: boot.error ?? "WebContainer boot failed", level: "error" });
      return { ok: false, files, iterations: 0, method, error: boot.error };
    }

    const tree = filesToWebContainerTree(files);
    await webContainerService.mount(tree);
    emit({ phase: "writing-files", message: "Files mounted", level: "success" });

    /* ---- Phase 4: Install + dev server with self-heal loop ---- */
    let logs: string[] = [];
    const offLog = webContainerService.onLog((c) => {
      logs.push(c);
      if (logs.length > 400) logs = logs.slice(-200);
    });

    try {
      while (iteration < maxIterations) {
        if (signal?.aborted) throw new Error("aborted");
        iteration++;

        // Install deps
        emit({ phase: "installing", message: "Installing dependencies...", level: "info", iteration });
        const pkgFile = files.find((f) => f.path === "package.json");
        const installResult = await webContainerService.installDeps(pkgFile?.content);

        if (!installResult.success) {
          emit({ phase: "debugging", message: "Install failed, auto-fixing...", level: "warn", iteration });
          allFiles = await autoFixFile(files, "package.json", logs, spec, model, signal);
          onFiles(allFiles);
          continue;
        }

        emit({ phase: "installing", message: "Dependencies installed", level: "success", iteration });

        // Start dev server
        emit({ phase: "starting-server", message: "Starting dev server...", level: "info", iteration });
        try {
          const server = await webContainerService.startDevServer("dev");
          previewManager.setLive(server.url, server.port);
          emit({ phase: "preview-ready", message: `Preview ready at ${server.url}`, level: "success" });
          offLog();
          return { ok: true, files: allFiles, previewUrl: server.url, iterations: iteration, method };
        } catch (err) {
          const errMsg = (err as Error).message;
          emit({ phase: "debugging", message: "Dev server failed, auto-fixing...", level: "warn", iteration, detail: errMsg });
          // Identify culprit file from logs
          const culprit = identifyCulpritFile(logs, allFiles);
          allFiles = await autoFixFile(allFiles, culprit, logs, spec, model, signal);
          onFiles(allFiles);
        }
      }

      emit({ phase: "failed", message: `Max iterations (${maxIterations}) reached`, level: "error" });
      offLog();
      return { ok: false, files: allFiles, iterations: iteration, method, error: "Max self-heal iterations reached" };
    } finally {
      offLog();
    }
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === "aborted") {
      emit({ phase: "failed", message: "Cancelled by user", level: "warn" });
    } else {
      emit({ phase: "failed", message: msg, level: "error" });
    }
    return { ok: false, files: allFiles, iterations: iteration, method: "none", error: msg };
  }
}

/* ---- helpers ---- */

async function autoFixFile(
  files: ProjectFile[],
  targetPath: string,
  logs: string[],
  spec: ProviderSpec,
  model: string,
  signal?: AbortSignal,
): Promise<ProjectFile[]> {
  const target = files.find((f) => f.path === targetPath);
  if (!target) return files;

  const recentLogs = logs.slice(-120).join("");
  let fixed = "";
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const stop = api.streamChat({
      spec,
      model,
      messages: [
        {
          role: "system",
          content: `You are a DEBUGGER. Given a file and error logs, output the FULL corrected file content. Output ONLY the file contents. No prose. No fences. Make minimal surgical fixes.`,
        },
        {
          role: "user",
          content: `File: ${targetPath}\nCurrent contents:\n${target.content}\n\nError logs:\n${recentLogs}\n\nReturn the corrected full file.`,
        },
      ],
      onToken: (d) => { fixed += d; },
      onDone: () => { if (!settled) { settled = true; resolve(); } },
      onError: (err) => { if (!settled) { settled = true; reject(new Error(err)); } },
    });
    signal?.addEventListener("abort", () => { stop(); if (!settled) { settled = true; reject(new Error("aborted")); } }, { once: true });
  });

  // Strip code fences if present
  const fence = fixed.match(/```(?:[a-z]+)?\s*([\s\S]*?)```/i);
  const content = (fence ? fence[1] : fixed).trim();

  if (!content) return files;

  const idx = files.findIndex((f) => f.path === targetPath);
  const updated = [...files];
  if (idx >= 0) {
    updated[idx] = { ...updated[idx], content };
  } else {
    updated.push({ path: targetPath, content, language: target.language });
  }

  // Write to WebContainer
  try {
    await webContainerService.writeFile(targetPath, content);
  } catch { /* noop */ }

  return updated;
}

function identifyCulpritFile(logs: string[], files: ProjectFile[]): string {
  const recent = logs.slice(-80).join("");
  // Look for file paths in error logs
  const match = recent.match(/\b(src\/[A-Za-z0-9_.\-/]+\.(?:jsx?|tsx?|css|html))\b/);
  if (match && files.some((f) => f.path === match[1])) return match[1];
  // Default to App file
  const appFile = files.find((f) => /App\.(tsx|jsx|js)$/.test(f.path));
  return appFile?.path ?? "src/App.tsx";
}
