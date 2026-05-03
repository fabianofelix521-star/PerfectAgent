import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export interface CognitiveMemoryEnvelope<T> {
  schemaVersion: number;
  updatedAt: number;
  state: T;
  failures: LearningFailure[];
  qualityHistory: QualitySnapshot[];
}

export interface LearningFailure {
  id: string;
  at: number;
  context: string;
  failure: string;
  lesson: string;
  weight: number;
}

export interface QualitySnapshot {
  at: number;
  score: number;
  confidence: number;
  uncertainty: string[];
  correctiveAction?: string;
}

export interface CognitiveQualityReport {
  score: number;
  confidence: number;
  strengths: string[];
  risks: string[];
  uncertainties: string[];
  correctiveActions: string[];
}

const volatileMemory = new Map<string, string>();
const LOCAL_STORAGE_SOFT_LIMIT_BYTES = 24 * 1024;

interface CognitiveMemoryDB extends DBSchema {
  envelopes: {
    key: string;
    value: { key: string; payload: string; updatedAt: number };
    indexes: { "by-updated": number };
  };
}

let cognitiveDbPromise: Promise<IDBPDatabase<CognitiveMemoryDB>> | null = null;

function cognitiveDb(): Promise<IDBPDatabase<CognitiveMemoryDB>> {
  if (!cognitiveDbPromise) {
    cognitiveDbPromise = openDB<CognitiveMemoryDB>("perfectagent-cognitive", 1, {
      upgrade(db) {
        const store = db.createObjectStore("envelopes", { keyPath: "key" });
        store.createIndex("by-updated", "updatedAt");
      },
    });
  }
  return cognitiveDbPromise;
}

async function readDurableEnvelope(key: string): Promise<string | undefined> {
  try {
    const row = await (await cognitiveDb()).get("envelopes", key);
    return row?.payload;
  } catch {
    return undefined;
  }
}

async function writeDurableEnvelope(key: string, payload: string): Promise<void> {
  try {
    await (await cognitiveDb()).put("envelopes", {
      key,
      payload,
      updatedAt: extractUpdatedAt(payload),
    });
  } catch {
    // Ignore durability failures; runtime keeps volatile state.
  }
}

function extractUpdatedAt(raw: string): number {
  try {
    const parsed = JSON.parse(raw) as Partial<CognitiveMemoryEnvelope<unknown>>;
    return typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0;
  } catch {
    return 0;
  }
}

function isQuotaExceeded(error: unknown): boolean {
  if (typeof DOMException === "undefined" || !(error instanceof DOMException)) {
    return false;
  }
  return (
    error.name === "QuotaExceededError" ||
    error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    error.code === 22 ||
    error.code === 1014
  );
}

function safeStorage(): Storage | undefined {
  try {
    return typeof globalThis.localStorage !== "undefined"
      ? globalThis.localStorage
      : undefined;
  } catch {
    return undefined;
  }
}

export class PersistentCognitiveMemory<T> {
  private hydrationInFlight?: Promise<void>;

  constructor(
    private readonly key: string,
    private readonly defaultState: () => T,
  ) {
    this.hydrationInFlight = this.hydrateFromDurableStore();
  }

  load(): CognitiveMemoryEnvelope<T> {
    const raw = volatileMemory.get(this.key) ?? safeStorage()?.getItem(this.key);
    if (!raw) return this.empty();
    try {
      const parsed = JSON.parse(raw) as CognitiveMemoryEnvelope<T>;
      if (!parsed || typeof parsed !== "object" || !("state" in parsed)) {
        return this.empty();
      }
      return {
        schemaVersion: parsed.schemaVersion || 1,
        updatedAt: parsed.updatedAt || now(),
        state: parsed.state ?? this.defaultState(),
        failures: Array.isArray(parsed.failures) ? parsed.failures : [],
        qualityHistory: Array.isArray(parsed.qualityHistory)
          ? parsed.qualityHistory
          : [],
      };
    } catch {
      return this.empty();
    }
  }

  async hydrate(): Promise<void> {
    if (!this.hydrationInFlight) {
      this.hydrationInFlight = this.hydrateFromDurableStore();
    }
    await this.hydrationInFlight;
  }

  save(envelope: CognitiveMemoryEnvelope<T>): void {
    const next = JSON.stringify({ ...envelope, updatedAt: now() });
    volatileMemory.set(this.key, next);
    void writeDurableEnvelope(this.key, next);

    const storage = safeStorage();
    if (!storage) {
      return;
    }

    if (next.length > LOCAL_STORAGE_SOFT_LIMIT_BYTES) {
      try {
        storage.removeItem(this.key);
      } catch {
        // Ignore storage cleanup failures.
      }
      return;
    }

    try {
      storage.setItem(this.key, next);
    } catch (error) {
      if (isQuotaExceeded(error)) {
        try {
          storage.removeItem(this.key);
        } catch {
          // Ignore secondary storage failures.
        }
      }
    }
  }

  update(mutator: (state: T) => T): CognitiveMemoryEnvelope<T> {
    const envelope = this.load();
    const next = { ...envelope, state: mutator(envelope.state), updatedAt: now() };
    this.save(next);
    return next;
  }

  recordFailure(context: string, failure: string, lesson: string): void {
    const envelope = this.load();
    const nextFailure: LearningFailure = {
      id: stableId(`${context}:${failure}:${envelope.failures.length}`),
      at: now(),
      context,
      failure,
      lesson,
      weight: clamp01(0.35 + envelope.failures.length * 0.03),
    };
    const next = {
      ...envelope,
      failures: [...envelope.failures.slice(-49), nextFailure],
      updatedAt: now(),
    };
    this.save(next);
  }

