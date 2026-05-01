import type { RAGChunk, RetrievalHit, VectorStore } from "@/core/rag/types";

export class VectorStoreAdapter implements VectorStore {
  private static readonly MAX_CHUNKS = 320;
  private chunks: RAGChunk[] = [];

  async upsert(chunks: RAGChunk[]): Promise<void> {
    const byId = new Map(this.chunks.map((item) => [item.id, item]));
    for (const chunk of chunks) byId.set(chunk.id, chunk);
    this.chunks = Array.from(byId.values())
      .sort((left, right) => chunkTimestamp(right) - chunkTimestamp(left))
      .slice(0, VectorStoreAdapter.MAX_CHUNKS);
  }

  async query(query: string, limit: number): Promise<RetrievalHit[]> {
    const terms = tokenize(query);
    return this.chunks
      .map((chunk) => ({
        chunk,
        score: tfScore(chunk.content, terms),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async clear(): Promise<void> {
    this.chunks = [];
  }
}

function chunkTimestamp(chunk: RAGChunk): number {
  const value = chunk.metadata?.ingestedAt;
  return typeof value === "number" ? value : 0;
}

function tokenize(input: string): string[] {
  return input.toLowerCase().split(/\W+/).filter(Boolean);
}

function tfScore(content: string, terms: string[]): number {
  if (terms.length === 0) return 0;
  const low = content.toLowerCase();
  let hits = 0;
  for (const term of terms) {
    if (low.includes(term)) hits += 1;
  }
  return hits / terms.length;
}
