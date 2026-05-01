import { BaseAgentTool } from "@/modules/agents/tools/types";
import { mcpToolExecutor } from "@/core/mcp/MCPToolExecutor";

export class GitTool extends BaseAgentTool {
  id = "git_ops";
  description = "Executa operacoes Git locais de forma controlada.";

  async execute(params: Record<string, unknown>): Promise<unknown> {
    return mcpToolExecutor.execute("Git Local__git_status", params);
  }
}
