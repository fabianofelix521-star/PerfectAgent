import type { AITool } from "@/modules/agents/engine/types";

export interface AgentTool {
  id: string;
  description: string;
  execute(params: Record<string, unknown>): Promise<unknown>;
  toAIToolFormat(): AITool;
}

export abstract class BaseAgentTool implements AgentTool {
  abstract id: string;
  abstract description: string;

  abstract execute(params: Record<string, unknown>): Promise<unknown>;

  toAIToolFormat(): AITool {
    return {
      type: "function",
      function: {
        name: this.id,
        description: this.description,
        parameters: {
          type: "object",
          additionalProperties: true,
        },
      },
    };
  }
}
