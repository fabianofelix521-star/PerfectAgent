/**
 * StreamParser — incremental parser for the JSON stream produced by the
 * Code AI. Extracts files (and other top-level fields) as soon as they
 * become parseable, without waiting for the whole document.
 *
 * Strategy:
 *   1. Strip code fences if the model wraps the JSON in markdown.
 *   2. Locate top-level keys ("thinking", "plan", "files", ...) by scanning
 *      the buffer with a brace/quote-aware tokenizer.
 *   3. For "files", emit each complete `{ ... }` element of the array
 *      as it closes.
 *   4. On `finalize()`, attempt a full JSON parse to recover the canonical
 *      AICodeResponse and surface any missing pieces.
 */
import type {
  AICodeResponse,
  AIPlanStep,
  GeneratedFile,
  GeneratedFileAction,
} from "../types";

export interface ParsedChunk {
  type: "thinking" | "plan_step" | "file" | "command" | "summary" | "error";
  data: unknown;
}

type ChunkListener = (chunk: ParsedChunk) => void;
type CompleteListener = (response: AICodeResponse) => void;
type ErrorListener = (error: Error) => void;

interface WorkerSnapshot {
  thinking: string | null;
  parsedFilesCount: number;
  emittedPlanSteps: number;
  emittedSummary: string | null;
  emittedCommandsCount: number;
}

type WorkerChunkPayload = {
  type: "CHUNK";
  data: ParsedChunk;
};

type WorkerBufferPayload = {
  type: "BUFFER_UPDATE";
  data: { buffer: string; snapshot?: WorkerSnapshot };
};

type WorkerCompletePayload = {
  type: "COMPLETE";
  data: { parsed: AICodeResponse; snapshot?: WorkerSnapshot };
};

type WorkerErrorPayload = {
  type: "ERROR";
  data: { message?: string };
};

type StreamWorkerPayload =
  | WorkerChunkPayload
  | WorkerBufferPayload
  | WorkerCompletePayload
  | WorkerErrorPayload;

export class StreamParser {
  private worker: Worker | null = null;
  private buffer = "";
  private readonly chunkListeners: ChunkListener[] = [];
  private readonly completeListeners: CompleteListener[] = [];
  private readonly errorListeners: ErrorListener[] = [];

  private parsedFilesCount = 0;
  private nextFileSearchFrom = 0;

  private emittedThinking: string | null = null;
  private emittedPlanSteps = 0;
  private emittedSummary: string | null = null;
  private emittedCommandsCount = 0;

  constructor() {
    this.initWorker();
  }

  private initWorker(): void {
    try {
      this.worker = new Worker(
        new URL("../workers/streamProcessor.worker.ts", import.meta.url),
        { type: "module" },
      );

      this.worker.onmessage = (event: MessageEvent<StreamWorkerPayload>) => {
        const payload = event.data;
        switch (payload.type) {
          case "CHUNK":
            this.emit(payload.data);
            break;
          case "BUFFER_UPDATE":
            this.buffer = payload.data.buffer;
            if (payload.data.snapshot) this.syncSnapshot(payload.data.snapshot);
            break;
          case "COMPLETE":
            if (payload.data.snapshot) this.syncSnapshot(payload.data.snapshot);
            for (const l of this.completeListeners) {
              try {
                l(payload.data.parsed);
              } catch {
                /* noop */
              }
            }
            break;
          case "ERROR": {
            const err = new Error(
              payload.data.message ?? "Failed to parse stream in worker.",
            );
            for (const l of this.errorListeners) {
              try {
                l(err);
              } catch {
                /* noop */
              }
            }
            break;
          }
        }
      };

      this.worker.onerror = () => {
        this.worker = null;
      };
    } catch {
      this.worker = null;
    }
  }

  private syncSnapshot(snapshot: WorkerSnapshot): void {
    this.emittedThinking = snapshot.thinking;
    this.parsedFilesCount = snapshot.parsedFilesCount;
    this.emittedPlanSteps = snapshot.emittedPlanSteps;
    this.emittedSummary = snapshot.emittedSummary;
    this.emittedCommandsCount = snapshot.emittedCommandsCount;
  }

