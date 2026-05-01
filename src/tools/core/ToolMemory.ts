import type { NexusToolOutput } from "@/tools/core/NexusToolBase";

export interface ToolMemoryRecord {
  id: string;
  toolId: string;
  input: Record<string, unknown>;
  result: unknown;
  quality: number;
  error?: string;
  timestamp: number;
}

export interface ToolMemoryQuery {
  toolId?: string;
  type?: string;
  asset?: string;
  minQuality?: number;
  minCorrelation?: number;
  sinceMs?: number;
  limit?: number;
}

interface ToolMemoryState {
  records: ToolMemoryRecord[];
  kv: Record<string, unknown>;
  pipelines: Record<string, unknown[]>;
}

const volatileStore = new Map<string, string>();

function getStorage(): Storage | undefined {
  try {
    return typeof globalThis.localStorage !== "undefined"
      ? globalThis.localStorage
      : undefined;
  } catch {
    return undefined;
  }
}

function stableId(seed: string): string {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0).toString(36);
}

export class ToolMemory {
  private readonly key: string;

  constructor(namespace = "nexus-tool-memory-v1") {
    this.key = namespace;
  }

  async record(record: Omit<ToolMemoryRecord, "id">): Promise<ToolMemoryRecord> {
    const state = this.load();
    const next: ToolMemoryRecord = {
      ...record,
      id: stableId(`${record.toolId}:${record.timestamp}:${JSON.stringify(record.input)}`),
    };
    state.records = [next, ...state.records].slice(0, 2000);
    this.save(state);
    return next;
  }

  async query(query: ToolMemoryQuery): Promise<ToolMemoryRecord[]> {
    const state = this.load();
    const since = query.sinceMs ? Date.now() - query.sinceMs : 0;
    return state.records
      .filter((record) => !query.toolId || record.toolId === query.toolId)
      .filter((record) => !query.minQuality || record.quality >= query.minQuality)
      .filter((record) => !query.asset || record.input.asset === query.asset)
      .filter((record) => !query.type || record.input.type === query.type)
      .filter((record) => !since || record.timestamp >= since)
      .slice(0, query.limit ?? 100);
  }

  async hasRecentData(type: string, seconds: number): Promise<boolean> {
    const records = await this.query({ type, sinceMs: seconds * 1000, limit: 1 });
    return records.length > 0;
  }

  async get<T>(key: string): Promise<T | undefined> {
    return this.load().kv[key] as T | undefined;
  }

  async set(key: string, value: unknown): Promise<void> {
    const state = this.load();
    state.kv[key] = value;
    this.save(state);
  }

  async savePipeline(objective: string, pipeline: unknown): Promise<void> {
    const state = this.load();
    const key = stableId(objective);
    state.pipelines[key] = [pipeline, ...(state.pipelines[key] ?? [])].slice(0, 12);
    this.save(state);
  }

  async recordToolOutput(toolId: string, input: Record<string, unknown>, output: NexusToolOutput): Promise<void> {
    await this.record({
      toolId,
      input,
      result: output.result,
      quality: output.quality,
      timestamp: Date.now(),
    });
  }

  getRecords(): ToolMemoryRecord[] {
    return this.load().records;
  }

  private load(): ToolMemoryState {
    const raw = getStorage()?.getItem(this.key) ?? volatileStore.get(this.key);
    if (!raw) return { records: [], kv: {}, pipelines: {} };
    try {
      const parsed = JSON.parse(raw) as Partial<ToolMemoryState>;
      return {
        records: Array.isArray(parsed.records) ? parsed.records : [],
        kv: parsed.kv && typeof parsed.kv === "object" ? parsed.kv : {},
        pipelines:
          parsed.pipelines && typeof parsed.pipelines === "object"
            ? parsed.pipelines
            : {},
      };
    } catch {
      return { records: [], kv: {}, pipelines: {} };
    }
  }

  private save(state: ToolMemoryState): void {
    const raw = JSON.stringify(state);
    const storage = getStorage();
    if (storage) storage.setItem(this.key, raw);
    else volatileStore.set(this.key, raw);
  }
}
