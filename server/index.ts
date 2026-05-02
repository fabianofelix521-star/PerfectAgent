/**
 * PerfectAgent backend — Phase 1
 * Provides:
 *  - GET  /api/health
 *  - POST /api/providers/test       — test connectivity for an AI provider
 *  - POST /api/providers/models     — fetch live model list
 *  - POST /api/chat/stream          — SSE streaming chat completions (OpenAI-compatible)
 *  - POST /api/runtimes/langgraph/run — execute a user-defined LangGraph
 *
 * Design: provider-agnostic. The client passes a "providerSpec" describing how to
 * call the upstream provider (baseUrl, headers, body shape). The server proxies
 * the request to bypass CORS and to keep the streaming token-by-token contract.
 */
import express from "express";
import cors from "cors";
import { spawn } from "node:child_process";
import { timingSafeEqual } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { searchKnowledge } from "./knowledge";

const app = express();
const PORT = Number(process.env.PORT ?? 3336);
const DEFAULT_DEV_AUTH_KEY = "pa-local-dev-key";
const API_AUTH_KEY = process.env.NEXUS_AUTH_KEY ?? process.env.APP_AUTH_KEY ?? "";
const AUTH_COOKIE_NAME = "nexus_auth";
const AUTH_COOKIE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;
const AUTH_COOKIE_SECURE = process.env.NEXUS_AUTH_COOKIE_SECURE === "true";
const ALLOW_DEV_AUTH_FALLBACK =
  process.env.NODE_ENV !== "production" &&
  process.env.NEXUS_ALLOW_DEV_AUTH_FALLBACK !== "false";
const ACCEPTED_API_AUTH_KEYS = [
  API_AUTH_KEY,
  API_AUTH_KEY && ALLOW_DEV_AUTH_FALLBACK ? DEFAULT_DEV_AUTH_KEY : "",
].filter(Boolean);
const DIST_DIR = path.resolve(process.cwd(), "dist");
const DIST_INDEX = path.join(DIST_DIR, "index.html");

type LangGraphModule = typeof import("@langchain/langgraph");

let langGraphModulePromise: Promise<LangGraphModule> | null = null;

function loadLangGraph(): Promise<LangGraphModule> {
  if (!langGraphModulePromise) {
    langGraphModulePromise = import("@langchain/langgraph");
  }
  return langGraphModulePromise;
}

app.use(cors({ origin: true }));
// Cross-origin isolation is required by WebContainer (SharedArrayBuffer).
// In dev the Vite server sets COOP/COEP for the frontend, while this backend
// still needs CORP so the isolated page can consume API responses on :3336.
// In production/CasaOS this Express process serves the built frontend itself,
// so it must also set COOP/COEP on document/static responses.
app.use((_req, res, next) => {
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
});
app.use(express.json({ limit: "10mb" }));

function safeTokenEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function isAcceptedApiToken(token: string): boolean {
  return Boolean(token) && ACCEPTED_API_AUTH_KEYS.some((key) => safeTokenEqual(token, key));
}

function readCookies(headerValue: string | undefined): Record<string, string> {
  if (!headerValue) return {};
  return headerValue.split(";").reduce<Record<string, string>>((cookies, chunk) => {
    const separatorIndex = chunk.indexOf("=");
    if (separatorIndex <= 0) return cookies;
    const name = chunk.slice(0, separatorIndex).trim();
    const value = chunk.slice(separatorIndex + 1).trim();
    if (!name) return cookies;
    cookies[name] = decodeURIComponent(value);
    return cookies;
  }, {});
}

function getRequestAuthToken(req: express.Request): string {
  const headerToken = req.header("x-nexus-auth") ?? req.header("x-api-key") ?? "";
  const bearerToken = req.header("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const cookieToken = readCookies(req.header("cookie"))[AUTH_COOKIE_NAME] ?? "";
  return headerToken || bearerToken || cookieToken;
}

function hasAuthSessionCookie(req: express.Request): boolean {
  const cookieToken = readCookies(req.header("cookie"))[AUTH_COOKIE_NAME] ?? "";
  return isAcceptedApiToken(cookieToken);
}

function isPublicApiPath(pathname: string): boolean {
  return pathname === "/health" || pathname === "/auth/login" || pathname === "/auth/logout";
}

app.use("/api", (req, res, next) => {
  if (!API_AUTH_KEY || isPublicApiPath(req.path)) return next();
  const token = getRequestAuthToken(req);
  if (isAcceptedApiToken(token)) return next();
  return res.status(401).json({
    ok: false,
    code: "BACKEND_UNAUTHORIZED",
    error:
      "Backend unauthorized: x-nexus-auth nao bate com NEXUS_AUTH_KEY/APP_AUTH_KEY do servidor.",
  });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, ts: Date.now(), authRequired: Boolean(API_AUTH_KEY) });
});

app.post("/api/auth/login", (req, res) => {
  if (!API_AUTH_KEY) {
    return res.json({ ok: true, authenticated: true, authRequired: false });
  }
  const key = typeof req.body?.key === "string" ? req.body.key.trim() : "";
  if (!isAcceptedApiToken(key)) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }
  res.cookie(AUTH_COOKIE_NAME, key, {
    httpOnly: true,
    sameSite: "lax",
    secure: AUTH_COOKIE_SECURE,
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
  });
  return res.json({ ok: true, authenticated: true });
});

app.post("/api/auth/logout", (_req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: AUTH_COOKIE_SECURE,
    path: "/",
  });
  return res.json({ ok: true, authenticated: false });
});

app.get("/api/auth/session", (_req, res) => {
  res.json({ ok: true, authenticated: true });
});

app.post("/api/knowledge/search", async (req, res) => {
  const query = typeof req.body?.query === "string" ? req.body.query : "";
  if (query.trim().length < 3) {
    return res.status(400).json({ ok: false, error: "query too short" });
  }
  try {
    const data = await searchKnowledge({
      query,
      limit: typeof req.body?.limit === "number" ? req.body.limit : undefined,
      sources: Array.isArray(req.body?.sources)
        ? req.body.sources.filter((item: unknown): item is string => typeof item === "string")
        : undefined,
    });
    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: (error as Error).message,
    });
  }
});

/* ---------------------------------------------------------------- types ---*/

type ProviderShape = "openai" | "anthropic" | "gemini" | "ollama" | "custom";
type AuthMode = "bearer" | "header" | "query" | "none";

interface ProviderSpec {
  shape: ProviderShape;
  baseUrl: string;
  apiKey?: string;
  authMode?: AuthMode;
  authHeaderName?: string; // e.g. "x-api-key" for Anthropic
  extraHeaders?: Record<string, string>;
  // for Azure / AWS / custom that need extra path bits:
  pathOverrides?: { chat?: string; models?: string };
}

function buildHeaders(spec: ProviderSpec): Record<string, string> {
  const h: Record<string, string> = {
    "content-type": "application/json",
    ...(spec.extraHeaders ?? {}),
  };
  if (!spec.apiKey || spec.authMode === "none") return h;
  switch (spec.authMode ?? "bearer") {
    case "bearer":
      h["authorization"] = `Bearer ${spec.apiKey}`;
      break;
    case "header":
      h[spec.authHeaderName ?? "x-api-key"] = spec.apiKey;
      break;
    case "query":
      // handled at URL build time
      break;
  }
  return h;
}

