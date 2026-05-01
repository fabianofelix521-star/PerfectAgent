import { BaseAgentTool } from "@/modules/agents/tools/types";
import { mcpToolExecutor } from "@/core/mcp/MCPToolExecutor";

export class ImageGenTool extends BaseAgentTool {
  id = "image_generation";
  description = "Gera imagens por IA usando servidor MCP de media.";

  async execute(params: Record<string, unknown>): Promise<unknown> {
    return mcpToolExecutor.execute("EverArt Image Gen__generate_image", params);
  }
}
