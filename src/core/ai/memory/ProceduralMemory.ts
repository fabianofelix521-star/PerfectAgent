import { nanoid } from "nanoid";
import type { Memory, MemoryInput } from "@/core/ai/memory/types";

interface SkillTrace {
  id: string;
  title: string;
  recipe: string;
  tags: string[];
  lastUsedAt: number;
  useCount: number;
}

export class ProceduralMemory {
  private agentId = "default";

  async init(agentId: string): Promise<void> {
    this.agentId = agentId;
  }

  async learnSkill(input: MemoryInput): Promise<void> {
    const skills = read(this.agentId);
    const title = inferSkillTitle(input);
    const existing = skills.find((item) => item.title.toLowerCase() === title.toLowerCase());

    if (existing) {
      existing.recipe = input.content;
      existing.lastUsedAt = Date.now();
      existing.tags = dedupe([...(existing.tags ?? []), ...(input.tags ?? [])]);
      existing.useCount += 1;
    } else {
      skills.push({
        id: nanoid(),
        title,
        recipe: input.content,
        tags: input.tags ?? [],
        lastUsedAt: Date.now(),
        useCount: 1,
      });
    }

    write(this.agentId, skills);
  }

  async findRelevantSkills(query: string): Promise<Memory[]> {
    const skills = read(this.agentId);
    const terms = tokenize(query);

    return skills
      .map((skill) => {
        const source = `${skill.title} ${skill.recipe} ${(skill.tags ?? []).join(" ")}`.toLowerCase();
        const matched = terms.filter((term) => source.includes(term)).length;
        const score = terms.length === 0 ? 0 : matched / terms.length;
        return {
          id: skill.id,
          kind: "procedural" as const,
          type: "skill",
          content: `${skill.title}: ${skill.recipe}`,
          timestamp: skill.lastUsedAt,
          tags: skill.tags,
          score,
        };
      })
      .filter((item) => (item.score ?? 0) > 0)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }
}

function key(agentId: string): string {
  return `pa:memory:procedural:${agentId}`;
}

function read(agentId: string): SkillTrace[] {
  if (typeof localStorage === "undefined") return [];
  const raw = localStorage.getItem(key(agentId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as SkillTrace[];
  } catch {
    return [];
  }
}

const MAX_SKILLS = 300;

function write(agentId: string, data: SkillTrace[]): void {
  if (typeof localStorage === "undefined") return;
  const trimmed = data.length > MAX_SKILLS
    ? data.sort((a, b) => b.lastUsedAt - a.lastUsedAt).slice(0, MAX_SKILLS)
    : data;
  const serialized = JSON.stringify(trimmed);
  try {
    localStorage.setItem(key(agentId), serialized);
  } catch {
    try {
      const half = JSON.stringify(trimmed.slice(0, Math.ceil(trimmed.length / 2)));
      localStorage.setItem(key(agentId), half);
    } catch {
      // Silent drop
    }
  }
}

function inferSkillTitle(input: MemoryInput): string {
  const candidate = input.tags?.[0] ?? input.type;
  return candidate.replace(/[-_]/g, " ");
}

function tokenize(input: string): string[] {
  return input.toLowerCase().split(/\W+/).filter(Boolean);
}

function dedupe<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}