function buildUrl(spec: ProviderSpec, kind: "chat" | "models"): string {
  const base = spec.baseUrl.replace(/\/+$/, "");
  const defaults = {
    openai: { chat: "/chat/completions", models: "/models" },
    anthropic: { chat: "/messages", models: "/models" },
    gemini: { chat: "/models", models: "/models" },
    ollama: { chat: "/chat/completions", models: "/models" },
    custom: { chat: "/chat/completions", models: "/models" },
  } as const;
  const path = spec.pathOverrides?.[kind] ?? defaults[spec.shape][kind];
  let url = base + path;
  if (spec.authMode === "query" && spec.apiKey) {
    url +=
      (url.includes("?") ? "&" : "?") +
      `key=${encodeURIComponent(spec.apiKey)}`;
  }
  return url;
}

function buildAuthOnlyHeaders(spec: ProviderSpec): Record<string, string> {
  const h: Record<string, string> = {
    ...(spec.extraHeaders ?? {}),
  };
  if (!spec.apiKey || spec.authMode === "none") return h;
  switch (spec.authMode ?? "bearer") {
    case "bearer":
      h["authorization"] = `Bearer ${spec.apiKey}`;
      break;
    case "header":
      h[spec.authHeaderName ?? "x-api-key"] = spec.apiKey;
      break;
    case "query":
      break;
  }
  return h;
}

/* ----------------------------------------------------- /api/providers/* ---*/

app.post("/api/providers/test", async (req, res) => {
  const spec = req.body?.spec as ProviderSpec | undefined;
  if (!spec?.baseUrl)
    return res.status(400).json({ ok: false, error: "missing spec.baseUrl" });
  const url = buildUrl(spec, "models");
  const t0 = Date.now();
  try {
    const r = await fetch(url, { method: "GET", headers: buildHeaders(spec) });
    const text = await r.text();
    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* keep raw */
    }
    return res.json({
      ok: r.ok,
      status: r.status,
      latencyMs: Date.now() - t0,
      modelCount: countModels(json),
      sample: text.slice(0, 240),
    });
  } catch (err) {
    return res.json({
      ok: false,
      error: (err as Error).message,
      latencyMs: Date.now() - t0,
    });
  }
});

