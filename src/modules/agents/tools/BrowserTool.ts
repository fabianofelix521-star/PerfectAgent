import { BaseAgentTool } from "@/modules/agents/tools/types";
import { mcpToolExecutor } from "@/core/mcp/MCPToolExecutor";

export class BrowserTool extends BaseAgentTool {
  id = "browser_automation";
  description = "Navega em paginas via MCP puppeteer e captura evidencias.";

  async execute(params: Record<string, unknown>): Promise<unknown> {
    return mcpToolExecutor.execute("Puppeteer Browser__puppeteer_navigate", params);
  }
}
