import { BaseAgentTool } from "@/modules/agents/tools/types";
import { mcpToolExecutor } from "@/core/mcp/MCPToolExecutor";

export class EmailTool extends BaseAgentTool {
  id = "email_send";
  description = "Envia emails via servidor MCP configurado.";

  async execute(params: Record<string, unknown>): Promise<unknown> {
    return mcpToolExecutor.execute("Gmail__send_email", params);
  }
}