app.post("/api/providers/models", async (req, res) => {
  const spec = req.body?.spec as ProviderSpec | undefined;
  if (!spec?.baseUrl)
    return res.status(400).json({ ok: false, error: "missing spec.baseUrl" });
  try {
    const r = await fetch(buildUrl(spec, "models"), {
      headers: buildHeaders(spec),
    });
    const data = await r.json().catch(() => null);
    return res.json({
      ok: r.ok,
      status: r.status,
      models: extractModels(data),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

function countModels(data: unknown): number {
  return extractModels(data).length;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function extractModels(data: unknown): Array<{ id: string; name?: string }> {
  if (!isRecord(data)) return [];
  // OpenAI-compatible: { data: [{ id }] }
  if (Array.isArray(data.data)) {
    return data.data
      .filter(isRecord)
      .map((m) => ({
        id: String(m.id ?? m.name ?? ""),
        name: typeof m.name === "string" ? m.name : undefined,
      }))
      .filter((m) => m.id);
  }
  // Anthropic: { data: [{ id, display_name }] } — already covered above
  // Gemini: { models: [{ name }] }
  if (Array.isArray(data.models)) {
    return data.models
      .filter(isRecord)
      .map((m) => ({
        id: String(m.name ?? m.id ?? ""),
        name: typeof m.displayName === "string" ? m.displayName : undefined,
      }))
      .filter((m) => m.id);
  }
  return [];
}

/* -------------------------------------------------------- /api/media/* ---*/

type MediaKind = "image" | "audio" | "video";

interface MediaInputFile {
  name: string;
  type: string;
  dataUrl: string;
}

interface MediaGenerateRequest {
  kind: MediaKind;
  providerId: string;
  presetId?: string;
  spec: ProviderSpec;
  model: string;
  prompt: string;
  voiceName?: string;
  audioMode?: string;
  voiceClone?: MediaInputFile;
  lipSync?: {
    audio?: MediaInputFile;
    text?: string;
  };
}

interface MediaGenerateResult {
  kind: MediaKind;
  url: string;
  filename: string;
  mimeType: string;
  createdAt: number;
  providerId: string;
  model: string;
}

app.post("/api/media/generate", async (req, res) => {
  const body = req.body as MediaGenerateRequest | undefined;
  if (!body?.kind || !body?.spec?.baseUrl || !body?.model || !body?.prompt?.trim()) {
    return res.status(400).json({
      ok: false,
      error: "missing kind, spec.baseUrl, model or prompt",
    });
  }
  try {
    const data = await generateMedia(body);
    return res.json({ ok: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const unsupported = /nao suporta|não suporta|unsupported/i.test(message);
    return res.status(unsupported ? 501 : 502).json({ ok: false, error: message });
  }
});

async function generateMedia(body: MediaGenerateRequest): Promise<MediaGenerateResult> {
  const providerKey = `${body.providerId} ${body.presetId ?? ""} ${body.spec.baseUrl}`.toLowerCase();
  const baseHost = safeHost(body.spec.baseUrl);
  const isOfficialOpenAi =
    providerKey.split(/\s+/).some((part) => part === "openai") ||
    baseHost === "api.openai.com";

  if (isOfficialOpenAi) {
    if (body.kind === "image") return generateOpenAiImage(body);
    if (body.kind === "audio") return generateOpenAiAudio(body);
    throw new Error("OpenAI direto nesta rota nao suporta video. Use um provider de video como Replicate ou um custom endpoint.");
  }

  if (providerKey.includes("elevenlabs")) {
    if (body.kind !== "audio") throw new Error("ElevenLabs nesta rota suporta apenas audio.");
    return generateElevenLabsAudio(body);
  }

  if (providerKey.includes("stability")) {
    if (body.kind !== "image") throw new Error("Stability nesta rota suporta apenas imagem.");
    return generateStabilityImage(body);
  }

  if (providerKey.includes("replicate")) {
    return generateReplicateMedia(body);
  }

  throw new Error(
    `Provider ${body.providerId} nao suporta geracao direta de ${body.kind} nesta rota. Use Preparar geracao para o fluxo agentico ou configure OpenAI, ElevenLabs, Stability ou Replicate.`,
  );
}

function safeHost(value: string): string {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
}

async function generateOpenAiImage(body: MediaGenerateRequest): Promise<MediaGenerateResult> {
  const response = await fetch(`${mediaBaseUrl(body.spec)}/images/generations`, {
    method: "POST",
    headers: buildHeaders(body.spec),
    body: JSON.stringify({
      model: body.model,
      prompt: body.prompt,
      n: 1,
      size: "1024x1024",
    }),
  });
  const data = await readJsonOrThrow(response);
  const dataUrl = extractBase64DataUrl(data, "image/png");
  const url = dataUrl ?? extractMediaUrl(data);
  if (!url) throw new Error("OpenAI nao retornou URL/base64 de imagem.");
  return mediaResult(body, url, guessMimeType(url, "image"), "png");
}

async function generateOpenAiAudio(body: MediaGenerateRequest): Promise<MediaGenerateResult> {
  const response = await fetch(`${mediaBaseUrl(body.spec)}/audio/speech`, {
    method: "POST",
    headers: buildHeaders(body.spec),
    body: JSON.stringify({
      model: body.model,
      voice: body.voiceName || "alloy",
      input: body.prompt,
      response_format: "mp3",
    }),
  });
  if (!response.ok) throw new Error(await readError(response));
  const mimeType = response.headers.get("content-type")?.split(";")[0] || "audio/mpeg";
  const url = dataUrlFromArrayBuffer(await response.arrayBuffer(), mimeType);
  return mediaResult(body, url, mimeType, extensionForMime(mimeType, "mp3"));
}

async function generateElevenLabsAudio(body: MediaGenerateRequest): Promise<MediaGenerateResult> {
  const voiceId = elevenLabsVoiceId(body.voiceName || "Rachel");
  const response = await fetch(`${mediaBaseUrl(body.spec)}/text-to-speech/${encodeURIComponent(voiceId)}/stream`, {
    method: "POST",
    headers: buildHeaders(body.spec),
    body: JSON.stringify({
      text: body.prompt,
      model_id: body.model,
      voice_settings: {
        stability: 0.45,
        similarity_boost: body.voiceClone ? 0.85 : 0.7,
        style: 0.25,
        use_speaker_boost: true,
      },
    }),
  });
  if (!response.ok) throw new Error(await readError(response));
  const mimeType = response.headers.get("content-type")?.split(";")[0] || "audio/mpeg";
  const url = dataUrlFromArrayBuffer(await response.arrayBuffer(), mimeType);
  return mediaResult(body, url, mimeType, extensionForMime(mimeType, "mp3"));
}

async function generateStabilityImage(body: MediaGenerateRequest): Promise<MediaGenerateResult> {
  if (/stable-image-core/i.test(body.model)) {
    const origin = new URL(body.spec.baseUrl).origin;
    const form = new FormData();
    form.append("prompt", body.prompt);
    form.append("aspect_ratio", "1:1");
    form.append("output_format", "png");
    const response = await fetch(`${origin}/v2beta/stable-image/generate/core`, {
      method: "POST",
      headers: {
        ...buildAuthOnlyHeaders(body.spec),
        accept: "image/*",
      },
      body: form,
    });
    if (!response.ok) throw new Error(await readError(response));
    const mimeType = response.headers.get("content-type")?.split(";")[0] || "image/png";
    const url = dataUrlFromArrayBuffer(await response.arrayBuffer(), mimeType);
    return mediaResult(body, url, mimeType, extensionForMime(mimeType, "png"));
  }

  const response = await fetch(`${mediaBaseUrl(body.spec)}/generation/${encodeURIComponent(body.model)}/text-to-image`, {
    method: "POST",
    headers: {
      ...buildHeaders(body.spec),
      accept: "application/json",
    },
    body: JSON.stringify({
      text_prompts: [{ text: body.prompt }],
      cfg_scale: 7,
      height: 1024,
      width: 1024,
      samples: 1,
      steps: 30,
    }),
  });
  const data = await readJsonOrThrow(response);
  const artifact = Array.isArray((data as { artifacts?: unknown[] }).artifacts)
    ? ((data as { artifacts?: Array<{ base64?: string }> }).artifacts ?? [])[0]
    : undefined;
  if (!artifact?.base64) throw new Error("Stability nao retornou artefato base64.");
  return mediaResult(body, `data:image/png;base64,${artifact.base64}`, "image/png", "png");
}

async function generateReplicateMedia(body: MediaGenerateRequest): Promise<MediaGenerateResult> {
  const base = mediaBaseUrl(body.spec);
  const modelSlug = body.model.includes("/") ? body.model.replace(/^\/+|\/+$/g, "") : "";
  const url = modelSlug ? `${base}/models/${modelSlug}/predictions` : `${base}/predictions`;
  const input: Record<string, unknown> = {
    prompt: body.prompt,
  };
  if (body.kind === "audio") {
    input.text = body.prompt;
    input.voice = body.voiceName || "default";
    if (body.voiceClone?.dataUrl) input.audio = body.voiceClone.dataUrl;
  }
  if (body.kind === "video") {
    input.text = body.lipSync?.text || body.prompt;
    input.script = body.lipSync?.text || body.prompt;
    if (body.lipSync?.audio?.dataUrl) input.audio = body.lipSync.audio.dataUrl;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: buildHeaders(body.spec),
    body: JSON.stringify(modelSlug ? { input } : { version: body.model, input }),
  });
  const created = await readJsonOrThrow(response);
  const prediction = await pollReplicatePrediction(body.spec, created);
  const output = isRecord(prediction) && "output" in prediction ? prediction.output : prediction;
  const mediaUrl = extractMediaUrl(output);
  if (!mediaUrl) throw new Error("Replicate finalizou sem URL de midia no output.");
  const mimeType = guessMimeType(mediaUrl, body.kind);
  return mediaResult(body, mediaUrl, mimeType, extensionForMime(mimeType, body.kind === "image" ? "png" : body.kind === "audio" ? "mp3" : "mp4"));
}

async function pollReplicatePrediction(spec: ProviderSpec, created: unknown): Promise<unknown> {
  if (!isRecord(created)) return created;
  const status = typeof created.status === "string" ? created.status : "";
  if (["succeeded", "failed", "canceled"].includes(status)) {
    if (status !== "succeeded") throw new Error(`Replicate falhou: ${status}`);
    return created;
  }
  const getUrl = isRecord(created.urls) && typeof created.urls.get === "string"
    ? created.urls.get
    : typeof created.id === "string"
      ? `${mediaBaseUrl(spec)}/predictions/${created.id}`
      : "";
  if (!getUrl) return created;

  for (let attempt = 0; attempt < 30; attempt += 1) {
    await delay(2000);
    const response = await fetch(getUrl, {
      headers: buildHeaders(spec),
    });
    const current = await readJsonOrThrow(response);
    if (!isRecord(current)) continue;
    const currentStatus = typeof current.status === "string" ? current.status : "";
    if (currentStatus === "succeeded") return current;
    if (currentStatus === "failed" || currentStatus === "canceled") {
      const error = typeof current.error === "string" ? current.error : currentStatus;
      throw new Error(`Replicate falhou: ${error}`);
    }
  }
  throw new Error("Timeout: Replicate nao retornou midia em 60s.");
}

function mediaBaseUrl(spec: ProviderSpec): string {
  return spec.baseUrl.replace(/\/+$/, "");
}

function mediaResult(
  body: MediaGenerateRequest,
  url: string,
  mimeType: string,
  extension: string,
): MediaGenerateResult {
  return {
    kind: body.kind,
    url,
    filename: `${body.kind}-${Date.now()}.${extension}`,
    mimeType,
    createdAt: Date.now(),
    providerId: body.providerId,
    model: body.model,
  };
}

async function readJsonOrThrow(response: Response): Promise<unknown> {
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

async function readError(response: Response): Promise<string> {
  const text = await response.text().catch(() => "");
  return `HTTP ${response.status}: ${text.slice(0, 800) || response.statusText}`;
}

function extractBase64DataUrl(value: unknown, fallbackMime: string): string | null {
  if (!isRecord(value)) return null;
  const direct = typeof value.b64_json === "string" ? value.b64_json : undefined;
  if (direct) return `data:${fallbackMime};base64,${direct}`;
  if (Array.isArray(value.data)) {
    for (const item of value.data) {
      if (!isRecord(item)) continue;
      const b64 = typeof item.b64_json === "string" ? item.b64_json : typeof item.base64 === "string" ? item.base64 : "";
      if (b64) return `data:${fallbackMime};base64,${b64}`;
    }
  }
  return null;
}

function extractMediaUrl(value: unknown): string | null {
  if (typeof value === "string") {
    return /^(https?:|data:)/i.test(value) ? value : null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractMediaUrl(item);
      if (found) return found;
    }
    return null;
  }
  if (isRecord(value)) {
    for (const key of ["url", "image", "audio", "video", "file", "output"]) {
      const found = extractMediaUrl(value[key]);
      if (found) return found;
    }
    for (const item of Object.values(value)) {
      const found = extractMediaUrl(item);
      if (found) return found;
    }
  }
  return null;
}

function dataUrlFromArrayBuffer(buffer: ArrayBuffer, mimeType: string): string {
  return `data:${mimeType};base64,${Buffer.from(buffer).toString("base64")}`;
}

function guessMimeType(url: string, kind: MediaKind): string {
  const lower = url.split("?")[0]?.toLowerCase() ?? "";
  if (url.startsWith("data:")) {
    return /^data:([^;,]+)/.exec(url)?.[1] ?? defaultMime(kind);
  }
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".ogg")) return "audio/ogg";
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".mov")) return "video/quicktime";
  if (lower.endsWith(".mp4")) return "video/mp4";
  return defaultMime(kind);
}

function defaultMime(kind: MediaKind): string {
  if (kind === "image") return "image/png";
  if (kind === "audio") return "audio/mpeg";
  return "video/mp4";
}

function extensionForMime(mimeType: string, fallback: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/ogg": "ogg",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
  };
  return map[mimeType] ?? fallback;
}

function elevenLabsVoiceId(voiceName: string): string {
  const voices: Record<string, string> = {
    Rachel: "21m00Tcm4TlvDq8ikWAM",
    Bella: "EXAVITQu4vr4xnSDxMaL",
    Antoni: "ErXwobaYiN019PkySvjV",
    Elli: "MF3mGyEYCl7XYWbV9V6O",
    Josh: "TxGEqnHWrfWFTfGW9XjX",
  };
  return voices[voiceName] ?? voiceName;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ---------------------------------------------------- /api/chat/stream ---*/

interface ChatRequest {
  spec: ProviderSpec;
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  temperature?: number;
  maxTokens?: number;
}

app.post("/api/chat/stream", async (req, res) => {
  const body = req.body as ChatRequest | undefined;
  if (!body?.spec || !body?.model || !body?.messages?.length) {
    return res.status(400).json({ error: "missing spec, model or messages" });
  }
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const abort = new AbortController();
  let completed = false;
  res.on("close", () => {
    if (!completed && !res.writableEnded) abort.abort();
  });

  try {
    const url = buildUrl(body.spec, "chat");
    const headers = buildHeaders(body.spec);
    const upstreamBody = buildChatBody(body);

    const upstream = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(upstreamBody),
      signal: abort.signal,
    });

    if (!upstream.ok || !upstream.body) {
      const err = await upstream.text();
      send("error", { status: upstream.status, message: err.slice(0, 500) });
      return res.end();
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const raw of lines) {
        const line = raw.trim();
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") {
          completed = true;
          send("done", {});
          return res.end();
        }
        try {
          const parsed = JSON.parse(payload);
          const token = extractToken(parsed, body.spec.shape);
          if (token) send("token", { delta: token });
        } catch {
          /* skip non-json keepalive */
        }
      }
    }
    completed = true;
    send("done", {});
    res.end();
  } catch (err) {
    completed = true;
    if (abort.signal.aborted && (res.destroyed || res.writableEnded)) return;
    const message =
      (err as Error).name === "AbortError"
        ? "Stream cancelado antes da resposta terminar."
        : (err as Error).message;
    send("error", { message });
    res.end();
  }
});

