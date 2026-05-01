import { BaseAgentTool } from "@/modules/agents/tools/types";
import { mcpToolExecutor } from "@/core/mcp/MCPToolExecutor";

export class MCPTool extends BaseAgentTool {
  id = "mcp_tool";
  description = "Executa qualquer tool de qualquer servidor MCP conectado.";

  async execute(params: Record<string, unknown>): Promise<unknown> {
    const name = typeof params.name === "string" ? params.name : "";
    const args =
      params.args && typeof params.args === "object"
        ? (params.args as Record<string, unknown>)
        : {};
    if (!name) {
      return { ok: false, error: "Campo 'name' da tool MCP e obrigatorio." };
    }
    return mcpToolExecutor.execute(name, args);
  }
}
