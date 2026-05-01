import { nanoid } from "nanoid";
import type { Memory, MemoryInput } from "@/core/ai/memory/types";

const LIMIT = 300;

export class ShortTermMemory {
  private readonly byAgent = new Map<string, Memory[]>();
  private agentId = "default";

  async init(agentId: string): Promise<void> {
    this.agentId = agentId;
    if (!this.byAgent.has(agentId)) this.byAgent.set(agentId, []);
  }

  async add(input: MemoryInput): Promise<void> {
    const bucket = this.byAgent.get(this.agentId) ?? [];
    bucket.push({
      id: nanoid(),
      kind: "short-term",
      type: input.type,
      content: input.content,
      timestamp: Date.now(),
      importance: input.importance,
      tags: input.tags,
      metadata: input.metadata,
    });
    while (bucket.length > LIMIT) bucket.shift();
    this.byAgent.set(this.agentId, bucket);
  }

  async getRecent(limit = 20): Promise<Memory[]> {
    const bucket = this.byAgent.get(this.agentId) ?? [];
    return bucket.slice(Math.max(0, bucket.length - limit)).reverse();
  }
}
