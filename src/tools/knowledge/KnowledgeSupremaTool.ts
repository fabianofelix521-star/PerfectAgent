import { knowledgeBaseEngine } from "@/core/knowledge/KnowledgeBaseEngine";
import type { KnowledgeSearchResponse, KnowledgeSourceId } from "@/core/knowledge/types";
import {
  type ExecutionApproach,
  NexusToolBase,
  type NexusToolInput,
  type QualityAssessment,
} from "@/tools/core/NexusToolBase";
import { asNumber, asString, asStringArray, clamp01 } from "@/tools/core/toolUtils";

const DEFAULT_SOURCES: KnowledgeSourceId[] = [
  "local",
  "pubmed",
  "arxiv",
  "github",
  "crossref",
  "wikipedia",
];

export class KnowledgeSupremaTool extends NexusToolBase {
  id = "knowledge-suprema";
  name = "Knowledge Base Suprema";
  description =
    "Busca, agrega e injeta conhecimento em PubMed, arXiv, GitHub, Crossref, Wikipedia e RAG local.";
  category = "knowledge";

  protected async reason(input: NexusToolInput): Promise<ExecutionApproach> {
    const query = asString(input.params.query, JSON.stringify(input.params));
    const requestedSources = normalizeSources(asStringArray(input.params.sources));
    return {
      shouldProceed: query.trim().length >= 3,
      reason: query.trim().length >= 3 ? "" : "query muito curta para busca federada",
      strategy: "federated-knowledge-search-with-local-rag-ingestion",
      reasoning: `Knowledge Base Suprema vai consultar ${requestedSources.join(", ")} e reconciliar com o RAG local.`,
      alternativesConsidered: [
        "usar apenas web search genérica",
        "consultar somente memoria local",
      ],
      estimatedQuality: 0.86,
      estimatedLatencyMs: 1800,
    };
  }

  protected async executeCore(input: NexusToolInput): Promise<unknown> {
    const query = asString(input.params.query, JSON.stringify(input.params));
    const limit = Math.max(1, Math.min(asNumber(input.params.limit, 8), 20));
    const sources = normalizeSources(asStringArray(input.params.sources));

    const response = await knowledgeBaseEngine.search({
      query,
      limit,
      sources,
      includeLocal: input.params.includeLocal !== false,
      ingest: input.params.ingest === true,
      agentId: asString(input.params.agentId, input.context.agentId),
    });

    return {
      ...response,
      summary: response.results
        .slice(0, 5)
        .map((item, index) => `${index + 1}. [${item.source}] ${item.title}`)
        .join("\n"),
    };
  }

  protected async evaluate(result: unknown): Promise<QualityAssessment> {
    const response = result as KnowledgeSearchResponse | undefined;
    const resultCount = response?.results.length ?? 0;
    const sourceCount = new Set(response?.results.map((item) => item.source) ?? []).size;
    const requestedCount = Math.max(response?.sources.length ?? 1, 1);
    const errorPenalty = Math.min((response?.errors.length ?? 0) * 0.08, 0.24);
    const score = clamp01(0.42 + Math.min(resultCount / 8, 1) * 0.28 + (sourceCount / requestedCount) * 0.34 - errorPenalty);

    return {
      score,
      confidence: clamp01(score + 0.08),
      limitations: response?.errors.length
        ? response.errors.map((error) => `${error.source}: ${error.message}`)
        : score < 0.7
          ? ["poucas fontes retornaram resultados fortes"]
          : [],
      improvements: score < 0.75 ? ["refinar a query ou filtrar por fontes mais especificas"] : [],
    };
  }
}

function normalizeSources(sources: string[]): KnowledgeSourceId[] {
  const allowed = new Set(DEFAULT_SOURCES);
  const normalized = sources.filter(
    (source): source is KnowledgeSourceId => allowed.has(source as KnowledgeSourceId),
  );
  return normalized.length ? Array.from(new Set(normalized)) : DEFAULT_SOURCES;
}