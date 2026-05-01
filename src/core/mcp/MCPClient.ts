import { MCPConnectionManager } from "@/core/mcp/MCPConnectionManager";
import type {
  AITool,
  MCPServerConfig,
  MCPTool,
  MCPToolResult,
} from "@/core/mcp/types";

export class MCPClient {
  private readonly manager = new MCPConnectionManager();
  private readonly toolCache = new Map<string, MCPTool[]>();

  async connect(serverConfig: MCPServerConfig): Promise<void> {
    const connection = this.manager.set(serverConfig);
    await connection.initialize();
    const tools = await connection.listTools();
    this.toolCache.set(serverConfig.id, tools);
  }

  async disconnect(serverId: string): Promise<void> {
    const connection = this.manager.get(serverId);
    if (connection) await connection.close();
    this.manager.delete(serverId);
    this.toolCache.delete(serverId);
  }

  getAllTools(): MCPTool[] {
    const all: MCPTool[] = [];
    for (const [serverId, tools] of this.toolCache.entries()) {
      const connection = this.manager.get(serverId);
      const serverName = connection?.config.name ?? serverId;
      all.push(
        ...tools.map((tool) => ({
          ...tool,
          name: `${serverName}__${tool.name}`,
          serverId,
        })),
      );
    }
    return all;
  }

  async executeTool(
    toolName: string,
    params: Record<string, unknown>,
  ): Promise<MCPToolResult> {
    const [serverId, actualToolName] = this.resolveToolServer(toolName);
    const connection = this.manager.get(serverId);
    if (!connection) {
      throw new Error(`Servidor MCP nao encontrado: ${serverId}`);
    }
    return connection.callTool(actualToolName, params);
  }

  toAITools(serverId?: string): AITool[] {
    const tools = serverId
      ? (this.toolCache.get(serverId) ?? [])
      : this.getAllTools();

    return tools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));
  }

  async testConnection(serverId: string): Promise<{
    success: boolean;
    latency: number;
    toolCount: number;
    error?: string;
  }> {
    const connection = this.manager.get(serverId);
    if (!connection) {
      return { success: false, latency: 0, toolCount: 0, error: "Servidor nao conectado." };
    }

    const start = Date.now();
    try {
      const tools = await connection.listTools();
      this.toolCache.set(serverId, tools);
      return {
        success: true,
        latency: Date.now() - start,
        toolCount: tools.length,
      };
    } catch (error) {
      return {
        success: false,
        latency: Date.now() - start,
        toolCount: 0,
        error: (error as Error).message,
      };
    }
  }

  private resolveToolServer(toolName: string): [string, string] {
    const split = toolName.split("__");
    if (split.length > 1) {
      const serverName = split[0];
      const name = split.slice(1).join("__");
      for (const connection of this.manager.list()) {
        if (connection.config.name === serverName) {
          return [connection.config.id, name];
        }
      }
    }

    for (const [serverId, tools] of this.toolCache.entries()) {
      const hit = tools.find((tool) => tool.name === toolName);
      if (hit) return [serverId, toolName];
    }

    throw new Error(`Tool MCP nao encontrada: ${toolName}`);
  }
}

export const mcpClient = new MCPClient();
