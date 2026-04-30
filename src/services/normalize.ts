export type PipelineStage = "plan" | "act" | "verify" | "debug" | "tool";

export type PipelineChunk = {
  id: string;
  stage: PipelineStage;
  title: string;
  summary?: string;
  content?: string;
  logs?: string[];
  raw?: unknown;
  status: "running" | "ok" | "warn" | "error";
  createdAt: number;
  /** Back-compat for older UI/tests that still read ts. */
  ts?: number;
};

export type NormalizedAssistantMessage = {
  id: string;
  role: "assistant";
  finalMarkdown: string;
  chunks: PipelineChunk[];
  raw?: unknown;
  providerId?: string;
  modelId?: string;
  runtimeId?: string;
  createdAt: number;
  /** Back-compat for the previous normalizer contract. */
  mode?: "final" | "pipeline";
  meta?: { providerId?: string; modelId?: string; runtimeId?: string };
};

type NormalizeEnvelope = {
  id?: string;
  createdAt?: number;
  providerId?: string;
  modelId?: string;
  runtimeId?: string;
  meta?: { providerId?: string; modelId?: string; runtimeId?: string };
  raw: unknown;
};

const STAGE_ALIASES: Record<string, PipelineStage> = {
  plan: "plan",
  planning: "plan",
  planner: "plan",
  architect: "plan",
  architecting: "plan",
  act: "act",
  acting: "act",
  code: "act",
  coder: "act",
  coding: "act",
  build: "act",
  generate: "act",
  generation: "act",
  verify: "verify",
  verifier: "verify",
  verification: "verify",
  critic: "verify",
  critique: "verify",
  observe: "verify",
  observer: "verify",
  debug: "debug",
  debugger: "debug",
  fix: "debug",
  fixing: "debug",
  failed: "debug",
  error: "debug",
  tool: "tool",
  install: "tool",
  installing: "tool",
  exec: "tool",
  executing: "tool",
  preview: "tool",
  runtime: "tool",
};

const STAGE_LABELS: Record<PipelineStage, string> = {
  plan: "Plan",
  act: "Act",
  verify: "Verify",
  debug: "Debug",
  tool: "Tool",
};

const LANG_ALIASES: Record<string, string> = {
  html: "html",
  css: "css",
  javascript: "javascript",
  js: "javascript",
  typescript: "typescript",
  ts: "typescript",
  react: "tsx",
  tsx: "tsx",
  jsx: "jsx",
  json: "json",
  bash: "bash",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
};

