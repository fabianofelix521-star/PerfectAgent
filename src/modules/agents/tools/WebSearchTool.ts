import { api } from "@/services/api";
import { BaseAgentTool } from "@/modules/agents/tools/types";

export class WebSearchTool extends BaseAgentTool {
  id = "web_search";
  description = "Busca na web em tempo real e retorna resultado estruturado.";

  async execute(params: Record<string, unknown>): Promise<unknown> {
    return api.runTool({
      kind: "websearch",
      args: params,
    });
  }
}
