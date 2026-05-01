import type { Memory } from "@/core/ai/memory/types";

export class MemorySearch {
  rankAndMerge(memories: Memory[], query: string): Memory[] {
    const terms = query.toLowerCase().split(/\W+/).filter(Boolean);
    const unique = new Map<string, Memory>();

    for (const memory of memories) {
      const source = `${memory.content} ${(memory.tags ?? []).join(" ")}`.toLowerCase();
      const matched = terms.length
        ? terms.filter((term) => source.includes(term)).length / terms.length
        : 0;
      const score = (memory.score ?? 0) * 0.75 + matched * 0.25;
      const current = unique.get(memory.id);
      if (!current || (current.score ?? 0) < score) {
        unique.set(memory.id, {
          ...memory,
          score,
        });
      }
    }

    return Array.from(unique.values()).sort((a, b) => {
      const scoreA = a.score ?? 0;
      const scoreB = b.score ?? 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return b.timestamp - a.timestamp;
    });
  }
}
