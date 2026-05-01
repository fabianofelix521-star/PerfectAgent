import { nanoid } from "nanoid";
import type { RAGDocument } from "@/core/rag/types";

export class DocumentIngester {
  async ingestFromText(source: string, content: string): Promise<RAGDocument> {
    return {
      id: `doc-${nanoid(8)}`,
      source,
      content,
      metadata: {
        ingestedAt: Date.now(),
      },
    };
  }

  async ingestFromFile(file: File): Promise<RAGDocument> {
    const content = await file.text();
    return this.ingestFromText(file.name, content);
  }
}
