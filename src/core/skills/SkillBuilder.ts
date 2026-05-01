import { nanoid } from "nanoid";
import type { Skill } from "@/core/skills/types";

export class SkillBuilder {
  create(input: Partial<Skill> & Pick<Skill, "name" | "description">): Skill {
    return {
      id: input.id ?? `skill-${nanoid(8)}`,
      name: input.name,
      description: input.description,
      category: input.category ?? "custom",
      version: input.version ?? "1.0.0",
      author: input.author ?? "user",
      inputSchema: input.inputSchema ?? {},
      outputSchema: input.outputSchema ?? {},
      type: input.type ?? "prompt",
      promptTemplate: input.promptTemplate,
      executor: input.executor,
      workflowDefinition: input.workflowDefinition,
      composedSkills: input.composedSkills,
      tags: input.tags ?? [],
      usageCount: input.usageCount ?? 0,
      rating: input.rating ?? 0,
      isPublic: input.isPublic ?? false,
      createdAt: input.createdAt ?? new Date(),
    };
  }
}

export const skillBuilder = new SkillBuilder();