function uid(prefix = "id") {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function asStage(value: unknown): PipelineStage | undefined {
  if (typeof value !== "string") return undefined;
  return STAGE_ALIASES[value.toLowerCase().trim()];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNormalized(value: unknown): value is NormalizedAssistantMessage {
  return (
    isRecord(value) &&
    value.role === "assistant" &&
    typeof value.finalMarkdown === "string" &&
    Array.isArray(value.chunks)
  );
}

function compactText(value: string, max = 180): string {
  const text = value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}...`;
}

function stringifySafe(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function safeParseJson(value: string): unknown | undefined {
  try {
    return JSON.parse(value);
  } catch {
    const start = value.indexOf("{");
    const end = value.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(value.slice(start, end + 1));
      } catch {
        return undefined;
      }
    }
    return undefined;
  }
}

function findBalancedJsonEnd(text: string, start: number): number {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
  }
  return -1;
}

type StageMatch = {
  stage: PipelineStage;
  label: string;
  rawJson: string;
  payload: unknown;
  start: number;
  end: number;
};

function extractStageBlocks(text: string): StageMatch[] {
  const matches: StageMatch[] = [];
  const stageNames = Object.keys(STAGE_ALIASES)
    .sort((a, b) => b.length - a.length)
    .join("|");
  const re = new RegExp(
    `(?:^|\\n|\\s|\\*\\*)\\[?(${stageNames})\\]?(?:\\*\\*)?\\s*(?:[:=\\-]|\\n)?\\s*`,
    "gi",
  );
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    const label = match[1];
    const stage = asStage(label);
    if (!stage) continue;
    const jsonStart = text.indexOf("{", re.lastIndex);
    if (jsonStart < 0) continue;

    const between = text.slice(re.lastIndex, jsonStart);
    if (/\S/.test(between) || between.length > 16) continue;

    const jsonEnd = findBalancedJsonEnd(text, jsonStart);
    if (jsonEnd < 0) continue;

    const rawJson = text.slice(jsonStart, jsonEnd);
    const payload = safeParseJson(rawJson) ?? rawJson;
    matches.push({
      stage,
      label,
      rawJson,
      payload,
      start: match.index,
      end: jsonEnd,
    });
    re.lastIndex = jsonEnd;
  }

  return matches;
}

function removeSpans(
  text: string,
  spans: Array<{ start: number; end: number }>,
): string {
  if (spans.length === 0) return text;
  let output = text;
  for (const span of [...spans].sort((a, b) => b.start - a.start)) {
    output = `${output.slice(0, span.start)}\n${output.slice(span.end)}`;
  }
  return output;
}

function getNestedStageValue(
  obj: Record<string, unknown>,
  stage: PipelineStage,
): unknown | undefined {
  const keys = Object.keys(obj);
  for (const key of keys) {
    if (asStage(key) === stage) return obj[key];
  }
  return undefined;
}

function pickContent(
  payload: unknown,
  stage: PipelineStage,
): {
  content?: string;
  summary?: string;
  logs?: string[];
  status?: PipelineChunk["status"];
} {
  if (payload == null) return {};
  if (typeof payload === "string") return { content: payload };
  if (typeof payload === "number" || typeof payload === "boolean")
    return { content: String(payload) };
  if (Array.isArray(payload))
    return {
      content: payload
        .map((item) => (typeof item === "string" ? item : stringifySafe(item)))
        .join("\n"),
    };
  if (!isRecord(payload)) return { content: stringifySafe(payload) };

  const obj = payload;
  if (isRecord(obj.output)) {
    const stageValue = getNestedStageValue(obj.output, stage);
    if (stageValue !== undefined) return pickContent(stageValue, stage);
    if (
      typeof obj.output.summary === "string" ||
      typeof obj.output.content === "string" ||
      typeof obj.output.text === "string"
    ) {
      return pickContent(obj.output, stage);
    }
  }

  const directStageValue = getNestedStageValue(obj, stage);
  if (directStageValue !== undefined && directStageValue !== payload)
    return pickContent(directStageValue, stage);

  const logs = Array.isArray(obj.logs)
    ? obj.logs.map((log) =>
        typeof log === "string" ? log : stringifySafe(log),
      )
    : undefined;
  const status =
    obj.status === "running" ||
    obj.status === "ok" ||
    obj.status === "warn" ||
    obj.status === "error"
      ? obj.status
      : undefined;

  if (stage === "verify" && isRecord(obj.verify)) {
    const nested = pickContent(obj.verify, stage);
    return {
      ...nested,
      logs: nested.logs ?? logs,
      status: nested.status ?? status,
    };
  }
  if (typeof obj.summary === "string") {
    return {
      summary: obj.summary,
      content:
        typeof obj.content === "string"
          ? obj.content
          : typeof obj.text === "string"
            ? obj.text
            : typeof obj.message === "string"
              ? obj.message
              : undefined,
      logs,
      status,
    };
  }
  if (typeof obj.content === "string")
    return { content: obj.content, logs, status };
  if (typeof obj.text === "string") return { content: obj.text, logs, status };
  if (typeof obj.message === "string")
    return { content: obj.message, logs, status };
  if (typeof obj.result === "string")
    return { content: obj.result, logs, status };
  if (typeof obj.error === "string")
    return { content: obj.error, summary: obj.error, logs, status: "error" };

  return { logs, status };
}

function makeChunk(
  stage: PipelineStage,
  payload: unknown,
  options: Partial<PipelineChunk> = {},
): PipelineChunk {
  const picked = pickContent(payload, stage);
  const createdAt = options.createdAt ?? Date.now();
  const content = options.content ?? picked.content;
  const summary =
    options.summary ??
    picked.summary ??
    (content ? compactText(content) : undefined);
  return {
    id: options.id ?? uid(stage),
    stage,
    title: options.title ?? STAGE_LABELS[stage],
    summary,
    content,
    logs: options.logs ?? picked.logs,
    raw: options.raw ?? payload,
    status: options.status ?? picked.status ?? "ok",
    createdAt,
    ts: createdAt,
  };
}

function normalizeChunk(value: unknown): PipelineChunk | null {
  if (!isRecord(value)) return null;
  const stage = asStage(value.stage) ?? asStage(value.phase) ?? "tool";
  const createdAt =
    typeof value.createdAt === "number"
      ? value.createdAt
      : typeof value.ts === "number"
        ? value.ts
        : Date.now();
  const title =
    typeof value.title === "string"
      ? value.title
      : typeof value.phase === "string"
        ? value.phase
        : STAGE_LABELS[stage];
  const status =
    value.status === "running" ||
    value.status === "ok" ||
    value.status === "warn" ||
    value.status === "error"
      ? value.status
      : value.level === "error"
        ? "error"
        : value.level === "warn"
          ? "warn"
          : value.level === "success"
            ? "ok"
            : "running";

  return makeChunk(stage, value.raw ?? value, {
    id: typeof value.id === "string" ? value.id : uid(stage),
    title,
    summary:
      typeof value.summary === "string"
        ? value.summary
        : typeof value.message === "string"
          ? value.message
          : undefined,
    content:
      typeof value.content === "string"
        ? value.content
        : typeof value.detail === "string"
          ? value.detail
          : undefined,
    logs: Array.isArray(value.logs) ? value.logs.map(String) : undefined,
    raw: value.raw ?? value,
    status,
    createdAt,
  });
}

function isFullHtmlDocument(text: string): boolean {
  const trimmed = text.trim();
  return /^<!doctype html>/i.test(trimmed) || /^<html[\s>]/i.test(trimmed);
}

function looksLikeCss(text: string): boolean {
  const trimmed = text.trim();
  return (
    /(^|\n)\s*(body|:root|\.[a-z0-9_-]+|#[a-z0-9_-]+|[a-z-]+)\s*\{[\s\S]*\}/i.test(
      trimmed,
    ) && /[;{}]/.test(trimmed)
  );
}

function looksLikeJs(text: string): boolean {
  const trimmed = text.trim();
  return (
    /\b(import|export|const|let|function|class|document\.|window\.|return|console\.)\b/.test(
      trimmed,
    ) || /=>/.test(trimmed)
  );
}

function looksLikeJson(text: string): boolean {
  const trimmed = text.trim();
  if (!/^[[{]/.test(trimmed)) return false;
  return safeParseJson(trimmed) !== undefined;
}

function looksLikeShell(text: string): boolean {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length === 0 || lines.length > 12) return false;
  return lines.every(
    (line) =>
      /^\s*(npm|pnpm|yarn|node|npx|git|cd|mkdir|touch|cat|echo|curl|bun)\b/.test(
        line,
      ) || /^\s*[$#]\s+/.test(line),
  );
}

function inferLanguageForBareBlock(text: string): string | null {
  if (isFullHtmlDocument(text)) return "html";
  if (looksLikeJson(text)) return "json";
  if (
    /\bimport\s+React\b|<[A-Z][A-Za-z0-9]*[\s>]|className=|useState\(/.test(
      text,
    )
  )
    return "tsx";
  if (looksLikeCss(text)) return "css";
  if (looksLikeShell(text)) return "bash";
  if (looksLikeJs(text)) return "javascript";
  return null;
}

function wrapBareLanguageBlock(text: string): string {
  const trimmed = text.trim();
  const langLine = trimmed.match(
    /^(html|css|javascript|js|typescript|ts|tsx|jsx|json|bash|sh|shell)\s*\n([\s\S]+)/i,
  );
  if (langLine) {
    const lang =
      LANG_ALIASES[langLine[1].toLowerCase()] ?? langLine[1].toLowerCase();
    const code = langLine[2].trim();
    if (inferLanguageForBareBlock(code) || lang === "bash")
      return `\`\`\`${lang}\n${code}\n\`\`\``;
  }

  const inferred = inferLanguageForBareBlock(trimmed);
  if (!inferred) return text;
  return `\`\`\`${inferred}\n${trimmed}\n\`\`\``;
}