  processChunk(chunk: string): void {
    if (!chunk) return;

    if (this.worker) {
      this.worker.postMessage({
        type: "PROCESS_CHUNK",
        data: { chunk, buffer: this.buffer },
      });
      return;
    }

    this.processChunkMainThread(chunk);
  }

  private processChunkMainThread(chunk: string): void {
    this.buffer += chunk;
    this.tryExtractThinking();
    this.tryExtractPlanSteps();
    this.tryExtractFiles();
    this.tryExtractCommands();
    this.tryExtractSummary();
  }

  finalize(): void {
    if (this.worker) {
      this.worker.postMessage({
        type: "FINALIZE",
        data: { buffer: this.buffer },
      });
      return;
    }

    const parsed = this.parseComplete();
    if (parsed) {
      // Backfill anything we missed during streaming.
      if (this.emittedThinking === null && parsed.thinking) {
        this.emit({ type: "thinking", data: parsed.thinking });
      }
      for (let i = this.emittedPlanSteps; i < parsed.plan.length; i++) {
        this.emit({ type: "plan_step", data: parsed.plan[i] });
      }
      for (let i = this.parsedFilesCount; i < parsed.files.length; i++) {
        this.emit({ type: "file", data: parsed.files[i] });
      }
      for (let i = this.emittedCommandsCount; i < parsed.commands.length; i++) {
        this.emit({ type: "command", data: parsed.commands[i] });
      }
      if (this.emittedSummary === null && parsed.summary) {
        this.emit({ type: "summary", data: parsed.summary });
      }
      for (const l of this.completeListeners) {
        try {
          l(parsed);
        } catch {
          /* noop */
        }
      }
    } else {
      const err = new Error("Failed to parse final AI response as JSON.");
      for (const l of this.errorListeners) {
        try {
          l(err);
        } catch {
          /* noop */
        }
      }
    }
  }

  reset(): void {
    this.buffer = "";

    if (this.worker) {
      this.worker.postMessage({ type: "RESET" });
    }

    this.parsedFilesCount = 0;
    this.nextFileSearchFrom = 0;
    this.emittedThinking = null;
    this.emittedPlanSteps = 0;
    this.emittedSummary = null;
    this.emittedCommandsCount = 0;
  }

  onChunk(listener: ChunkListener): () => void {
    this.chunkListeners.push(listener);
    return () => {
      const idx = this.chunkListeners.indexOf(listener);
      if (idx >= 0) this.chunkListeners.splice(idx, 1);
    };
  }

  onComplete(listener: CompleteListener): () => void {
    this.completeListeners.push(listener);
    return () => {
      const idx = this.completeListeners.indexOf(listener);
      if (idx >= 0) this.completeListeners.splice(idx, 1);
    };
  }

  onError(listener: ErrorListener): () => void {
    this.errorListeners.push(listener);
    return () => {
      const idx = this.errorListeners.indexOf(listener);
      if (idx >= 0) this.errorListeners.splice(idx, 1);
    };
  }

  destroy(): void {
    this.worker?.terminate();
    this.worker = null;
  }

  // -----------------------------------------------------------------------
  // Field-specific extractors
  // -----------------------------------------------------------------------

  private tryExtractThinking(): void {
    if (this.emittedThinking !== null) return;
    const value = this.extractStringField("thinking");
    if (value !== null) {
      this.emittedThinking = value;
      this.emit({ type: "thinking", data: value });
    }
  }

  private tryExtractSummary(): void {
    if (this.emittedSummary !== null) return;
    const value = this.extractStringField("summary");
    if (value !== null) {
      this.emittedSummary = value;
      this.emit({ type: "summary", data: value });
    }
  }

  private tryExtractPlanSteps(): void {
    const arrStart = this.findArrayStart("plan");
    if (arrStart < 0) return;
    const items = this.extractCompleteObjectsFromArray(arrStart);
    for (let i = this.emittedPlanSteps; i < items.length; i++) {
      const obj = this.safeJsonParse<{ step?: number; description?: string }>(
        items[i],
      );
      if (!obj) continue;
      const planStep: AIPlanStep = {
        step: typeof obj.step === "number" ? obj.step : i + 1,
        description: typeof obj.description === "string" ? obj.description : "",
      };
      this.emit({ type: "plan_step", data: planStep });
      this.emittedPlanSteps = i + 1;
    }
  }