function buildChatBody(body: ChatRequest): unknown {
  const { spec, model, messages, temperature = 0.7, maxTokens } = body;
  if (spec.shape === "anthropic") {
    const system = messages.find((m) => m.role === "system")?.content;
    return {
      model,
      max_tokens: maxTokens ?? 1024,
      temperature,
      stream: true,
      system,
      messages: messages.filter((m) => m.role !== "system"),
    };
  }
  // OpenAI-compatible (groq, openrouter, deepseek, ollama, fireworks, together…)
  return {
    model,
    messages,
    temperature,
    stream: true,
    ...(maxTokens ? { max_tokens: maxTokens } : {}),
  };
}

function extractToken(parsed: unknown, shape: ProviderShape): string {
  if (!isRecord(parsed)) return "";
  if (shape === "anthropic") {
    const delta = isRecord(parsed.delta) ? parsed.delta : undefined;
    if (parsed.type === "content_block_delta" && delta?.type === "text_delta")
      return typeof delta.text === "string" ? delta.text : "";
    return "";
  }
  // OpenAI-compatible chunk
  const firstChoice = Array.isArray(parsed.choices)
    ? parsed.choices.find(isRecord)
    : undefined;
  const delta = isRecord(firstChoice?.delta) ? firstChoice.delta : undefined;
  if (typeof delta?.content === "string") return delta.content;
  return typeof firstChoice?.text === "string" ? firstChoice.text : "";
}

/* ---------------------------------------------- /api/runtimes/langgraph ---*/

interface GraphNodeSpec {
  id: string;
  type: "llm" | "tool" | "router" | "human" | "transform";
  prompt?: string; // for llm nodes
  toolCode?: string; // for tool nodes — JS source returning string|object
  routerKey?: string; // for router nodes — state field whose value picks next edge
  transformCode?: string; // for transform nodes — JS that modifies state
}

interface GraphEdgeSpec {
  from: string;
  to: string;
  condition?: string; // optional router branch label
}

interface RunGraphRequest {
  nodes: GraphNodeSpec[];
  edges: GraphEdgeSpec[];
  entry: string;
  exits: string[];
  input: Record<string, unknown>;
  llmSpec?: ProviderSpec;
  llmModel?: string;
}

