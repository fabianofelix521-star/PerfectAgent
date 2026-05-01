import { agentRunner } from "@/modules/agents/engine/AgentRunner";
import { AgentCollaborator } from "@/modules/agents/engine/AgentCollaborator";
import type { Agent, AgentStep, AgentTask, AgentTaskResult } from "@/modules/agents/engine/types";

export class AgentOrchestrator {
  private collaborator = new AgentCollaborator();

  async run(
    lead: Agent,
    task: AgentTask,
    roster: Agent[],
    onStep: (step: AgentStep) => void,
  ): Promise<AgentTaskResult> {
    const collaborators = this.collaborator.pickCollaborators(task, roster.filter((item) => item.id !== lead.id));
    const prompt = this.collaborator.buildCollaborationPrompt(task, collaborators);

    const delegatedTask: AgentTask = {
      ...task,
      prompt: `${task.prompt}\n\n${prompt}`,
      startedAt: task.startedAt ?? new Date(),
    };

    return agentRunner.run(lead, delegatedTask, onStep);
  }
}

export const agentOrchestrator = new AgentOrchestrator();
