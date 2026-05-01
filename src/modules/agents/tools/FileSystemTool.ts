import { api } from "@/services/api";
import { BaseAgentTool } from "@/modules/agents/tools/types";

export class FileSystemTool extends BaseAgentTool {
  id = "file_system";
  description = "Le e escreve arquivos no workspace com controles de seguranca.";

  async execute(params: Record<string, unknown>): Promise<unknown> {
    return api.runTool({ kind: "fs", args: params });
  }
}
