import { api } from "@/services/api";
import { BaseAgentTool } from "@/modules/agents/tools/types";

export class DataAnalysisTool extends BaseAgentTool {
  id = "data_analysis";
  description = "Analisa datasets tabulares e retorna estatisticas chave.";

  async execute(params: Record<string, unknown>): Promise<unknown> {
    return api.runTool({ kind: "json", args: params });
  }
}