app.post("/api/runtimes/langgraph/run", async (req, res) => {
  const body = req.body as RunGraphRequest | undefined;
  if (!body?.nodes?.length || !body?.entry) {
    return res.status(400).json({ ok: false, error: "missing nodes or entry" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const { StateGraph, START, END, Annotation } = await loadLangGraph();

    // Build a dynamic graph. State is a free-form record so user-defined transforms
    // can stash arbitrary keys.
    const StateSchema = Annotation.Root({
      input: Annotation<Record<string, unknown>>({
        reducer: (_a, b) => b ?? {},
        default: () => ({}),
      }),
      output: Annotation<Record<string, unknown>>({
        reducer: (a, b) => ({ ...a, ...b }),
        default: () => ({}),
      }),
      log: Annotation<string[]>({
        reducer: (a, b) => [...a, ...b],
        default: () => [],
      }),
      branch: Annotation<string | undefined>({
        reducer: (_a, b) => b,
        default: () => undefined,
      }),
    });

    type SState = typeof StateSchema.State;
    type DynamicGraph = {
      addNode(
        id: string,
        action: (state: SState) => Promise<Partial<SState>>,
      ): unknown;
      addEdge(from: string, to: string): unknown;
      addConditionalEdges(
        from: string,
        path: (state: SState) => string,
        pathMap: Record<string, string>,
      ): unknown;
      compile(): { invoke(input: Partial<SState>): Promise<unknown> };
    };

    const graph = new StateGraph(StateSchema);
    const dynamicGraph = graph as unknown as DynamicGraph;

    for (const node of body.nodes) {
      dynamicGraph.addNode(
        node.id,
        async (state: SState): Promise<Partial<SState>> => {
          send("node:start", { id: node.id, type: node.type });
          const result = await runNode(node, state, body, send);
          send("node:end", { id: node.id, output: result });
          return result;
        },
      );
    }

    // edges
    const grouped = new Map<string, GraphEdgeSpec[]>();
    for (const e of body.edges) {
      if (!grouped.has(e.from)) grouped.set(e.from, []);
      grouped.get(e.from)!.push(e);
    }

    dynamicGraph.addEdge(String(START), body.entry);

    for (const [from, edges] of grouped) {
      const fromNode = body.nodes.find((n) => n.id === from);
      const isRouter = fromNode?.type === "router" && edges.length > 1;
      if (isRouter) {
        const mapping: Record<string, string> = {};
        for (const e of edges) mapping[e.condition ?? "default"] = e.to;
        dynamicGraph.addConditionalEdges(
          from,
          (state: SState) => {
            const branch = state.branch ?? "default";
            return (
              mapping[branch] ??
              mapping["default"] ??
              body.exits[0] ??
              String(END)
            );
          },
          mapping,
        );
      } else {
        for (const e of edges) {
          dynamicGraph.addEdge(from, e.to);
        }
      }
    }
    for (const exit of body.exits) dynamicGraph.addEdge(exit, String(END));

    const compiled = dynamicGraph.compile();
    const finalState = await compiled.invoke({ input: body.input });
    send("final", finalState);
    res.end();
  } catch (err) {
    send("error", {
      message: (err as Error).message,
      stack: (err as Error).stack,
    });
    res.end();
  }
});

async function runNode(
  node: GraphNodeSpec,
  state: { input: Record<string, unknown>; output: Record<string, unknown> },
  ctx: RunGraphRequest,
  send: (event: string, data: unknown) => void,
): Promise<{
  output?: Record<string, unknown>;
  log?: string[];
  branch?: string;
}> {
  switch (node.type) {
    case "llm": {
      if (!ctx.llmSpec || !ctx.llmModel) {
        return { log: [`[${node.id}] no llm configured — skipping`] };
      }
      const userMsg = interpolate(node.prompt ?? "", {
        ...state.input,
        ...state.output,
      });
      const resp = await fetch(buildUrl(ctx.llmSpec, "chat"), {
        method: "POST",
        headers: buildHeaders(ctx.llmSpec),
        body: JSON.stringify(
          buildChatBody({
            spec: ctx.llmSpec,
            model: ctx.llmModel,
            messages: [{ role: "user", content: userMsg }],
          } as ChatRequest),
        ),
      });
      if (!resp.ok) {
        const err = await resp.text();
        return {
          log: [`[${node.id}] llm error ${resp.status}: ${err.slice(0, 200)}`],
        };
      }
      // collapse stream into a single string for this node
      const text = await collectStream(resp, ctx.llmSpec.shape, (delta) =>
        send("token", { node: node.id, delta }),
      );
      return { output: { [node.id]: text }, log: [`[${node.id}] llm ok`] };
    }
    case "transform":
    case "tool": {
      const code = node.transformCode ?? node.toolCode ?? "return {};";
      try {
        // eslint-disable-next-line no-new-func
        const fn = new Function("state", "input", `${code}`);
        const out = await fn(state, state.input);
        return { output: { [node.id]: out } };
      } catch (err) {
        return { log: [`[${node.id}] code error: ${(err as Error).message}`] };
      }
    }
    case "router": {
      const key = node.routerKey ?? "branch";
      const branch = String(
        state.output[key] ?? state.input[key] ?? "default",
      );
      return { branch, log: [`[${node.id}] route -> ${branch}`] };
    }
    case "human": {
      // For Phase 1 we auto-approve and just record a checkpoint event.
      send("human:checkpoint", { id: node.id, state });
      return { log: [`[${node.id}] human checkpoint recorded`] };
    }
  }
}

function interpolate(tpl: string, vars: Record<string, unknown>): string {
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k: string) => {
    const v = k
      .split(".")
      .reduce<unknown>(
        (acc, part) => (isRecord(acc) ? acc[part] : undefined),
        vars,
      );
    return v == null ? "" : String(v);
  });
}

async function collectStream(
  resp: Response,
  shape: ProviderShape,
  onToken: (t: string) => void,
): Promise<string> {
  if (!resp.body) return "";
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let acc = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const raw of lines) {
      const line = raw.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") return acc;
      try {
        const parsed = JSON.parse(payload);
        const token = extractToken(parsed, shape);
        if (token) {
          acc += token;
          onToken(token);
        }
      } catch {
        /* skip */
      }
    }
  }
  return acc;
}

/* ---------------------------------------------- /api/tools/run -----------*/

interface ToolRunRequest {
  kind:
    | "http"
    | "json"
    | "websearch"
    | "calculator"
    | "fs"
    | "shell"
    | "custom";
  args: Record<string, unknown>;
  code?: string;
}

app.post("/api/tools/run", async (req, res) => {
  const body = req.body as ToolRunRequest | undefined;
  if (!body?.kind)
    return res.status(400).json({ ok: false, error: "missing kind" });
  const t0 = Date.now();
  try {
    const result = await runTool(body);
    return res.json({ ok: true, result, latencyMs: Date.now() - t0 });
  } catch (err) {
    return res
      .status(500)
      .json({
        ok: false,
        error: (err as Error).message,
        latencyMs: Date.now() - t0,
      });
  }
});

/* ---------------------------------------------- /api/system/command -----*/

interface SystemCommandRequest {
  command: {
    id: string;
    command: string;
    args: string[];
    cwd?: string;
    env?: Record<string, string>;
    estimatedDurationMs?: number;
  };
}

app.post("/api/system/command", async (req, res) => {
  const body = req.body as SystemCommandRequest | undefined;
  const command = body?.command;
  if (!command?.command) {
    return res.status(400).json({
      success: false,
      exitCode: 1,
      stdout: "",
      stderr: "missing command",
      durationMs: 0,
    });
  }

  const started = Date.now();
  const timeoutMs = Math.max(1000, command.estimatedDurationMs ?? 120_000);
  const child = spawn(command.command, command.args ?? [], {
    cwd: command.cwd,
    env: { ...process.env, ...(command.env ?? {}) },
    shell: false,
  });

  let stdout = "";
  let stderr = "";
  const timer = setTimeout(() => {
    stderr += `\nTimeout after ${timeoutMs}ms`;
    child.kill("SIGTERM");
  }, timeoutMs);

  child.stdout.on("data", (chunk: Buffer) => {
    stdout += chunk.toString();
    if (stdout.length > 200_000) stdout = stdout.slice(-200_000);
  });
  child.stderr.on("data", (chunk: Buffer) => {
    stderr += chunk.toString();
    if (stderr.length > 200_000) stderr = stderr.slice(-200_000);
  });

  child.on("error", (error) => {
    clearTimeout(timer);
    res.json({
      success: false,
      exitCode: 1,
      stdout,
      stderr: stderr || error.message,
      durationMs: Date.now() - started,
    });
  });
  child.on("close", (code) => {
    clearTimeout(timer);
    res.json({
      success: code === 0,
      exitCode: code ?? 1,
      stdout,
      stderr,
      durationMs: Date.now() - started,
    });
  });
});

