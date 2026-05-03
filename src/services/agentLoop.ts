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
import { ModelRouter } from "@/core/ai/routing/ModelRouter";
import { useConfig } from "@/stores/config";

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
  providerId?: string;
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

/* ---- static-server injected when project has no npm dev server ---- */
const STATIC_SERVER_JS = `const http = require('http');
const fs = require('fs');
const path = require('path');
const port = process.env.PORT || 3000;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css',
  '.js': 'application/javascript', '.mjs': 'application/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.ttf': 'font/ttf', '.txt': 'text/plain',
};
http.createServer(function(req, res) {
  var urlPath = req.url.split('?')[0].split('#')[0];
  if (!urlPath || urlPath === '/') urlPath = '/index.html';
  var filePath = path.join(__dirname, urlPath);
  fs.readFile(filePath, function(err, data) {
    if (err) {
      fs.readFile(path.join(__dirname, 'index.html'), function(e2, d2) {
        if (e2) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(d2);
      });
      return;
    }
    var ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(port, function() { console.log('Server ready on port ' + port); });`;

/**
 * Ensures every project has a runnable dev server.
 * For static HTML projects (no package.json or no dev script + no npm deps),
 * injects a minimal Node-built-in static server so npm install can be skipped.
 */
function normalizeRunnableProject(files: ProjectFile[]): ProjectFile[] {
  const pkgFile = files.find((f) => f.path === "package.json");
  const hasIndexHtml = files.some((f) => f.path === "index.html" || f.path === "public/index.html");

  // Case 1: No package.json at all but has HTML → inject static server
  if (!pkgFile && hasIndexHtml) {
    return [
      ...files,
      {
        path: "package.json",
        content: JSON.stringify({ name: "project", version: "1.0.0", scripts: { dev: "node _serve.js" } }, null, 2),
        language: "json",
      },
      { path: "_serve.js", content: STATIC_SERVER_JS, language: "javascript" },
    ];
  }

  // Case 2: Has package.json, no dev script, no npm deps, has HTML → inject static server
  if (pkgFile && hasIndexHtml) {
    try {
      const pkg = JSON.parse(pkgFile.content) as Record<string, unknown>;
      const scripts = (pkg.scripts ?? {}) as Record<string, string>;
      const deps = Object.keys({ ...(pkg.dependencies as object ?? {}), ...(pkg.devDependencies as object ?? {}) });
      if (!scripts.dev && deps.length === 0) {
        const updatedPkg = { ...pkg, scripts: { ...scripts, dev: "node _serve.js" } };
        const updatedFiles = files.map((f) =>
          f.path === "package.json" ? { ...f, content: JSON.stringify(updatedPkg, null, 2) } : f,
        );
        if (files.some((f) => f.path === "_serve.js")) return updatedFiles;
        return [...updatedFiles, { path: "_serve.js", content: STATIC_SERVER_JS, language: "javascript" }];
      }
    } catch {
      /* malformed JSON — leave as-is, auto-fix will handle it */
    }
  }

  return files;
}

/** Returns true only when package.json has actual npm dependencies to install. */
function hasNpmDependencies(files: ProjectFile[]): boolean {
  const pkgFile = files.find((f) => f.path === "package.json");
  if (!pkgFile) return false;
  try {
    const pkg = JSON.parse(pkgFile.content) as Record<string, unknown>;
    return Object.keys({ ...(pkg.dependencies as object ?? {}), ...(pkg.devDependencies as object ?? {}) }).length > 0;
  } catch {
    return false;
  }
}

