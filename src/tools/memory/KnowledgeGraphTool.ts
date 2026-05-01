import { SimpleNexusTool } from "@/tools/core/SimpleNexusTool";

export class KnowledgeGraphTool extends SimpleNexusTool {
  constructor() {
    super({
      id: "knowledge-graph",
      name: "Knowledge Graph",
      description: "Transforma entidades, claims e relacoes em grafo de conhecimento navegavel.",
      category: "memory",
      keywords: ["graph", "knowledge", "entity", "relation", "claim", "node", "edge"],
      strategy: "entity-relation-graph-building",
    });
  }
}
