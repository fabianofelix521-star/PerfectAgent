import { useMemo } from "react";
import { useConfig } from "@/stores/config";
import { skillBuilder } from "@/core/skills/SkillBuilder";
import { skillExecutor } from "@/core/skills/SkillExecutor";
import { skillRegistry } from "@/core/skills/SkillRegistry";
import type { SkillContext } from "@/core/skills/types";

export function useSkills() {
  const storeSkills = useConfig((s) => s.skills);
  const upsertSkill = useConfig((s) => s.upsertSkill);
  const removeSkill = useConfig((s) => s.removeSkill);

  const skills = useMemo(() => {
    const registrySkills = skillRegistry.list().map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      systemPrompt: item.promptTemplate ?? item.description,
      tags: item.tags,
      enabled: true,
      builtIn: item.author === "builtin",
    }));

    const normalizedStoreSkills = storeSkills.map((item) => ({
      ...item,
      builtIn: Boolean(item.builtIn),
    }));

    const merged = new Map<string, (typeof registrySkills)[number]>();
    for (const item of registrySkills) merged.set(item.id, item);
    for (const item of normalizedStoreSkills) merged.set(item.id, item);
    return Array.from(merged.values());
  }, [storeSkills]);

  function createSkill(input: {
    name: string;
    description: string;
    systemPrompt: string;
    tags?: string[];
  }) {
    const built = skillBuilder.create({
      name: input.name,
      description: input.description,
      promptTemplate: input.systemPrompt,
      tags: input.tags ?? [],
      author: "user",
      type: "prompt",
      category: "custom",
      isPublic: false,
    });

    skillRegistry.register(built);
    upsertSkill({
      id: built.id,
      name: built.name,
      description: built.description,
      systemPrompt: built.promptTemplate ?? built.description,
      tags: built.tags,
      enabled: true,
    });

    return built;
  }

  async function useSkill(skillId: string, payload: unknown) {
    const context: SkillContext = {
      requestId: `skill-run-${Date.now().toString(36)}`,
      agentId: "ui",
    };
    return skillExecutor.execute(skillId, payload, context);
  }

  function installSkill(skillId: string): boolean {
    const skill = skillRegistry.get(skillId);
    if (!skill) return false;
    upsertSkill({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      systemPrompt: skill.promptTemplate ?? skill.description,
      tags: skill.tags,
      enabled: true,
      builtIn: skill.author === "builtin",
    });
    return true;
  }

  return {
    skills,
    installSkill,
    createSkill,
    useSkill,
    removeSkill,
  };
}