export function normalizeMarkdown(markdown: string | undefined | null): string {
  if (!markdown) return "";
  let text = String(markdown).replace(/\r\n/g, "\n");

  text = text.replace(
    /```\s*\n\s*(html|css|javascript|js|typescript|ts|tsx|jsx|json|bash|sh|shell)\s*\n/gi,
    (_match, lang) =>
      `\`\`\`${LANG_ALIASES[String(lang).toLowerCase()] ?? String(lang).toLowerCase()}\n`,
  );

  text = removeSpans(text, extractStageBlocks(text));

  if (!text.includes("```") && inferLanguageForBareBlock(text.trim())) {
    text = wrapBareLanguageBlock(text);
  } else if (
    !/```[a-z0-9_-]*\s*\n[\s\S]*?<!doctype html/i.test(text) &&
    /<!doctype html>/i.test(text)
  ) {
    const index = text.search(/<!doctype html>/i);
    const before = text.slice(0, index).trimEnd();
    const html = text.slice(index).trim();
    text = `${before ? `${before}\n\n` : ""}\`\`\`html\n${html}\n\`\`\``;
  }

  const fenceCount = (text.match(/```/g) ?? []).length;
  if (fenceCount % 2 === 1) text += "\n```";

  return text.replace(/\n{3,}/g, "\n\n").trim();
}

function extractFinalFromChunks(chunks: PipelineChunk[]): string {
  const verify = [...chunks]
    .reverse()
    .find((chunk) => chunk.stage === "verify");
  if (verify?.summary) return normalizeMarkdown(verify.summary);
  if (verify?.content) return normalizeMarkdown(verify.content);

  const act = [...chunks].reverse().find((chunk) => chunk.stage === "act");
  if (act?.content) return normalizeMarkdown(act.content);
  if (act?.summary) return normalizeMarkdown(act.summary);

  return "";
}

function fallbackFinalForPipeline(chunks: PipelineChunk[]): string {
  if (chunks.some((chunk) => chunk.stage === "act"))
    return "Estou gerando o projeto e mantendo os detalhes tecnicos no Thinking.";
  if (chunks.some((chunk) => chunk.stage === "plan"))
    return "Entendi. Pode mandar o proximo pedido ou ajuste que eu sigo daqui.";
  return "Resposta estruturada recebida. Os detalhes tecnicos ficam no Thinking.";
}

function sameNormalizedText(left: string | undefined, right: string): boolean {
  if (!left) return false;
  return normalizeMarkdown(left).trim() === right.trim();
}

function stripInferredFinalFromChunks(
  chunks: PipelineChunk[],
  finalMarkdown: string,
): PipelineChunk[] {
  if (!finalMarkdown) return chunks;
  return chunks.map((chunk) => {
    const contentIsFinal = sameNormalizedText(chunk.content, finalMarkdown);
    const summaryIsFinal = sameNormalizedText(chunk.summary, finalMarkdown);
    if (!contentIsFinal && !summaryIsFinal) return chunk;
    return {
      ...chunk,
      summary: summaryIsFinal
        ? `${STAGE_LABELS[chunk.stage]} concluido.`
        : chunk.summary,
      content: contentIsFinal ? undefined : chunk.content,
    };
  });
}

function objectToChunks(obj: Record<string, unknown>): PipelineChunk[] {
  let chunks: PipelineChunk[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const stage = asStage(key);
    if (stage)
      chunks.push(makeChunk(stage, value, { title: STAGE_LABELS[stage] }));
  }

  if (chunks.length === 0 && isRecord(obj.output)) {
    for (const [key, value] of Object.entries(obj.output)) {
      const stage = asStage(key);
      if (stage)
        chunks.push(makeChunk(stage, value, { title: STAGE_LABELS[stage] }));
    }
  }

  if (chunks.length === 0 && typeof obj.phase === "string") {
    const chunk = normalizeChunk(obj);
    if (chunk) chunks.push(chunk);
  }

  return chunks;
}

export function normalizeAssistantOutput(
  input: unknown,
): NormalizedAssistantMessage {
  if (isNormalized(input))
    return { ...input, finalMarkdown: normalizeMarkdown(input.finalMarkdown) };

  const envelope =
    isRecord(input) && "raw" in input
      ? (input as NormalizeEnvelope)
      : ({ raw: input } as NormalizeEnvelope);

  const raw = envelope.raw;
  const id = envelope.id ?? uid("assistant");
  const createdAt = envelope.createdAt ?? Date.now();
  const providerId = envelope.providerId ?? envelope.meta?.providerId;
  const modelId = envelope.modelId ?? envelope.meta?.modelId;
  const runtimeId = envelope.runtimeId ?? envelope.meta?.runtimeId;
  let chunks: PipelineChunk[] = [];
  let body = "";

  if (raw == null) {
    return {
      id,
      role: "assistant",
      finalMarkdown: "",
      chunks,
      raw,
      providerId,
      modelId,
      runtimeId,
      createdAt,
      mode: "final",
      meta: { providerId, modelId, runtimeId },
    };
  }

  if (Array.isArray(raw)) {
    for (const item of raw) {
      const chunk = normalizeChunk(item);
      if (chunk) chunks.push(chunk);
    }
    body = "";
  } else if (typeof raw === "string") {
    const trimmed = raw.trim();
    const parsed = looksLikeJson(trimmed) ? safeParseJson(trimmed) : undefined;
    if (isRecord(parsed)) {
      const parsedChunks = objectToChunks(parsed);
      chunks.push(...parsedChunks);
      body =
        typeof parsed.finalMarkdown === "string"
          ? parsed.finalMarkdown
          : typeof parsed.content === "string"
            ? parsed.content
            : typeof parsed.message === "string"
              ? parsed.message
              : "";
      if (!body && parsedChunks.length === 0)
        chunks.push(
          makeChunk("debug", parsed, {
            title: "Raw debug data",
            summary: "Structured response received.",
          }),
        );
    } else {
      const stageBlocks = extractStageBlocks(raw);
      for (const block of stageBlocks)
        chunks.push(
          makeChunk(block.stage, block.payload, {
            raw: block.payload,
            title: STAGE_LABELS[block.stage],
          }),
        );
      body = removeSpans(raw, stageBlocks);
    }
  } else if (isRecord(raw)) {
    chunks.push(...objectToChunks(raw));
    body =
      typeof raw.finalMarkdown === "string"
        ? raw.finalMarkdown
        : typeof raw.content === "string"
          ? raw.content
          : typeof raw.message === "string"
            ? raw.message
            : "";
    if (!body && chunks.length === 0)
      chunks.push(
        makeChunk("debug", raw, {
          title: "Raw debug data",
          summary: "Structured response received.",
        }),
      );
  } else {
    body = String(raw);
  }

  let finalMarkdown = normalizeMarkdown(body);
  let inferredFinal = false;
  if (!finalMarkdown && chunks.length > 0) {
    finalMarkdown = extractFinalFromChunks(chunks);
    inferredFinal = Boolean(finalMarkdown);
  }
  if (!finalMarkdown && chunks.length > 0)
    finalMarkdown = fallbackFinalForPipeline(chunks);
  if (inferredFinal)
    chunks = stripInferredFinalFromChunks(chunks, finalMarkdown);
  if (!finalMarkdown && chunks.some((chunk) => chunk.stage === "debug"))
    finalMarkdown =
      "Resposta estruturada recebida. Os detalhes estao no painel de pensamento.";

  return {
    id,
    role: "assistant",
    finalMarkdown,
    chunks,
    raw,
    providerId,
    modelId,
    runtimeId,
    createdAt,
    mode: chunks.length > 0 ? "pipeline" : "final",
    meta: { providerId, modelId, runtimeId },
  };
}

export function extractStaticHtml(
  message: NormalizedAssistantMessage,
): string | null {
  const candidates: string[] = [];
  if (message.finalMarkdown) candidates.push(message.finalMarkdown);
  for (const chunk of message.chunks) {
    if (chunk.content) candidates.push(chunk.content);
    if (chunk.summary) candidates.push(chunk.summary);
  }

  for (const candidate of candidates) {
    const fenced = candidate.match(/```html\s*\n([\s\S]*?)```/i);
    if (fenced && isFullHtmlDocument(fenced[1])) return fenced[1].trim();

    const rawIndex = candidate.search(/<!doctype html>|<html[\s>]/i);
    if (rawIndex >= 0) {
      const html = candidate.slice(rawIndex).trim();
      if (isFullHtmlDocument(html)) return html;
    }
  }

  return null;
}
