import type { RetrievalHit, VectorStore } from "@/core/rag/types";

export class RetrievalEngine {
  constructor(private readonly store: VectorStore) {}

  retrieve(query: string, limit = 8): Promise<RetrievalHit[]> {
    return this.store.query(query, limit);
  }
}
