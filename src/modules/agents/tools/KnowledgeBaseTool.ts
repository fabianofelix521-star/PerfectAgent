import type { AITool } from "@/modules/agents/engine/types";
import { knowledgeBaseEngine } from "@/core/knowledge/KnowledgeBaseEngine";
import { BaseAgentTool } from "@/modules/agents/tools/types";
import type { KnowledgeSourceId } from "@/core/knowledge/types";

const SOURCES: KnowledgeSourceId[] = [
  "local",
  "pubmed",
  "arxiv",
  "github",
  "crossref",
  "wikipedia",
];

export class KnowledgeBaseTool extends BaseAgentTool {
  id = "knowledge_base_search";
  description =
    "Busca conhecimento em PubMed, arXiv, GitHub, Crossref, Wikipedia e RAG local, com ingestao automatica no contexto do agente.";

  async execute(params: Record<string, unknown>): Promise<unknown> {
    const query = typeof params.query === "string" ? params.query : "";
    const agentId = typeof params.agentId === "string" ? params.agentId : "default";
    const limit = typeof params.limit === "number" ? params.limit : 8;
    const sources = Array.isArray(params.sources)
      ? params.sources.filter((item): item is KnowledgeSourceId => typeof item === "string" && SOURCES.includes(item as KnowledgeSourceId))
      : undefined;

    return knowledgeBaseEngine.search({
      query,
      limit,
      sources,
      includeLocal: params.includeLocal !== false,
      ingest: params.ingest === true,
      agentId,
    });
  }

  toAIToolFormat(): AITool {
    return {
      type: "function",
      function: {
        name: this.id,
        description: this.description,
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Termo ou pergunta a buscar na base de conhecimento suprema.",
            },
            limit: {
              type: "number",
              description: "Numero maximo de resultados agregados.",
            },
            sources: {
              type: "array",
              items: {
                type: "string",
                enum: SOURCES,
              },
              description: "Fontes opcionais: local, pubmed, arxiv, github, crossref, wikipedia.",
            },
            includeLocal: {
              type: "boolean",
            },
            ingest: {
              type: "boolean",
              description: "Quando true, adiciona uma amostra pequena dos resultados ao cache local leve.",
            },
            agentId: {
              type: "string",
            },
          },
          required: ["query"],
          additionalProperties: true,
        },
      },
    };
  }
}