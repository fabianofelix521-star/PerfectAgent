import { toolRegistry } from "@/modules/agents/engine/ToolRegistry";

export class ToolExecutor {
  execute(toolId: string, params: Record<string, unknown>): Promise<unknown> {
    const tool = toolRegistry.get(toolId);
    if (!tool) throw new Error(`Tool nao encontrada: ${toolId}`);
    return tool.execute(params);
  }

  getTool(toolId: string) {
    return toolRegistry.get(toolId);
  }
}

export const toolExecutor = new ToolExecutor();