async function runTool(body: ToolRunRequest): Promise<unknown> {
  const a = body.args ?? {};
  switch (body.kind) {
    case "http": {
      const url = String(a.url ?? "");
      if (!url) throw new Error("missing url");
      const method = String(a.method ?? "GET").toUpperCase();
      let headers: Record<string, string> = {};
      if (typeof a.headers === "string") {
        try {
          headers = JSON.parse(a.headers);
        } catch {
          /* ignore */
        }
      } else if (a.headers && typeof a.headers === "object")
        headers = a.headers as Record<string, string>;
      const init: RequestInit = { method, headers };
      if (method !== "GET" && method !== "HEAD" && a.body)
        init.body = String(a.body);
      const r = await fetch(url, init);
      const text = await r.text();
      let parsed: unknown = text;
      try {
        parsed = JSON.parse(text);
      } catch {
        /* keep text */
      }
      return {
        status: r.status,
        headers: Object.fromEntries(r.headers),
        body: parsed,
      };
    }
    case "json": {
      const input = a.input;
      const expr = String(a.expression ?? "input");
      const fn = new Function("input", `return (${expr});`);
      return fn(input);
    }
    case "calculator": {
      const expr = String(a.expression ?? "");
      if (!/^[\d\s+\-*/().,%^eE]+$/.test(expr))
        throw new Error("only arithmetic allowed");
      return new Function(`return (${expr});`)();
    }
    case "websearch":
      return runWebSearchTool(a);
    case "fs": {
      const fs = await import("node:fs/promises");
      const p = String(a.path ?? "");
      if (!p) throw new Error("missing path");
      if (p.includes("..")) throw new Error("path traversal blocked");
      const action = String(a.action ?? "read");
      if (action === "write") {
        await fs.writeFile(p, String(a.content ?? ""), "utf8");
        return { ok: true, path: p, written: true };
      }
      const content = await fs.readFile(p, "utf8");
      return { ok: true, path: p, content };
    }
    case "shell": {
      return runShellTool(a);
    }
    case "custom": {
      if (!body.code) throw new Error("missing code");
      const fn = new Function("args", body.code);
      return await fn(a);
    }
  }
  throw new Error(`unknown kind: ${body.kind}`);
}

interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  publishedAt?: string;
}

async function runWebSearchTool(a: Record<string, unknown>): Promise<unknown> {
  const queryPrefix = String(a.queryPrefix ?? "").trim();
  const site = String(a.site ?? "").trim();
  const baseQuery = String(a.query ?? "");
  const q = [queryPrefix, baseQuery, site ? `site:${site}` : ""]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (!q) throw new Error("missing query");

  const maxResults = Math.max(
    1,
    Math.min(24, Number(a.maxResults ?? 8) || 8),
  );
  const plainQuery = loosenSearchQuery(q);
  const medical = hasMedicalResearchIntent(q);
  const recent = hasRecentResearchIntent(q);
  const sourceRuns: Array<Promise<WebSearchResult[]>> = [
    searchDuckDuckGo(q, maxResults),
  ];

  if (medical) {
    sourceRuns.push(
      searchPubMed(plainQuery, maxResults, recent),
      searchClinicalTrials(plainQuery, Math.min(maxResults, 8)),
      searchOpenAlex(plainQuery, Math.min(maxResults, 8), recent),
      searchCrossref(plainQuery, Math.min(maxResults, 8), recent),
    );
  } else if (recent) {
    sourceRuns.push(
      searchOpenAlex(plainQuery, Math.min(maxResults, 6), true),
      searchCrossref(plainQuery, Math.min(maxResults, 6), true),
    );
  }

  const settled = await Promise.allSettled(sourceRuns);
  const results = dedupeSearchResults(
    settled.flatMap((item) =>
      item.status === "fulfilled" ? item.value : [],
    ),
  ).slice(0, maxResults);

  return {
    query: q,
    requestedQuery: baseQuery,
    normalizedQuery: plainQuery,
    stack: [
      "karpathy/autoresearch",
      "AutoResearchClaw",
      "open-webSearch",
      ...(medical
        ? ["OpenClaw-Medical-Skills", "PubMed", "ClinicalTrials.gov", "OpenAlex", "Crossref"]
        : recent
          ? ["OpenAlex", "Crossref"]
          : []),
    ],
    results,
  };
}

async function searchDuckDuckGo(
  query: string,
  maxResults: number,
): Promise<WebSearchResult[]> {
  const r = await fetch(
    `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
    {
      headers: { "user-agent": "Mozilla/5.0 PerfectAgent" },
    },
  );
  const html = await r.text();
  const results: WebSearchResult[] = [];
  const re =
    /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && results.length < maxResults) {
    results.push({
      url: decodeDuckDuckGoUrl(m[1]),
      title: stripTags(m[2]),
      snippet: stripTags(m[3]),
      source: "DuckDuckGo",
    });
  }
  return results;
}

async function searchPubMed(
  query: string,
  maxResults: number,
  recent: boolean,
): Promise<WebSearchResult[]> {
  const term = recent ? `${query} AND 2024:2026[dp]` : query;
  const searchUrl =
    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi" +
    `?db=pubmed&sort=relevance&retmode=json&retmax=${maxResults}` +
    `&term=${encodeURIComponent(term)}`;
  const search = await fetchJsonUrl(searchUrl);
  const searchRecord = isRecord(search.esearchresult)
    ? search.esearchresult
    : {};
  const ids = Array.isArray(searchRecord.idlist)
    ? searchRecord.idlist.map(String).filter(Boolean)
    : [];
  if (!ids.length && recent) return searchPubMed(query, maxResults, false);
  if (!ids.length) return [];

  const summary = await fetchJsonUrl(
    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi" +
      `?db=pubmed&retmode=json&id=${ids.join(",")}`,
  );
  const result = isRecord(summary.result) ? summary.result : {};
  return Object.values(result)
    .filter(isRecord)
    .filter((paper) => typeof paper.uid === "string")
    .map((paper) => {
      const authors = Array.isArray(paper.authors)
        ? paper.authors
            .filter(isRecord)
            .slice(0, 3)
            .map((author) => String(author.name ?? ""))
            .filter(Boolean)
        : [];
      const uid = String(paper.uid);
      const journal = typeof paper.fulljournalname === "string"
        ? paper.fulljournalname
        : "";
      const date = typeof paper.pubdate === "string" ? paper.pubdate : "";
      return {
        title: String(paper.title ?? "PubMed result"),
        url: `https://pubmed.ncbi.nlm.nih.gov/${uid}/`,
        snippet: [authors.join(", "), journal, date].filter(Boolean).join(" · "),
        source: "PubMed",
        publishedAt: date,
      };
    });
}

