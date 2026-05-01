import { nanoid } from "nanoid";
import { EmbeddingEngine } from "@/core/ai/memory/EmbeddingEngine";
import { LocalVectorStoreAdapter } from "@/core/ai/memory/LocalVectorStoreAdapter";
import type { Memory, MemoryInput, VectorStoreAdapter } from "@/core/ai/memory/types";

export class LongTermMemory {
  private vectorStore: VectorStoreAdapter;
  private embeddingEngine: EmbeddingEngine;
  private agentId = "default";

  constructor(
    vectorStore: VectorStoreAdapter = new LocalVectorStoreAdapter(),
    embeddingEngine: EmbeddingEngine = new EmbeddingEngine(),
  ) {
    this.vectorStore = vectorStore;
    this.embeddingEngine = embeddingEngine;
  }

  async init(agentId: string): Promise<void> {
    this.agentId = agentId;
    await this.embeddingEngine.initialize();
    await this.vectorStore.init(agentId);
  }

  async store(input: MemoryInput): Promise<void> {
    const embedding = await this.embeddingEngine.embed(input.content);
    await this.vectorStore.upsert({
      id: nanoid(),
      values: embedding,
      metadata: {
        agentId: input.agentId,
        content: input.content,
        type: input.type,
        importance: input.importance,
        timestamp: Date.now(),
        tags: input.tags,
      },
    });
  }

  async search(
    query: string,
    limit = 10,
    filter?: Record<string, unknown>,
  ): Promise<Memory[]> {
    const queryEmbedding = await this.embeddingEngine.embed(query);
    const results = await this.vectorStore.query({
      vector: queryEmbedding,
      topK: limit,
      filter: { agentId: this.agentId, ...(filter ?? {}) },
      includeMetadata: true,
    });

    return results.matches.map((match) => ({
      id: match.id,
      kind: "long-term",
      content: match.metadata.content,
      type: match.metadata.type,
      score: match.score,
      timestamp: match.metadata.timestamp,
      tags: match.metadata.tags,
      importance: match.metadata.importance,
    }));
  }

  async forget(memoryId: string): Promise<void> {
    await this.vectorStore.delete(memoryId);
  }

  async update(memoryId: string, content: string): Promise<void> {
    const embedding = await this.embeddingEngine.embed(content);
    await this.vectorStore.upsert({
      id: memoryId,
      values: embedding,
      metadata: {
        agentId: this.agentId,
        content,
        type: "fact",
        timestamp: Date.now(),
      },
    });
  }

  async getByTags(tags: string[]): Promise<Memory[]> {
    const records = await this.search(tags.join(" "), 30);
    return records.filter((item) => item.tags?.some((tag) => tags.includes(tag)));
  }
}
