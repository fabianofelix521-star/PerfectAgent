import type { Agent, AgentTask } from "@/modules/agents/engine/types";

export class AgentCollaborator {
  pickCollaborators(task: AgentTask, agents: Agent[]): Agent[] {
    const tokens = task.prompt.toLowerCase();
    const selected = agents.filter((agent) => {
      const name = agent.name.toLowerCase();
      return tokens.includes(name) || agent.enabledTools.length >= 4;
    });

    return selected.length > 0 ? selected : agents.slice(0, 2);
  }

  buildCollaborationPrompt(task: AgentTask, collaborators: Agent[]): string {
    const roster = collaborators.map((item) => `- ${item.name}`).join("\n");
    return `Tarefa: ${task.prompt}\n\nAgentes colaboradores:\n${roster}`;
  }
}