async function searchClinicalTrials(
  query: string,
  maxResults: number,
): Promise<WebSearchResult[]> {
  const url = new URL("https://clinicaltrials.gov/api/v2/studies");
  url.searchParams.set("query.term", query);
  url.searchParams.set("pageSize", String(maxResults));
  const data = await fetchJsonUrl(url.toString());
  const studies = Array.isArray(data.studies) ? data.studies.filter(isRecord) : [];
  return studies.map((study) => {
    const protocol = isRecord(study.protocolSection)
      ? study.protocolSection
      : {};
    const identification = isRecord(protocol.identificationModule)
      ? protocol.identificationModule
      : {};
    const status = isRecord(protocol.statusModule)
      ? protocol.statusModule
      : {};
    const nctId = String(identification.nctId ?? "");
    const title = String(
      identification.briefTitle ?? identification.officialTitle ?? "Clinical trial",
    );
    return {
      title,
      url: nctId
        ? `https://clinicaltrials.gov/study/${nctId}`
        : "https://clinicaltrials.gov/",
      snippet: [
        nctId,
        typeof status.overallStatus === "string" ? status.overallStatus : "",
        typeof status.startDateStruct === "object" && status.startDateStruct
          ? JSON.stringify(status.startDateStruct)
          : "",
      ].filter(Boolean).join(" · "),
      source: "ClinicalTrials.gov",
    };
  });
}

async function searchOpenAlex(
  query: string,
  maxResults: number,
  recent: boolean,
): Promise<WebSearchResult[]> {
  const url = new URL("https://api.openalex.org/works");
  url.searchParams.set("search", query);
  url.searchParams.set("per-page", String(maxResults));
  if (recent) {
    url.searchParams.set(
      "filter",
      "from_publication_date:2024-01-01,to_publication_date:2026-12-31",
    );
  }
  const data = await fetchJsonUrl(url.toString());
  const works = Array.isArray(data.results) ? data.results.filter(isRecord) : [];
  return works.map((work) => ({
    title: String(work.title ?? work.display_name ?? "OpenAlex work"),
    url: typeof work.doi === "string"
      ? `https://doi.org/${work.doi.replace(/^https?:\/\/doi\.org\//, "")}`
      : String(work.id ?? "https://openalex.org"),
    snippet: [
      typeof work.publication_year === "number" ? String(work.publication_year) : "",
      typeof work.type === "string" ? work.type : "",
      typeof work.cited_by_count === "number" ? `${work.cited_by_count} citations` : "",
    ].filter(Boolean).join(" · "),
    source: "OpenAlex",
    publishedAt: typeof work.publication_date === "string" ? work.publication_date : undefined,
  }));
}

async function searchCrossref(
  query: string,
  maxResults: number,
  recent: boolean,
): Promise<WebSearchResult[]> {
  const url = new URL("https://api.crossref.org/works");
  url.searchParams.set("query", query);
  url.searchParams.set("rows", String(maxResults));
  if (recent) {
    url.searchParams.set(
      "filter",
      "from-pub-date:2024-01-01,until-pub-date:2026-12-31",
    );
  }
  const data = await fetchJsonUrl(url.toString());
  const message = isRecord(data.message) ? data.message : {};
  const items = Array.isArray(message.items) ? message.items.filter(isRecord) : [];
  return items.map((item) => {
    const title = Array.isArray(item.title) ? String(item.title[0] ?? "") : "";
    const doi = typeof item.DOI === "string" ? item.DOI : "";
    const published = isRecord(item.published)
      ? item.published
      : isRecord(item["published-print"])
        ? item["published-print"]
        : isRecord(item["published-online"])
          ? item["published-online"]
          : {};
    const dateParts = Array.isArray(published["date-parts"])
      ? published["date-parts"]
      : [];
    const date = Array.isArray(dateParts[0])
      ? dateParts[0].map(String).join("-")
      : "";
    return {
      title: title || "Crossref work",
      url: doi ? `https://doi.org/${doi}` : String(item.URL ?? "https://crossref.org"),
      snippet: [
        Array.isArray(item["container-title"]) ? String(item["container-title"][0] ?? "") : "",
        date,
        typeof item.type === "string" ? item.type : "",
      ].filter(Boolean).join(" · "),
      source: "Crossref",
      publishedAt: date || undefined,
    };
  });
}

async function fetchJsonUrl(url: string): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    headers: {
      "user-agent": "NexusUltraAGI/1.0 (local research tool)",
      accept: "application/json",
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  const data = await response.json();
  return isRecord(data) ? data : {};
}

