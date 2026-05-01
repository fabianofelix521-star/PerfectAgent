import { api } from "@/services/api";
import { BaseAgentTool } from "@/modules/agents/tools/types";

export class CodeExecutionTool extends BaseAgentTool {
  id = "code_execution";
  description = "Executa codigo com isolamento e retorna logs.";

  async execute(params: Record<string, unknown>): Promise<unknown> {
    return api.runTool({
      kind: "custom",
      args: params,
      code: typeof params.code === "string" ? params.code : "return { ok: false, error: 'code ausente' };",
    });
  }
}