export async function runAgentLoop(params: AgentLoopParams): Promise<AgentLoopResult> {
  const {
    request,
    spec,
    providerId,
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
  const modelRouter = new ModelRouter();
  const appendTerminalChunk = (chunk: string) => {
    const lines = chunk.split(/\r?\n/).filter((line) => line.trim().length > 0);
    for (const line of lines) previewManager.appendLog(line);
  };

  try {
    /* ---- Phase 1: Stream AI response ---- */
    emit({ phase: "streaming", message: "Generating code...", level: "info" });

    const systemPrompt = [
      CODE_STUDIO_SYSTEM_PROMPT,
      systemContext,
    ].filter(Boolean).join("\n\n---\n\n");

    const cfgState = useConfig.getState();
    const routerSettings = cfgState.settings?.modelRouter;
    const shouldAutoRouteModel = Boolean(routerSettings?.enabled) && !providerId;
    const routedModel = shouldAutoRouteModel
      ? (await modelRouter.route({
          messages: [
            {
              id: `msg-${Date.now().toString(36)}`,
              role: "user",
              content: request,
              createdAt: Date.now(),
            },
          ],
          model,
          providerId: undefined,
          costOptimize: Boolean(routerSettings?.preferCost),
        })).model
      : model;

    const streamResponse = async (
      userContent: string,
      extraSystem?: string,
    ): Promise<string> => {
      let raw = "";
      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const stop = api.streamChat({
          spec,
          model: routedModel,
          messages: [
            {
              role: "system",
              content: [systemPrompt, extraSystem]
                .filter(Boolean)
                .join("\n\n---\n\n"),
            },
            { role: "user", content: userContent },
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
      return raw;
    };

    let raw = await streamResponse(request);

    if (signal?.aborted) throw new Error("aborted");

    /* ---- Phase 2: Parse artifacts ---- */
    emit({ phase: "parsing", message: "Parsing generated code...", level: "info" });
    let { files, method } = extractProjectFiles(raw);

    if (files.length === 0 && !signal?.aborted) {
      emit({
        phase: "parsing",
        message: "No artifact found. Retrying with strict Code Studio format...",
        level: "warn",
      });
      raw = await streamResponse(
        [
          request,
          "",
          "Your previous response did not include files. Reply again with ONLY a <boltArtifact> containing the complete runnable project files. Do not ask clarification questions.",
        ].join("\n"),
        "CRITICAL: Code Studio cannot use prose here. You must output <boltArtifact> and <boltAction type=\"file\"> elements with complete file contents.",
      );
      const retry = extractProjectFiles(raw);
      files = retry.files;
      method = retry.method;
    }

    if (files.length === 0) {
      emit({ phase: "failed", message: "No files generated", level: "error" });
      return { ok: false, files: [], iterations: 0, method: "none", error: "No files generated" };
    }

    allFiles = normalizeRunnableProject(files);
    onFiles(allFiles);
    emit({
      phase: "writing-files",
      message: `Writing ${allFiles.length} files...`,
      level: "success",
      detail: allFiles.map((f) => f.path).join(", "),
    });

    /* ---- Phase 3: Boot WebContainer + mount ---- */
    if (!webContainerService.isSupported()) {
      const message = webContainerService.formatUnsupportedMessage();
      emit({ phase: "failed", message, level: "error" });
      previewManager.setError(message);
      return { ok: false, files, iterations: 0, method, error: message };
    }

    emit({ phase: "writing-files", message: "Booting WebContainer...", level: "info" });
    previewManager.setBooting("Booting WebContainer...");
    const boot = await webContainerService.boot();
    if (!boot.ok) {
      emit({ phase: "failed", message: boot.error ?? "WebContainer boot failed", level: "error" });
      previewManager.setError(boot.error ?? "WebContainer boot failed");
      return { ok: false, files, iterations: 0, method, error: boot.error };
    }

    previewManager.setBooting("Mounting project files...");
    const tree = filesToWebContainerTree(allFiles);
    await webContainerService.mount(tree);
    emit({ phase: "writing-files", message: "Files mounted", level: "success" });

    /* ---- Phase 4: Install + dev server with self-heal loop ---- */
    let logs: string[] = [];
    const offLog = webContainerService.onLog((c) => {
      logs.push(c);
      appendTerminalChunk(c);
      if (logs.length > 400) logs = logs.slice(-200);
    });

    try {
      while (iteration < maxIterations) {
        if (signal?.aborted) throw new Error("aborted");
        iteration++;

        // Install deps — skip entirely when no npm dependencies are declared
        const pkgFile = allFiles.find((f) => f.path === "package.json");
        if (hasNpmDependencies(allFiles)) {
          emit({ phase: "installing", message: "Installing dependencies...", level: "info", iteration });
          previewManager.setBooting("Running npm install...");
          const installResult = await webContainerService.installDeps(pkgFile?.content);

          if (!installResult.success) {
            emit({ phase: "debugging", message: "Install failed, auto-fixing...", level: "warn", iteration });
            allFiles = await autoFixFile(allFiles, "package.json", logs, spec, routedModel, signal);
            onFiles(allFiles);
            await webContainerService.mount(filesToWebContainerTree(allFiles));
            continue;
          }

          emit({ phase: "installing", message: "Dependencies installed", level: "success", iteration });
        } else {
          emit({ phase: "installing", message: "No npm dependencies — skipping install.", level: "info", iteration });
        }

        // Start dev server
        emit({ phase: "starting-server", message: "Starting dev server...", level: "info", iteration });
        previewManager.setBooting("Running npm run dev...");
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
          allFiles = await autoFixFile(allFiles, culprit, logs, spec, routedModel, signal);
          onFiles(allFiles);
          await webContainerService.mount(filesToWebContainerTree(allFiles));
        }
      }

      emit({ phase: "failed", message: `Max iterations (${maxIterations}) reached`, level: "error" });
      offLog();
      previewManager.setError("Max self-heal iterations reached");
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
      previewManager.setError(msg);
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
