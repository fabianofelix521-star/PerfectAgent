export interface RAGDocument {
  id: string;
  source: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface RAGChunk {
  id: string;
  documentId: string;
  content: string;
  index: number;
  metadata?: Record<string, unknown>;
}

export interface RetrievalHit {
  chunk: RAGChunk;
  score: number;
}

export interface VectorStore {
  upsert(chunks: RAGChunk[]): Promise<void>;
  query(query: string, limit: number): Promise<RetrievalHit[]>;
  clear(): Promise<void>;
}
