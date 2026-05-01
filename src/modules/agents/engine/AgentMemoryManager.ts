import { memoryEngine } from "@/core/ai/memory/MemoryEngine";
import type { AgentTask } from "@/modules/agents/engine/types";

export class AgentMemoryManager {
  async initialize(agentId: string): Promise<void> {
    await memoryEngine.initialize(agentId);
  }

  async recordTask(agentId: string, task: AgentTask, result: string): Promise<void> {
    await memoryEngine.remember({
      agentId,
      content: `Task: ${task.prompt}\nResult: ${result}`,
      type: "episodic",
      importance: 0.8,
      tags: ["task", "completed"],
    });
  }
}
