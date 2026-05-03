import { nanoid } from "nanoid";
import type { Memory, MemoryInput } from "@/core/ai/memory/types";

interface SemanticNode {
  id: string;
  name: string;
  type: string;
  aliases: string[];
  facts: string[];
  tags: string[];
  updatedAt: number;
}

export class SemanticMemory {
  private agentId = "default";

  async init(agentId: string): Promise<void> {
    this.agentId = agentId;
  }

  async addEntity(input: MemoryInput): Promise<void> {
    const nodes = read(this.agentId);
    const entityName = extractEntityName(input.content) ?? input.type;
    const hit = nodes.find((item) => item.name.toLowerCase() === entityName.toLowerCase());

    if (hit) {
      hit.facts = dedupe([...hit.facts, input.content]).slice(-100);
      hit.tags = dedupe([...(hit.tags ?? []), ...(input.tags ?? [])]).slice(-50);
      hit.updatedAt = Date.now();
    } else {
      nodes.push({
        id: nanoid(),
        name: entityName,
        type: input.type,
        aliases: [],
        facts: [input.content],
        tags: input.tags ?? [],
        updatedAt: Date.now(),
      });
    }

    write(this.agentId, nodes);
  }

  async getRelated(query: string, limit = 5): Promise<Memory[]> {
    const terms = tokenize(query);
    const nodes = read(this.agentId);
    return nodes
      .map((node) => {
        const source = `${node.name} ${node.aliases.join(" ")} ${node.facts.join(" ")}`;
        const matched = terms.filter((term) => source.toLowerCase().includes(term)).length;
        const score = terms.length === 0 ? 0 : matched / terms.length;
        return {
          id: node.id,
          kind: "semantic" as const,
          type: node.type,
          content: `${node.name}: ${node.facts.slice(-3).join(" | ")}`,
          timestamp: node.updatedAt,
          tags: node.tags,
          score,
        };
      })
      .filter((item) => (item.score ?? 0) > 0)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, limit);
  }
}

function key(agentId: string): string {
  return `pa:memory:semantic:${agentId}`;
}

function read(agentId: string): SemanticNode[] {
  if (typeof localStorage === "undefined") return [];
  const raw = localStorage.getItem(key(agentId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as SemanticNode[];
  } catch {
    return [];
  }
}

const MAX_NODES = 300;

function write(agentId: string, data: SemanticNode[]): void {
  if (typeof localStorage === "undefined") return;
  const trimmed = data.length > MAX_NODES
    ? data.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_NODES)
    : data;
  const serialized = JSON.stringify(trimmed);
  try {
    localStorage.setItem(key(agentId), serialized);
  } catch {
    // Quota exceeded — evict half and retry
    try {
      const half = JSON.stringify(trimmed.slice(0, Math.ceil(trimmed.length / 2)));
      localStorage.setItem(key(agentId), half);
    } catch {
      // Storage completely full — silent drop to avoid crashing the UI
    }
  }
}

function extractEntityName(text: string): string | null {
  const m = text.match(/\b([A-Z][a-z0-9_-]{2,})\b/);
  return m?.[1] ?? null;
}

function tokenize(input: string): string[] {
  return input.toLowerCase().split(/\W+/).filter(Boolean);
}

function dedupe<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}
