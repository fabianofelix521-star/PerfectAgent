import { nanoid } from "nanoid";
import type { RAGChunk, RAGDocument } from "@/core/rag/types";

export class ChunkingStrategy {
  split(document: RAGDocument, chunkSize = 900, overlap = 120): RAGChunk[] {
    const text = normalize(document.content);
    if (!text) return [];

    const chunks: RAGChunk[] = [];
    let index = 0;
    let start = 0;

    while (start < text.length) {
      const end = Math.min(text.length, start + chunkSize);
      const content = text.slice(start, end).trim();
      if (content) {
        chunks.push({
          id: `chunk-${nanoid(8)}`,
          documentId: document.id,
          content,
          index,
          metadata: document.metadata,
        });
        index += 1;
      }
      if (end >= text.length) break;
      start = Math.max(0, end - overlap);
    }

    return chunks;
  }
}

function normalize(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}
