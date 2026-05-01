/// <reference lib="webworker" />

import type { ParsedChunk } from "../ai/StreamParser";
import type { GeneratedFile, GeneratedFileAction } from "../types";

interface WorkerRequest {
  type: "PROCESS_CHUNK" | "FINALIZE" | "RESET";
  data?: {
    chunk?: string;
    buffer?: string;
  };
}

interface WorkerResponse {
  type: "CHUNK" | "BUFFER_UPDATE" | "COMPLETE" | "ERROR";
  data: unknown;
}

interface WorkerSnapshot {
  thinking: string | null;
  parsedFilesCount: number;
  emittedPlanSteps: number;
  emittedSummary: string | null;
  emittedCommandsCount: number;
}

let buffer = "";
let parsedFilesCount = 0;
let nextFileSearchFrom = 0;
let emittedThinking: string | null = null;
let emittedPlanSteps = 0;
let emittedSummary: string | null = null;
let emittedCommandsCount = 0;

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { type, data } = event.data;

  try {
    switch (type) {
      case "PROCESS_CHUNK":
        processChunk(String(data?.chunk ?? ""), String(data?.buffer ?? ""));
        break;
      case "FINALIZE":
        finalize(String(data?.buffer ?? ""));
        break;
      case "RESET":
        reset();
        break;
    }
  } catch (error) {
    post("ERROR", {
      message: error instanceof Error ? error.message : String(error),
    });
  }
};

function processChunk(chunk: string, currentBuffer: string): void {
  if (!chunk) return;
  buffer = currentBuffer + chunk;

  tryExtractThinking();
  tryExtractPlanSteps();
  tryExtractFiles();
  tryExtractCommands();
  tryExtractSummary();

  post("BUFFER_UPDATE", {
    buffer,
    snapshot: snapshot(),
  });
}

function finalize(currentBuffer: string): void {
  buffer = currentBuffer;
  const parsed = parseComplete();

  if (!parsed) {
    const fallback = bestEffortReconstruct();
    if (!fallback) {
      post("ERROR", { message: "Failed to parse final AI response as JSON." });
      return;
    }
    post("COMPLETE", { parsed: fallback, snapshot: snapshot() });
    return;
  }

  if (emittedThinking === null && parsed.thinking) {
    postChunk({ type: "thinking", data: parsed.thinking });
  }
  for (let i = emittedPlanSteps; i < parsed.plan.length; i++) {
    postChunk({ type: "plan_step", data: parsed.plan[i] });
  }
  for (let i = parsedFilesCount; i < parsed.files.length; i++) {
    postChunk({ type: "file", data: parsed.files[i] });
  }
  for (let i = emittedCommandsCount; i < parsed.commands.length; i++) {
    postChunk({ type: "command", data: parsed.commands[i] });
  }
  if (emittedSummary === null && parsed.summary) {
    postChunk({ type: "summary", data: parsed.summary });
  }

  post("COMPLETE", { parsed, snapshot: snapshot() });
}

function reset(): void {
  buffer = "";
  parsedFilesCount = 0;
  nextFileSearchFrom = 0;
  emittedThinking = null;
  emittedPlanSteps = 0;
  emittedSummary = null;
  emittedCommandsCount = 0;
}

function snapshot(): WorkerSnapshot {
  return {
    thinking: emittedThinking,
    parsedFilesCount,
    emittedPlanSteps,
    emittedSummary,
    emittedCommandsCount,
  };
}

function post(type: WorkerResponse["type"], data: unknown): void {
  const payload: WorkerResponse = { type, data };
  self.postMessage(payload);
}

function postChunk(chunk: ParsedChunk): void {
  post("CHUNK", chunk);
}

function tryExtractThinking(): void {
  if (emittedThinking !== null) return;
  const value = extractStringField("thinking");
  if (value !== null) {
    emittedThinking = value;
    postChunk({ type: "thinking", data: value });
  }
}

function tryExtractSummary(): void {
  if (emittedSummary !== null) return;
  const value = extractStringField("summary");
  if (value !== null) {
    emittedSummary = value;
    postChunk({ type: "summary", data: value });
  }
}

function tryExtractPlanSteps(): void {
  const arrStart = findArrayStart("plan");
  if (arrStart < 0) return;
  const items = extractCompleteObjectsFromArray(arrStart);
  for (let i = emittedPlanSteps; i < items.length; i++) {
    const obj = safeJsonParse<{ step?: number; description?: string }>(items[i]);
    if (!obj) continue;
    postChunk({
      type: "plan_step",
      data: {
        step: typeof obj.step === "number" ? obj.step : i + 1,
        description: typeof obj.description === "string" ? obj.description : "",
      },
    });
    emittedPlanSteps = i + 1;
  }
}

function tryExtractCommands(): void {
  const arrStart = findArrayStart("commands");
  if (arrStart < 0) return;
  const items = extractCompleteStringsFromArray(arrStart);
  for (let i = emittedCommandsCount; i < items.length; i++) {
    postChunk({ type: "command", data: items[i] });
    emittedCommandsCount = i + 1;
  }
}

