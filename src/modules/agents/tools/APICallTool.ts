import { api } from "@/services/api";
import { BaseAgentTool } from "@/modules/agents/tools/types";

export class APICallTool extends BaseAgentTool {
  id = "api_call";
  description = "Executa chamadas HTTP externas.";

  async execute(params: Record<string, unknown>): Promise<unknown> {
    return api.runTool({ kind: "http", args: params });
  }
}