  recordQuality(report: CognitiveQualityReport): void {
    const envelope = this.load();
    const snapshot: QualitySnapshot = {
      at: now(),
      score: report.score,
      confidence: report.confidence,
      uncertainty: report.uncertainties,
      correctiveAction: report.correctiveActions[0],
    };
    this.save({
      ...envelope,
      qualityHistory: [...envelope.qualityHistory.slice(-99), snapshot],
      updatedAt: now(),
    });
  }

  private empty(): CognitiveMemoryEnvelope<T> {
    return {
      schemaVersion: 1,
      updatedAt: now(),
      state: this.defaultState(),
      failures: [],
      qualityHistory: [],
    };
  }

  private async hydrateFromDurableStore(): Promise<void> {
    const durableRaw = await readDurableEnvelope(this.key);
    if (!durableRaw) return;

    const cachedRaw = volatileMemory.get(this.key) ?? safeStorage()?.getItem(this.key);
    const durableUpdatedAt = extractUpdatedAt(durableRaw);
    const cachedUpdatedAt = cachedRaw ? extractUpdatedAt(cachedRaw) : 0;
    if (cachedRaw && cachedUpdatedAt > durableUpdatedAt) return;

    volatileMemory.set(this.key, durableRaw);

    const storage = safeStorage();
    if (!storage) return;
    if (durableRaw.length > LOCAL_STORAGE_SOFT_LIMIT_BYTES) {
      try {
        storage.removeItem(this.key);
      } catch {
        // Ignore storage cleanup failures.
      }
      return;
    }
    try {
      storage.setItem(this.key, durableRaw);
    } catch {
      // Ignore local cache errors.
    }
  }
}

export function now(): number {
  return Date.now();
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

export function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function weightedMean(
  values: Array<{ value: number; weight: number }>,
): number {
  const totalWeight = values.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0) return 0;
  return values.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9+#.-]+/i)
    .filter((part) => part.length > 2);
}

export function keywordScore(text: string, keywords: string[]): number {
  const tokens = new Set(tokenize(text));
  if (!keywords.length) return 0;
  const hits = keywords.filter((keyword) =>
    tokens.has(
      keyword
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""),
    ),
  ).length;
  return clamp01(hits / Math.max(1, keywords.length));
}

export function stableId(seed: string): string {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0).toString(36);
}

export function hashVector(text: string, dimensions = 24): number[] {
  const vector = Array.from({ length: dimensions }, () => 0);
  const tokens = tokenize(text || "empty");
  tokens.forEach((token, index) => {
    const bucket = parseInt(stableId(`${token}:${index}`), 36) % dimensions;
    const sign = parseInt(stableId(`sign:${token}`), 36) % 2 === 0 ? 1 : -1;
    vector[bucket] += sign * (1 + Math.min(4, token.length) / 4);
  });
  return normalizeVector(vector);
}

export function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (!magnitude) return vector.map(() => 0);
  return vector.map((value) => value / magnitude);
}

export function blendVectors(
  current: number[],
  incoming: number[],
  momentum: number,
): number[] {
  const length = Math.max(current.length, incoming.length);
  const next = Array.from({ length }, (_, i) => {
    const a = current[i] ?? 0;
    const b = incoming[i] ?? 0;
    return a * momentum + b * (1 - momentum);
  });
  return normalizeVector(next);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.max(a.length, b.length);
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < length; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    magA += av * av;
    magB += bv * bv;
  }
  if (!magA || !magB) return 0;
  return clamp01((dot / Math.sqrt(magA * magB) + 1) / 2);
}

export function uniqueMerge<T>(current: T[], incoming: T[], limit = 24): T[] {
  const seen = new Set<string>();
  const merged: T[] = [];
  for (const item of [...incoming, ...current]) {
    const key = JSON.stringify(item);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
    if (merged.length >= limit) break;
  }
  return merged;
}

export function qualityFromSignals(params: {
  evidenceCount: number;
  contradictionCount: number;
  confidence: number;
  uncertaintyCount: number;
}): CognitiveQualityReport {
  const evidenceScore = clamp01(params.evidenceCount / 8);
  const contradictionPenalty = clamp01(params.contradictionCount / 6);
  const uncertaintyPenalty = clamp01(params.uncertaintyCount / 8);
  const score = clamp01(
    params.confidence * 0.45 +
      evidenceScore * 0.35 +
      (1 - contradictionPenalty) * 0.12 +
      (1 - uncertaintyPenalty) * 0.08,
  );
  return {
    score,
    confidence: clamp01(params.confidence),
    strengths:
      evidenceScore > 0.5
        ? ["evidencia suficiente para sintese operacional"]
        : ["estrutura cognitiva ativa e rastreavel"],
    risks: [
      ...(contradictionPenalty > 0.2 ? ["contradicoes ainda nao resolvidas"] : []),
      ...(uncertaintyPenalty > 0.2 ? ["incertezas materiais permanecem"] : []),
    ],
    uncertainties:
      params.uncertaintyCount > 0
        ? [`${params.uncertaintyCount} lacunas exigem validacao externa`]
        : [],
    correctiveActions:
      score < 0.7
        ? ["coletar mais evidencias antes de aumentar autonomia"]
        : ["manter monitoramento e reavaliar quando houver dados novos"],
  };
}
