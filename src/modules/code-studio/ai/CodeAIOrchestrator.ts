/**
 * CodeAIOrchestrator — drives the end-to-end AI generation flow:
 *
 *   prompt → ContextBuilder → CodeGenerator (stream) → StreamParser
 *          → FileSystemManager (apply) → HotReloadManager
 *
 * On failure (build/runtime errors), runs an auto-fix loop that asks the
 * AI to repair the broken files (max N attempts).
 */
import { contextBuilder } from "./ContextBuilder";
import { codeGenerator } from "./CodeGenerator";
import { StreamParser } from "./StreamParser";
import { errorAnalyzer } from "./ErrorAnalyzer";
import { fileSystemManager } from "../engine/FileSystemManager";
import { hotReloadManager } from "../engine/HotReloadManager";
import { buildPipeline } from "../engine/BuildPipeline";
import type {
  AIMessage,
  GeneratedFile,
  GenerationState,
  GenerationStep,
  Project,
} from "../types";

export interface OrchestratorOptions {
  autoFix?: boolean;
  maxFixAttempts?: number;
  onStateChange?: (state: GenerationState) => void;
  onFileGenerated?: (file: GeneratedFile) => void;
  onComplete?: (summary: string) => void;
  onError?: (error: Error) => void;
}

let stepCounter = 0;
const stepId = () =>
  `gs_${Date.now().toString(36)}_${(++stepCounter).toString(36)}`;

export class CodeAIOrchestrator {
  private isGenerating = false;
  private currentState: GenerationState;
  private abortController: AbortController | null = null;

  constructor() {
    this.currentState = this.initialState();
  }

  async process(
    userMessage: string,
    project: Project,
    history: AIMessage[],
    options: OrchestratorOptions = {},
  ): Promise<void> {
    if (this.isGenerating) {
      throw new Error("A generation is already in progress.");
    }
    this.isGenerating = true;
    this.abortController = new AbortController();
    this.currentState = this.initialState();

    try {
      this.setState({ status: "thinking" }, options);
      const ctx = await contextBuilder.build({
        userMessage,
        project,
        conversationHistory: history,
      });

      const collectedFiles: GeneratedFile[] = [];
      const collectedCommands: string[] = [];
      let summary = "";

      const parser = new StreamParser();
      parser.onChunk((chunk) => {
        switch (chunk.type) {
          case "thinking":
            this.setState(
              {
                status: "planning",
                thinking: String(chunk.data ?? ""),
              },
              options,
            );
            break;
          case "plan_step": {
            const data = chunk.data as { description?: string };
            const step: GenerationStep = {
              id: stepId(),
              description: data?.description ?? "",
              status: "pending",
            };
            this.setState(
              {
                status: "planning",
                plan: [...this.currentState.plan, step],
              },
              options,
            );
            break;
          }
          case "file": {
            const file = chunk.data as GeneratedFile;
            collectedFiles.push(file);
            this.setState(
              {
                status: "generating",
                filesTotal: Math.max(
                  this.currentState.filesTotal,
                  collectedFiles.length,
                ),
                currentFile: file.path,
              },
              options,
            );
            // Apply asynchronously; errors handled below.
            void this.applyFile(file, options)
              .then(() => {
                this.setState(
                  {
                    filesComplete: this.currentState.filesComplete + 1,
                  },
                  options,
                );
              })
              .catch((err: unknown) => {
                const message =
                  err instanceof Error ? err.message : String(err);
                this.setState({ error: message }, options);
              });
            break;
          }
          case "command":
            collectedCommands.push(String(chunk.data ?? ""));
            break;
          case "summary":
            summary = String(chunk.data ?? "");
            break;
          case "error":
            // soft error from parser
            break;
        }
      });

      parser.onError((err) => {
        options.onError?.(err);
      });

      // Stream from the LLM.
      const stream = codeGenerator.generate(ctx.messages, {
        systemPrompt: ctx.systemPrompt,
        abortSignal: this.abortController.signal,
      });

      for await (const delta of stream) {
        parser.processChunk(delta);
      }
      parser.finalize();

      this.setState({ status: "applying" }, options);
      // Wait a tick for any in-flight applyFile() to resolve; we already
      // awaited each in sequence inside the chunk handler.
      await Promise.resolve();

      if (this.needsRebuild(collectedFiles)) {
        this.setState({ status: "installing" }, options);
        try {
          await buildPipeline.reinstall(project);
        } catch (err) {
          if (options.autoFix !== false) {
            const message = err instanceof Error ? err.message : String(err);
            await this.autoFixLoop([message], project, history, options, 1);
          } else {
            throw err;
          }
        }
      }

      this.setState(
        {
          status: "complete",
          currentFile: null,
        },
        options,
      );
      options.onComplete?.(summary);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.setState({ status: "error", error: error.message }, options);
      options.onError?.(error);
    } finally {
      this.isGenerating = false;
      this.abortController = null;
    }
  }

  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  getState(): GenerationState {
    return { ...this.currentState };
  }

  isRunning(): boolean {
    return this.isGenerating;
  }

  // -----------------------------------------------------------------------

  private async applyFile(
    file: GeneratedFile,
    _options: OrchestratorOptions,
  ): Promise<void> {
    if (file.action === "delete") {
      await fileSystemManager.deleteFile(file.path).catch(() => undefined);
      _options.onFileGenerated?.(file);
      return;
    }
    await fileSystemManager.applyOperations([
      { action: file.action, path: file.path, content: file.content },
    ]);
    hotReloadManager.notifyChange(file.path, file.content);
    _options.onFileGenerated?.(file);
  }

  private async autoFixLoop(
    errors: string[],
    project: Project,
    history: AIMessage[],
    options: OrchestratorOptions,
    attempt: number,
  ): Promise<void> {
    const max = options.maxFixAttempts ?? 3;
    if (attempt > max) {
      throw new Error(`Auto-fix gave up after ${max} attempts.`);
    }
    const analyzed = errorAnalyzer.analyzeMultiple(errors);
    if (analyzed.every((e) => !e.fixable)) {
      throw new Error("Errors are not auto-fixable.");
    }
    const allFiles = Object.entries(project.files).map(([path, content]) => ({
      path,
      content,
    }));
    const fixCtx = await errorAnalyzer.buildFixContext(analyzed, allFiles);

    await this.process(fixCtx.fixPrompt, project, history, {
      ...options,
      maxFixAttempts: max - attempt,
    });
  }

  private needsRebuild(files: GeneratedFile[]): boolean {
    return files.some((f) => /(^|\/)package\.json$/.test(f.path));
  }

  private initialState(): GenerationState {
    return {
      status: "idle",
      thinking: "",
      plan: [],
      filesTotal: 0,
      filesComplete: 0,
      currentFile: null,
      error: null,
    };
  }

  private setState(
    partial: Partial<GenerationState>,
    options?: OrchestratorOptions,
  ): void {
    this.currentState = { ...this.currentState, ...partial };
    options?.onStateChange?.({ ...this.currentState });
  }
}

export const codeAIOrchestrator = new CodeAIOrchestrator();
