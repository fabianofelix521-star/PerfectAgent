import { BaseAgentTool } from "@/modules/agents/tools/types";
import { mcpToolExecutor } from "@/core/mcp/MCPToolExecutor";

export class CalendarTool extends BaseAgentTool {
  id = "calendar_event";
  description = "Cria e consulta eventos de calendario via MCP.";

  async execute(params: Record<string, unknown>): Promise<unknown> {
    return mcpToolExecutor.execute("Calendar__create_event", params);
  }
}
