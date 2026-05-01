import { api } from "@/services/api";
import type { MCPServerConfig, MCPTool, MCPToolResult } from "@/core/mcp/types";

export class MCPConnection {
  constructor(public readonly config: MCPServerConfig) {}

  async initialize(): Promise<void> {
    if (this.config.transport === "http" && !this.config.url) {
      throw new Error("Servidor MCP HTTP sem URL.");
    }
  }

  async listTools(): Promise<MCPTool[]> {
    if (!this.config.url) return [];
    const result = await api.mcpList({
      url: this.config.url,
      apiKey: this.config.apiKey,
    });

    if (!result.ok) throw new Error(result.error ?? "Falha ao listar tools MCP.");
    return result.tools ?? [];
  }

  async callTool(
    name: string,
    params: Record<string, unknown>,
  ): Promise<MCPToolResult> {
    if (!this.config.url) {
      return { ok: false, error: "URL do servidor MCP nao configurada." };
    }

    const result = await api.mcpCall({
      url: this.config.url,
      apiKey: this.config.apiKey,
      name,
      arguments: params,
    });

    return {
      ok: result.ok,
      result: result.result,
      error: result.error,
      latencyMs: result.latencyMs,
    };
  }

  async close(): Promise<void> {
    return Promise.resolve();
  }
}

export class MCPConnectionManager {
  private readonly connections = new Map<string, MCPConnection>();

  set(config: MCPServerConfig): MCPConnection {
    const connection = new MCPConnection(config);
    this.connections.set(config.id, connection);
    return connection;
  }

  get(serverId: string): MCPConnection | undefined {
    return this.connections.get(serverId);
  }

  delete(serverId: string): void {
    this.connections.delete(serverId);
  }

  list(): MCPConnection[] {
    return Array.from(this.connections.values());
  }
}
