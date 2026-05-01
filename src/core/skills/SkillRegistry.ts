import type { Skill } from "@/core/skills/types";
import { BUILTIN_SKILLS } from "@/core/skills/builtin";

export class SkillRegistry {
  private readonly skills = new Map<string, Skill>();

  constructor() {
    for (const skill of BUILTIN_SKILLS) this.register(skill);
  }

  register(skill: Skill): void {
    this.skills.set(skill.id, skill);
  }

  unregister(skillId: string): void {
    this.skills.delete(skillId);
  }

  get(skillId: string): Skill | undefined {
    return this.skills.get(skillId);
  }

  list(): Skill[] {
    return Array.from(this.skills.values());
  }

  listByCategory(category: Skill["category"]): Skill[] {
    return this.list().filter((skill) => skill.category === category);
  }

  topRated(limit = 20): Skill[] {
    return this.list()
      .sort((a, b) => b.rating - a.rating || b.usageCount - a.usageCount)
      .slice(0, limit);
  }

  updateUsage(skillId: string): void {
    const skill = this.skills.get(skillId);
    if (!skill) return;
    this.skills.set(skillId, {
      ...skill,
      usageCount: skill.usageCount + 1,
    });
  }
}

export const skillRegistry = new SkillRegistry();
