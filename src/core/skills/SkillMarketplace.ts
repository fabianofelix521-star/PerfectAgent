import { skillRegistry } from "@/core/skills/SkillRegistry";
import type { Skill } from "@/core/skills/types";

export class SkillMarketplace {
  search(query: string): Skill[] {
    const needle = query.toLowerCase().trim();
    if (!needle) return skillRegistry.list().filter((item) => item.isPublic);

    return skillRegistry
      .list()
      .filter((item) => item.isPublic)
      .filter((item) => {
        const source = `${item.name} ${item.description} ${item.tags.join(" ")}`.toLowerCase();
        return source.includes(needle);
      })
      .sort((a, b) => b.rating - a.rating || b.usageCount - a.usageCount);
  }

  publish(skillId: string): Skill {
    const skill = skillRegistry.get(skillId);
    if (!skill) throw new Error(`Skill nao encontrada: ${skillId}`);
    const published = { ...skill, isPublic: true };
    skillRegistry.register(published);
    return published;
  }
}

export const skillMarketplace = new SkillMarketplace();