function dedupeSearchResults(results: WebSearchResult[]): WebSearchResult[] {
  const seen = new Set<string>();
  const deduped: WebSearchResult[] = [];
  for (const result of results) {
    const key = normalizeSearchKey(result.url || result.title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(result);
  }
  return deduped;
}

function normalizeSearchKey(value: string): string {
  return value.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function loosenSearchQuery(query: string): string {
  return query
    .replace(/\bsite:\S+/gi, "")
    .replace(/[“”"]/g, "")
    .replace(/\b(19|20)\d{2}\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function hasRecentResearchIntent(query: string): boolean {
  return /\b(2024|2025|2026|recent|latest|new|novo|novos|atual|atuais|recente|recentes)\b/i.test(query);
}

function hasMedicalResearchIntent(query: string): boolean {
  return /\b(pubmed|clinical|trial|randomized|rct|meta-analysis|medicine|medical|biomedical|drug|dose|dosage|treatment|cancer|tumor|compound|sleep|cortisol|human|elderly|neuroprotection|amyloid|l-theanine|theanine|hippocrates|asclepius|apollo|openc?law medical|medicina|ensaio|estudo|paciente|doenca|doença|tratamento|farmaco|fármaco|composto)\b/i.test(query);
}

async function runShellTool(a: Record<string, unknown>): Promise<unknown> {
  const started = Date.now();
  const commandLine = String(a.commandLine ?? "").trim();
  const command = String(a.command ?? "").trim();
  const args = Array.isArray(a.args)
    ? a.args.map((arg) => String(arg))
    : undefined;
  const tokens = commandLine ? tokenizeShellCommandLine(commandLine) : [];
  const executable = command || tokens[0];
  if (!executable) throw new Error("missing commandLine");

  const timeoutMs = Math.max(
    1_000,
    Math.min(600_000, Number(a.timeoutMs ?? 120_000) || 120_000),
  );
  const cwdInput = typeof a.cwd === "string" && a.cwd.trim() ? a.cwd : ".";
  const cwd = path.resolve(process.cwd(), cwdInput);
  const env =
    a.env && typeof a.env === "object" && !Array.isArray(a.env)
      ? Object.fromEntries(
          Object.entries(a.env as Record<string, unknown>)
            .filter((entry): entry is [string, string] => typeof entry[1] === "string"),
        )
      : undefined;

  return new Promise((resolve) => {
    const child = spawn(executable, args ?? tokens.slice(1), {
      cwd,
      env: { ...process.env, ...(env ?? {}) },
      shell: false,
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      stderr += `\nTimeout after ${timeoutMs}ms`;
      child.kill("SIGTERM");
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
      if (stdout.length > 200_000) stdout = stdout.slice(-200_000);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
      if (stderr.length > 200_000) stderr = stderr.slice(-200_000);
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({
        success: false,
        exitCode: 1,
        command: executable,
        args: args ?? tokens.slice(1),
        cwd,
        stdout,
        stderr: stderr || error.message,
        durationMs: Date.now() - started,
      });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        success: code === 0,
        exitCode: code ?? 1,
        command: executable,
        args: args ?? tokens.slice(1),
        cwd,
        stdout,
        stderr,
        durationMs: Date.now() - started,
      });
    });
  });
}

function tokenizeShellCommandLine(commandLine: string): string[] {
  const tokens: string[] = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(commandLine))) {
    tokens.push(match[1] ?? match[2] ?? match[3] ?? "");
  }
  return tokens.filter(Boolean);
}

function decodeDuckDuckGoUrl(rawUrl: string): string {
  const cleaned = stripTags(rawUrl);
  try {
    const absolute = cleaned.startsWith("//")
      ? `https:${cleaned}`
      : cleaned;
    const parsed = new URL(absolute);
    const uddg = parsed.searchParams.get("uddg");
    return uddg ? decodeURIComponent(uddg) : cleaned;
  } catch {
    return cleaned
      .replace(/^\/\/duckduckgo\.com\/l\/\?uddg=/, "")
      .replace(/&.*$/, "");
  }
}

function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/* ---------------------------------------------- /api/integrations/test ---*/

app.post("/api/integrations/test", async (req, res) => {
  const { url, method = "POST", headers = {}, body } = req.body ?? {};
  if (!url) return res.status(400).json({ ok: false, error: "missing url" });
  const t0 = Date.now();
  try {
    const init: RequestInit = { method, headers };
    if (method !== "GET" && method !== "HEAD" && body !== undefined) {
      init.body = typeof body === "string" ? body : JSON.stringify(body);
    }
    const r = await fetch(url, init);
    const text = await r.text();
    return res.json({
      ok: r.ok,
      status: r.status,
      latencyMs: Date.now() - t0,
      sample: text.slice(0, 500),
    });
  } catch (err) {
    return res.json({
      ok: false,
      error: (err as Error).message,
      latencyMs: Date.now() - t0,
    });
  }
});

/* ---------------------------------------------- /api/mcp/* --------------*/

async function mcpRpc(
  url: string,
  apiKey: string | undefined,
  method: string,
  params?: unknown,
): Promise<unknown> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (apiKey) headers["authorization"] = `Bearer ${apiKey}`;
  const r = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
  });
  const text = await r.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`mcp non-json: ${text.slice(0, 200)}`);
  }
  const payload = isRecord(json) ? json : {};
  if (payload.error) {
    const error = isRecord(payload.error) ? payload.error : {};
    throw new Error(
      `mcp ${method} error: ${
        typeof error.message === "string"
          ? error.message
          : JSON.stringify(payload.error)
      }`,
    );
  }
  return payload.result;
}

app.post("/api/mcp/list", async (req, res) => {
  const { url, apiKey } = req.body ?? {};
  if (!url) return res.status(400).json({ ok: false, error: "missing url" });
  const t0 = Date.now();
  try {
    const result = await mcpRpc(url, apiKey, "tools/list");
    const resultRecord = isRecord(result) ? result : {};
    const tools = (Array.isArray(resultRecord.tools) ? resultRecord.tools : [])
      .filter(isRecord)
      .map((tool) => ({
        name: String(tool.name ?? ""),
        description:
          typeof tool.description === "string" ? tool.description : undefined,
        inputSchema: isRecord(tool.inputSchema)
          ? tool.inputSchema
          : undefined,
      }))
      .filter((tool) => tool.name) as Array<{
      name: string;
      description?: string;
      inputSchema?: Record<string, unknown>;
    }>;
    return res.json({ ok: true, tools, latencyMs: Date.now() - t0 });
  } catch (err) {
    return res.json({
      ok: false,
      error: (err as Error).message,
      latencyMs: Date.now() - t0,
    });
  }
});

app.post("/api/mcp/call", async (req, res) => {
  const { url, apiKey, name, arguments: args } = req.body ?? {};
  if (!url || !name)
    return res.status(400).json({ ok: false, error: "missing url or name" });
  const t0 = Date.now();
  try {
    const result = await mcpRpc(url, apiKey, "tools/call", {
      name,
      arguments: args ?? {},
    });
    return res.json({ ok: true, result, latencyMs: Date.now() - t0 });
  } catch (err) {
    return res.json({
      ok: false,
      error: (err as Error).message,
      latencyMs: Date.now() - t0,
    });
  }
});

/* --------------------------------------- /api/runtimes/test + proxy ---*/
/** Best-effort GET on a runtime endpoint to check reachability. */
app.post("/api/runtimes/test", async (req, res) => {
  const { url, apiKey } = req.body ?? {};
  if (!url) return res.status(400).json({ ok: false, error: "missing url" });
  const t0 = Date.now();
  try {
    const headers: Record<string, string> = {};
    if (apiKey) headers["authorization"] = `Bearer ${apiKey}`;
    const r = await fetch(url, { method: "GET", headers });
    const latencyMs = Date.now() - t0;
    const text = await r.text();
    return res.json({
      ok: r.ok,
      status: r.status,
      latencyMs,
      sample: text.slice(0, 200),
    });
  } catch (err) {
    return res.json({
      ok: false,
      error: (err as Error).message,
      latencyMs: Date.now() - t0,
    });
  }
});

/** Generic POST proxy for custom-runtime adapters. Returns text + parsed JSON if any. */
app.post("/api/runtimes/proxy", async (req, res) => {
  const { url, headers, payload, method } = req.body ?? {};
  if (!url) return res.status(400).json({ ok: false, error: "missing url" });
  const t0 = Date.now();
  try {
    const r = await fetch(url, {
      method: method || "POST",
      headers: { "content-type": "application/json", ...(headers || {}) },
      body: JSON.stringify(payload ?? {}),
    });
    const text = await r.text();
    let body: unknown = undefined;
    try {
      body = JSON.parse(text);
    } catch {
      /* not json */
    }
    return res.json({
      ok: r.ok,
      status: r.status,
      latencyMs: Date.now() - t0,
      text,
      body,
    });
  } catch (err) {
    return res.json({
      ok: false,
      error: (err as Error).message,
      latencyMs: Date.now() - t0,
    });
  }
});

if (existsSync(DIST_INDEX)) {
  app.use(express.static(DIST_DIR, { index: false }));
  app.get(/^(?!\/api).*/, (req, res, next) => {
    if (/\.[a-z0-9]+$/i.test(req.path)) {
      next();
      return;
    }
    if (API_AUTH_KEY && req.path !== "/login" && !hasAuthSessionCookie(req)) {
      const params = new URLSearchParams({ next: req.originalUrl });
      res.redirect(302, `/login?${params.toString()}`);
      return;
    }
    res.sendFile(DIST_INDEX, (err) => {
      if (err) next(err);
    });
  });
}

app.listen(PORT, () => {
  process.stdout.write(`[perfectagent] api ready on http://127.0.0.1:${PORT}\n`);
});