function tryExtractFiles(): void {
  const arrStart = findArrayStart("files");
  if (arrStart < 0) return;
  const startSearch = Math.max(nextFileSearchFrom, arrStart + 1);
  const items = extractCompleteObjectsFromArray(arrStart, startSearch);

  for (let i = parsedFilesCount; i < items.length; i++) {
    const obj = safeJsonParse<Partial<GeneratedFile>>(items[i]);
    if (!obj || typeof obj.path !== "string") {
      parsedFilesCount = i + 1;
      continue;
    }

    const file: GeneratedFile = {
      path: obj.path,
      action: normalizeAction(obj.action),
      description: typeof obj.description === "string" ? obj.description : "",
      content: sanitizeFileContent(typeof obj.content === "string" ? obj.content : ""),
    };

    postChunk({ type: "file", data: file });
    parsedFilesCount = i + 1;
  }
}

function parseComplete() {
  const cleaned = cleanJsonBuffer(buffer);
  const parsed = safeJsonParse<{
    thinking?: string;
    plan?: Array<{ step?: number; description?: string }>;
    files?: GeneratedFile[];
    commands?: string[];
    summary?: string;
  }>(cleaned);

  if (!parsed) return null;

  return {
    thinking: typeof parsed.thinking === "string" ? parsed.thinking : "",
    plan: Array.isArray(parsed.plan)
      ? parsed.plan.map((p, i) => ({
          step: typeof p?.step === "number" ? p.step : i + 1,
          description: typeof p?.description === "string" ? p.description : "",
        }))
      : [],
    files: Array.isArray(parsed.files)
      ? parsed.files
          .filter((f): f is GeneratedFile => !!f && typeof f.path === "string")
          .map((f) => ({
            path: f.path,
            action: normalizeAction(f.action),
            description: typeof f.description === "string" ? f.description : "",
            content: sanitizeFileContent(typeof f.content === "string" ? f.content : ""),
          }))
      : [],
    commands: Array.isArray(parsed.commands)
      ? parsed.commands.filter((c): c is string => typeof c === "string")
      : [],
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
  };
}

function bestEffortReconstruct() {
  if (
    emittedThinking === null &&
    parsedFilesCount === 0 &&
    emittedPlanSteps === 0 &&
    emittedSummary === null
  ) {
    return null;
  }

  return {
    thinking: emittedThinking ?? "",
    plan: [],
    files: [],
    commands: [],
    summary: emittedSummary ?? "",
  };
}

function findKeyValueStart(key: string): number {
  const needle = `"${key}"`;
  const idx = buffer.indexOf(needle);
  if (idx < 0) return -1;
  let i = idx + needle.length;
  while (i < buffer.length && /\s/.test(buffer[i])) i++;
  if (buffer[i] !== ":") return -1;
  i++;
  while (i < buffer.length && /\s/.test(buffer[i])) i++;
  return i;
}

function findArrayStart(key: string): number {
  const i = findKeyValueStart(key);
  if (i < 0) return -1;
  return buffer[i] === "[" ? i : -1;
}

function extractStringField(key: string): string | null {
  const i = findKeyValueStart(key);
  if (i < 0) return null;
  if (buffer[i] !== '"') return null;
  const end = findStringEnd(i);
  if (end < 0) return null;
  return safeJsonParse<string>(buffer.slice(i, end + 1));
}

function findStringEnd(start: number): number {
  let i = start + 1;
  while (i < buffer.length) {
    const ch = buffer[i];
    if (ch === "\\") {
      i += 2;
      continue;
    }
    if (ch === '"') return i;
    i++;
  }
  return -1;
}

function extractCompleteObjectsFromArray(arrStart: number, fromIndex?: number): string[] {
  const out: string[] = [];
  let i = fromIndex ?? arrStart + 1;

  while (i < buffer.length) {
    while (i < buffer.length && /[\s,]/.test(buffer[i])) i++;
    if (i >= buffer.length) break;
    const ch = buffer[i];
    if (ch === "]") break;
    if (ch !== "{") {
      i++;
      continue;
    }

    const end = findObjectEnd(i);
    if (end < 0) break;

    out.push(buffer.slice(i, end + 1));
    nextFileSearchFrom = end + 1;
    i = end + 1;
  }

  return out;
}

function extractCompleteStringsFromArray(arrStart: number): string[] {
  const out: string[] = [];
  let i = arrStart + 1;

  while (i < buffer.length) {
    while (i < buffer.length && /[\s,]/.test(buffer[i])) i++;
    if (i >= buffer.length) break;
    const ch = buffer[i];
    if (ch === "]") break;
    if (ch !== '"') {
      i++;
      continue;
    }

    const end = findStringEnd(i);
    if (end < 0) break;
    const parsed = safeJsonParse<string>(buffer.slice(i, end + 1));
    if (parsed !== null) out.push(parsed);
    i = end + 1;
  }

  return out;
}

function findObjectEnd(start: number): number {
  let depth = 0;
  let i = start;
  let inString = false;

  while (i < buffer.length) {
    const ch = buffer[i];
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

function safeJsonParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function cleanJsonBuffer(raw: string): string {
  let s = raw.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  }

  const firstBrace = s.indexOf("{");
  if (firstBrace > 0) s = s.slice(firstBrace);

  const lastBrace = s.lastIndexOf("}");
  if (lastBrace >= 0 && lastBrace < s.length - 1) {
    s = s.slice(0, lastBrace + 1);
  }

  return s;
}

function sanitizeFileContent(content: string): string {
  return content.replace(/\r\n/g, "\n").replace(/\u2028|\u2029/g, "\n");
}

function normalizeAction(value: unknown): GeneratedFileAction {
  if (value === "update" || value === "delete") return value;
  return "create";
}
