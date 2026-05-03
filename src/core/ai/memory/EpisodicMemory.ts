import { nanoid } from "nanoid";
import type { Memory, MemoryInput } from "@/core/ai/memory/types";

export class EpisodicMemory {
  private agentId = "default";

  async init(agentId: string): Promise<void> {
    this.agentId = agentId;
  }

  async record(input: MemoryInput): Promise<void> {
    const episodes = read(this.agentId);
    episodes.push({
      id: nanoid(),
      kind: "episodic",
      type: input.type,
      content: input.content,
      importance: input.importance,
      tags: input.tags,
      metadata: input.metadata,
      timestamp: Date.now(),
    });
    write(this.agentId, episodes.slice(-500));
  }

  async searchRelevant(query: string, limit = 5): Promise<Memory[]> {
    const episodes = read(this.agentId);
    const terms = tokenize(query);
    return episodes
      .map((item) => ({
        ...item,
        score: score(item.content, terms),
      }))
      .filter((item) => (item.score ?? 0) > 0)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, limit);
  }
}

function key(agentId: string): string {
  return `pa:memory:episodic:${agentId}`;
}

function read(agentId: string): Memory[] {
  if (typeof localStorage === "undefined") return [];
  const raw = localStorage.getItem(key(agentId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Memory[];
  } catch {
    return [];
  }
}

function write(agentId: string, data: Memory[]): void {
  if (typeof localStorage === "undefined") return;
  const serialized = JSON.stringify(data);
  try {
    localStorage.setItem(key(agentId), serialized);
  } catch {
    // Quota exceeded — keep most recent quarter and retry
    try {
      const quarter = JSON.stringify(data.slice(-Math.ceil(data.length / 4)));
      localStorage.setItem(key(agentId), quarter);
    } catch {
      // Silent drop
    }
  }
}

function tokenize(input: string): string[] {
  return input.toLowerCase().split(/\W+/).filter(Boolean);
}

function score(content: string, terms: string[]): number {
  const low = content.toLowerCase();
  let hit = 0;
  for (const term of terms) if (low.includes(term)) hit += 1;
  return terms.length === 0 ? 0 : hit / terms.length;
}
