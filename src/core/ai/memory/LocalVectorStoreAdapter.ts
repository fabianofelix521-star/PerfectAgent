import type {
  VectorQueryResult,
  VectorRecord,
  VectorStoreAdapter,
} from "@/core/ai/memory/types";

export class LocalVectorStoreAdapter implements VectorStoreAdapter {
  private agentId = "default";
  private records: VectorRecord[] = [];

  async init(agentId: string): Promise<void> {
    this.agentId = agentId;
    this.records = readStore(agentId);
  }

  async upsert(record: VectorRecord): Promise<void> {
    const idx = this.records.findIndex((item) => item.id === record.id);
    if (idx >= 0) this.records[idx] = record;
    else this.records.push(record);
    writeStore(this.agentId, this.records);
  }

  async query(params: {
    vector: number[];
    topK: number;
    includeMetadata?: boolean;
    filter?: Record<string, unknown>;
  }): Promise<{ matches: VectorQueryResult[] }> {
    const candidates = this.records.filter((item) => matchFilter(item, params.filter));
    const matches = candidates
      .map((item) => ({
        id: item.id,
        score: cosineSimilarity(item.values, params.vector),
        metadata: item.metadata,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, params.topK);

    return { matches };
  }

  async delete(id: string): Promise<void> {
    this.records = this.records.filter((item) => item.id !== id);
    writeStore(this.agentId, this.records);
  }
}

function matchFilter(item: VectorRecord, filter?: Record<string, unknown>): boolean {
  if (!filter) return true;
  for (const [key, value] of Object.entries(filter)) {
    if ((item.metadata as Record<string, unknown>)[key] !== value) return false;
  }
  return true;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function key(agentId: string): string {
  return `pa:memory:vector:${agentId}`;
}

function readStore(agentId: string): VectorRecord[] {
  if (typeof localStorage === "undefined") return [];
  const raw = localStorage.getItem(key(agentId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as VectorRecord[];
  } catch {
    return [];
  }
}

const MAX_VECTORS = 500;

function writeStore(agentId: string, records: VectorRecord[]): void {
  if (typeof localStorage === "undefined") return;
  const trimmed = records.length > MAX_VECTORS ? records.slice(-MAX_VECTORS) : records;
  const serialized = JSON.stringify(trimmed);
  try {
    localStorage.setItem(key(agentId), serialized);
  } catch {
    try {
      const half = JSON.stringify(trimmed.slice(-Math.ceil(trimmed.length / 2)));
      localStorage.setItem(key(agentId), half);
    } catch {
      // Silent drop
    }
  }
}