  private tryExtractCommands(): void {
    const arrStart = this.findArrayStart("commands");
    if (arrStart < 0) return;
    const items = this.extractCompleteStringsFromArray(arrStart);
    for (let i = this.emittedCommandsCount; i < items.length; i++) {
      this.emit({ type: "command", data: items[i] });
      this.emittedCommandsCount = i + 1;
    }
  }

  private tryExtractFiles(): void {
    const arrStart = this.findArrayStart("files");
    if (arrStart < 0) return;
    const startSearch = Math.max(this.nextFileSearchFrom, arrStart + 1);
    const items = this.extractCompleteObjectsFromArray(arrStart, startSearch);
    for (let i = this.parsedFilesCount; i < items.length; i++) {
      const obj = this.safeJsonParse<Partial<GeneratedFile>>(items[i]);
      if (!obj || typeof obj.path !== "string") {
        this.parsedFilesCount = i + 1;
        continue;
      }
      const file: GeneratedFile = {
        path: obj.path,
        action: this.normalizeAction(obj.action),
        description: typeof obj.description === "string" ? obj.description : "",
        content: this.sanitizeFileContent(
          typeof obj.content === "string" ? obj.content : "",
        ),
      };
      this.emit({ type: "file", data: file });
      this.parsedFilesCount = i + 1;
    }
  }

  private parseComplete(): AICodeResponse | null {
    const cleaned = this.cleanJsonBuffer(this.buffer);
    const parsed = this.safeJsonParse<Partial<AICodeResponse>>(cleaned);
    if (!parsed) return this.bestEffortReconstruct();
    return {
      thinking: typeof parsed.thinking === "string" ? parsed.thinking : "",
      plan: Array.isArray(parsed.plan)
        ? parsed.plan.map((p, i) => ({
            step: typeof p?.step === "number" ? p.step : i + 1,
            description:
              typeof p?.description === "string" ? p.description : "",
          }))
        : [],
      files: Array.isArray(parsed.files)
        ? parsed.files
            .filter(
              (f): f is GeneratedFile => !!f && typeof f.path === "string",
            )
            .map((f) => ({
              path: f.path,
              action: this.normalizeAction(f.action),
              description:
                typeof f.description === "string" ? f.description : "",
              content: this.sanitizeFileContent(
                typeof f.content === "string" ? f.content : "",
              ),
            }))
        : [],
      commands: Array.isArray(parsed.commands)
        ? parsed.commands.filter((c): c is string => typeof c === "string")
        : [],
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
    };
  }

  // -----------------------------------------------------------------------
  // Buffer helpers
  // -----------------------------------------------------------------------

  /** Find the position of the value start for `"key"` in the buffer. */
  private findKeyValueStart(key: string): number {
    const needle = `"${key}"`;
    const idx = this.buffer.indexOf(needle);
    if (idx < 0) return -1;
    let i = idx + needle.length;
    while (i < this.buffer.length && /\s/.test(this.buffer[i])) i++;
    if (this.buffer[i] !== ":") return -1;
    i++;
    while (i < this.buffer.length && /\s/.test(this.buffer[i])) i++;
    return i;
  }

  private findArrayStart(key: string): number {
    const i = this.findKeyValueStart(key);
    if (i < 0) return -1;
    return this.buffer[i] === "[" ? i : -1;
  }

  private extractStringField(key: string): string | null {
    const i = this.findKeyValueStart(key);
    if (i < 0) return null;
    if (this.buffer[i] !== '"') return null;
    const end = this.findStringEnd(i);
    if (end < 0) return null;
    const raw = this.buffer.slice(i, end + 1);
    return this.safeJsonParse<string>(raw);
  }

