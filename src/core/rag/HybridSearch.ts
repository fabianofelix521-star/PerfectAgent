import type { RetrievalHit } from "@/core/rag/types";

export class HybridSearch {
  merge(semantic: RetrievalHit[], lexical: RetrievalHit[], limit = 8): RetrievalHit[] {
    const merged = new Map<string, RetrievalHit>();

    for (const item of [...semantic, ...lexical]) {
      const current = merged.get(item.chunk.id);
      if (!current || current.score < item.score) {
        merged.set(item.chunk.id, item);
      }
    }

    return Array.from(merged.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}
