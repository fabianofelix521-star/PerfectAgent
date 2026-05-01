import { skillRegistry } from "@/core/skills/SkillRegistry";
import type { Skill, SkillContext } from "@/core/skills/types";

export class SkillExecutor {
  async execute(skillId: string, input: unknown, context: SkillContext): Promise<unknown> {
    const skill = skillRegistry.get(skillId);
    if (!skill) throw new Error(`Skill nao encontrada: ${skillId}`);

    const output = await this.executeSkill(skill, input, context);
    skillRegistry.updateUsage(skillId);
    return output;
  }

  private async executeSkill(skill: Skill, input: unknown, context: SkillContext): Promise<unknown> {
    if (skill.type === "code" && skill.executor) {
      return skill.executor(input, context);
    }

    if (skill.type === "prompt") {
      return {
        mode: "prompt",
        prompt: renderPromptTemplate(skill.promptTemplate ?? skill.description, input),
      };
    }

    if (skill.type === "workflow" && skill.workflowDefinition) {
      const executed: unknown[] = [];
      for (const node of skill.workflowDefinition.nodes) {
        const tool = context.tools?.[node.action];
        if (!tool) {
          executed.push({ nodeId: node.id, skipped: true, reason: "tool_missing" });
          continue;
        }
        const result = await tool(node.args ?? {});
        executed.push({ nodeId: node.id, result });
      }
      return { mode: "workflow", executed };
    }

    if (skill.type === "composite") {
      const chain = skill.composedSkills ?? [];
      let cursor: unknown = input;
      for (const id of chain) {
        cursor = await this.execute(id, cursor, context);
      }
      return cursor;
    }

    throw new Error(`Skill sem executor: ${skill.id}`);
  }
}

function renderPromptTemplate(template: string, input: unknown): string {
  if (!input || typeof input !== "object") return template;
  const dict = input as Record<string, unknown>;
  let output = template;
  for (const [key, value] of Object.entries(dict)) {
    output = output.replaceAll(`{{${key}}}`, String(value));
  }
  return output;
}

export const skillExecutor = new SkillExecutor();
