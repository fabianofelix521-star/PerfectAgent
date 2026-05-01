import type { MCPToolResult } from "@/core/mcp/types";
import { mcpClient } from "@/core/mcp/MCPClient";

export class MCPToolExecutor {
  async execute(
    toolName: string,
    params: Record<string, unknown> = {},
  ): Promise<MCPToolResult> {
    return mcpClient.executeTool(toolName, params);
  }
}

export const mcpToolExecutor = new MCPToolExecutor();