  /** Returns the index of the closing quote, or -1 if not yet present. */
  private findStringEnd(start: number): number {
    let i = start + 1;
    while (i < this.buffer.length) {
      const ch = this.buffer[i];
      if (ch === "\\") {
        i += 2;
        continue;
      }
      if (ch === '"') return i;
      i++;
    }
    return -1;
  }

  /** Extract complete `{ ... }` objects from a JSON array starting at `arrStart`. */
  private extractCompleteObjectsFromArray(
    arrStart: number,
    fromIndex?: number,
  ): string[] {
    const out: string[] = [];
    let i = fromIndex ?? arrStart + 1;
    while (i < this.buffer.length) {
      // skip whitespace and commas
      while (i < this.buffer.length && /[\s,]/.test(this.buffer[i])) i++;
      if (i >= this.buffer.length) break;
      const ch = this.buffer[i];
      if (ch === "]") break;
      if (ch !== "{") {
        i++;
        continue;
      }
      const end = this.findObjectEnd(i);
      if (end < 0) break;
      out.push(this.buffer.slice(i, end + 1));
      this.nextFileSearchFrom = end + 1;
      i = end + 1;
    }
    return out;
  }

  private extractCompleteStringsFromArray(arrStart: number): string[] {
    const out: string[] = [];
    let i = arrStart + 1;
    while (i < this.buffer.length) {
      while (i < this.buffer.length && /[\s,]/.test(this.buffer[i])) i++;
      if (i >= this.buffer.length) break;
      const ch = this.buffer[i];
      if (ch === "]") break;
      if (ch !== '"') {
        i++;
        continue;
      }
      const end = this.findStringEnd(i);
      if (end < 0) break;
      const parsed = this.safeJsonParse<string>(this.buffer.slice(i, end + 1));
      if (parsed !== null) out.push(parsed);
      i = end + 1;
    }
    return out;
  }

  /** Find the matching `}` for a `{` at `start`, accounting for strings. */
  private findObjectEnd(start: number): number {
    let depth = 0;
    let i = start;
    let inString = false;
    while (i < this.buffer.length) {
      const ch = this.buffer[i];
      if (inString) {
        if (ch === "\\") {
          i += 2;
          continue;
        }
        if (ch === '"') inString = false;
      } else {
        if (ch === '"') inString = true;
        else if (ch === "{") depth++;
        else if (ch === "}") {
          depth--;
          if (depth === 0) return i;
        }
      }
      i++;
    }
    return -1;
  }

  // -----------------------------------------------------------------------
  // Misc helpers
  // -----------------------------------------------------------------------

  private safeJsonParse<T>(raw: string): T | null {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  private cleanJsonBuffer(raw: string): string {
    let s = raw.trim();
    // Strip ```json … ``` fences if present.
    if (s.startsWith("```")) {
      s = s
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
    }
    // Trim everything before the first `{`.
    const firstBrace = s.indexOf("{");
    if (firstBrace > 0) s = s.slice(firstBrace);
    // Trim everything after the last `}`.
    const lastBrace = s.lastIndexOf("}");
    if (lastBrace >= 0 && lastBrace < s.length - 1)
      s = s.slice(0, lastBrace + 1);
    return s;
  }

  private bestEffortReconstruct(): AICodeResponse | null {
    // If JSON parse fails, return whatever we managed to stream.
    if (
      this.emittedThinking === null &&
      this.parsedFilesCount === 0 &&
      this.emittedPlanSteps === 0 &&
      this.emittedSummary === null
    ) {
      return null;
    }
    return {
      thinking: this.emittedThinking ?? "",
      plan: [],
      files: [],
      commands: [],
      summary: this.emittedSummary ?? "",
    };
  }

  private sanitizeFileContent(content: string): string {
    return content.replace(/\r\n/g, "\n").replace(/\u2028|\u2029/g, "\n");
  }

  private normalizeAction(value: unknown): GeneratedFileAction {
    if (value === "update" || value === "delete") return value;
    return "create";
  }

  private emit(chunk: ParsedChunk): void {
    for (const l of this.chunkListeners) {
      try {
        l(chunk);
      } catch {
        /* noop */
      }
    }
  }
}

export const streamParser = new StreamParser();
