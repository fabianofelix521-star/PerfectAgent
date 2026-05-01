import type { Agent, AgentTask, TaskPlan } from "@/modules/agents/engine/types";
import type { Memory } from "@/core/ai/memory/types";

export class AgentPlanner {
  async createPlan(task: AgentTask, memories: Memory[], _agent: Agent): Promise<TaskPlan> {
    const context = memories.slice(0, 5).map((item) => item.content).join(" ");
    const chunks = splitTask(task.prompt, context);
    return {
      steps: chunks.map((description, idx) => ({
        id: `step-${idx + 1}`,
        description,
      })),
    };
  }
}

function splitTask(prompt: string, context: string): string[] {
  const baseline = prompt
    .split(/[\n.;]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  const steps = baseline.length > 0 ? baseline : [prompt.trim()];
  if (context.trim()) {
    steps.unshift("Revisar memoria relevante e restricoes antes da execucao.");
  }
  return steps;
}
