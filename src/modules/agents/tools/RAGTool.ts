import { BaseAgentTool } from "@/modules/agents/tools/types";
import { memoryEngine } from "@/core/ai/memory/MemoryEngine";

export class RAGTool extends BaseAgentTool {
  id = "rag_search";
  description = "Busca semantica na base de conhecimento local do agente.";

  async execute(params: Record<string, unknown>): Promise<unknown> {
    const query = typeof params.query === "string" ? params.query : "";
    const agentId = typeof params.agentId === "string" ? params.agentId : "default";
    await memoryEngine.initialize(agentId);
    return memoryEngine.recall(query, { longTermLimit: 12, semanticLimit: 8, episodicLimit: 6 });
  }
}
