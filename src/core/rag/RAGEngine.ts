import { ChunkingStrategy } from "@/core/rag/ChunkingStrategy";
import { DocumentIngester } from "@/core/rag/DocumentIngester";
import { RetrievalEngine } from "@/core/rag/RetrievalEngine";
import { RerankerEngine } from "@/core/rag/RerankerEngine";
import { HybridSearch } from "@/core/rag/HybridSearch";
import { VectorStoreAdapter } from "@/core/rag/VectorStoreAdapter";
import type { RAGChunk, RAGDocument } from "@/core/rag/types";

export class RAGEngine {
  private readonly ingester = new DocumentIngester();
  private readonly chunking = new ChunkingStrategy();
  private readonly store = new VectorStoreAdapter();
  private readonly retrieval = new RetrievalEngine(this.store);
  private readonly reranker = new RerankerEngine();
  private readonly hybrid = new HybridSearch();

  async ingestText(source: string, content: string): Promise<RAGChunk[]> {
    const doc = await this.ingester.ingestFromText(source, content);
    return this.ingestDocument(doc);
  }

  async ingestDocument(document: RAGDocument): Promise<RAGChunk[]> {
    const chunks = this.chunking.split(document);
    await this.store.upsert(chunks);
    return chunks;
  }

  async query(query: string, limit = 8): Promise<RAGChunk[]> {
    const semantic = await this.retrieval.retrieve(query, limit * 2);
    const lexical = await this.retrieval.retrieve(query, limit * 2);
    const merged = this.hybrid.merge(semantic, lexical, limit * 2);
    const reranked = this.reranker.rerank(merged, query).slice(0, limit);
    return reranked.map((item) => item.chunk);
  }

  async reset(): Promise<void> {
    await this.store.clear();
  }
}

export const ragEngine = new RAGEngine();
