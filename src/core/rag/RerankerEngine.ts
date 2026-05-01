import type { RetrievalHit } from "@/core/rag/types";

export class RerankerEngine {
  rerank(hits: RetrievalHit[], query: string): RetrievalHit[] {
    const terms = query.toLowerCase().split(/\W+/).filter(Boolean);
    return hits
      .map((hit) => {
        const boost = terms.some((term) => hit.chunk.content.toLowerCase().startsWith(term)) ? 0.05 : 0;
        return { ...hit, score: hit.score + boost };
      })
      .sort((a, b) => b.score - a.score);
  }
}
