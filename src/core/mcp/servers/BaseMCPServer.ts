import type { MCPServerConfig, MCPToolResult } from "@/core/mcp/types";
import { mcpClient } from "@/core/mcp/MCPClient";

export abstract class BaseMCPServer {
  abstract readonly id: string;
  abstract readonly name: string;

  constructor(protected readonly config: MCPServerConfig) {}

  async connect(): Promise<void> {
    await mcpClient.connect(this.config);
  }

  async disconnect(): Promise<void> {
    await mcpClient.disconnect(this.config.id);
  }

  async call(toolName: string, params: Record<string, unknown>): Promise<MCPToolResult> {
    return mcpClient.executeTool(`${this.name}__${toolName}`, params);
  }
}
