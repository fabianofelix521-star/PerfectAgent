import { SimpleNexusTool } from "@/tools/core/SimpleNexusTool";

export class SemanticSearchTool extends SimpleNexusTool {
  constructor() {
    super({
      id: "semantic-search",
      name: "Semantic Search",
      description: "Busca memoria por significado, sinonimos e proximidade de dominio com explicacao de relevancia.",
      category: "memory",
      keywords: ["semantic", "search", "memory", "similar", "retrieve", "knowledge"],
      strategy: "semantic-relevance-ranking",
    });
  }
}
