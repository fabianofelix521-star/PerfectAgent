import { BaseAgentTool } from "@/modules/agents/tools/types";
import { mcpToolExecutor } from "@/core/mcp/MCPToolExecutor";

export class DatabaseTool extends BaseAgentTool {
  id = "database_query";
  description = "Executa queries em bancos conectados via MCP.";

  async execute(params: Record<string, unknown>): Promise<unknown> {
    const toolName =
      typeof params.engine === "string" && params.engine === "sqlite"
        ? "SQLite__read_query"
        : "PostgreSQL__query";
    return mcpToolExecutor.execute(toolName, params);
  }
}
