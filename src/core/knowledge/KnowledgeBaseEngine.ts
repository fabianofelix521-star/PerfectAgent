import { memoryEngine } from "@/core/ai/memory/MemoryEngine";
import { ragEngine } from "@/core/rag/RAGEngine";
import { api } from "@/services/api";
import type {
  KnowledgeSearchParams,
  KnowledgeSearchResponse,
  KnowledgeSearchResult,
  KnowledgeSourceId,
} from "@/core/knowledge/types";

const DEFAULT_REMOTE_SOURCES: Array<Exclude<KnowledgeSourceId, "local">> = [
  "pubmed",
  "arxiv",
  "github",
  "crossref",
  "wikipedia",
];

const MAX_INGEST_RESULTS = 3;
const MAX_INGEST_TEXT_LENGTH = 1400;

export class KnowledgeBaseEngine {
  async search(params: KnowledgeSearchParams): Promise<KnowledgeSearchResponse> {
    const query = params.query.trim();
    const limit = Math.max(1, Math.min(Math.round(params.limit ?? 8), 20));
    const includeLocal = params.includeLocal ?? true;
    const ingest = params.ingest === true;
    const normalizedSources = normalizeSources(params.sources);
    const remoteSources = normalizedSources.filter(
      (source): source is Exclude<KnowledgeSourceId, "local"> => source !== "local",
    );

    const [localResults, remoteResponse] = await Promise.all([
      includeLocal ? this.searchLocal(query, Math.max(3, Math.ceil(limit / 2))) : Promise.resolve([]),
      remoteSources.length
        ? api.searchKnowledge({ query, limit, sources: remoteSources })
        : Promise.resolve({ query, sources: [], results: [], errors: [], fetchedAt: Date.now() }),
    ]);

    if (ingest && remoteResponse.results.length) {
      await this.ingestRemoteResults(
        remoteResponse.results.slice(0, Math.min(limit, MAX_INGEST_RESULTS)),
      );
    }

    const mergedResults = dedupeResults([...localResults, ...remoteResponse.results], limit);

    if (params.agentId) {
      await memoryEngine.initialize(params.agentId);
      await memoryEngine.remember({
        agentId: params.agentId,
        type: "knowledge",
        importance: 0.72,
        tags: ["knowledge", ...normalizedSources],
        content: buildMemorySummary(query, mergedResults),
        metadata: {
          query,
          results: mergedResults.slice(0, 5).map((item) => ({
            title: item.title,
            source: item.source,
            url: item.url,
          })),
        },
      });
    }

    return {
      query,
      sources: includeLocal ? ["local", ...remoteSources] : remoteSources,
      results: mergedResults,
      errors: remoteResponse.errors,
      fetchedAt: remoteResponse.fetchedAt,
    };
  }

  private async searchLocal(query: string, limit: number): Promise<KnowledgeSearchResult[]> {
    const chunks = await ragEngine.query(query, limit).catch(() => []);
    return chunks.map((chunk, index) => ({
      id: `local:${chunk.id}`,
      source: "local",
      title: String(chunk.metadata?.source ?? chunk.documentId ?? `Local ${index + 1}`),
      snippet: chunk.content,
      url: "",
      publishedAt: typeof chunk.metadata?.ingestedAt === "number"
        ? new Date(chunk.metadata.ingestedAt).toISOString()
        : undefined,
      score: Math.max(0.5, 0.9 - index * 0.08),
      metadata: chunk.metadata,
    }));
  }

  private async ingestRemoteResults(results: KnowledgeSearchResult[]): Promise<void> {
    await Promise.all(
      results.map((result) =>
        ragEngine.ingestText(
          `${result.source}:${result.title}`,
          compactKnowledgeRecord(result),
        ),
      ),
    );
  }
}

function compactKnowledgeRecord(result: KnowledgeSearchResult): string {
  return [
    result.title,
    truncateText(result.snippet, MAX_INGEST_TEXT_LENGTH),
    result.authors?.length ? `Authors: ${result.authors.slice(0, 4).join(", ")}` : "",
    result.url ? `URL: ${result.url}` : "",
    result.publishedAt ? `Published: ${result.publishedAt}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}...`;
}

function normalizeSources(sources?: KnowledgeSourceId[]): KnowledgeSourceId[] {
  if (!sources?.length) return ["local", ...DEFAULT_REMOTE_SOURCES];
  const allowed = new Set<KnowledgeSourceId>(["local", ...DEFAULT_REMOTE_SOURCES]);
  const normalized = sources.filter((source) => allowed.has(source));
  return normalized.length ? Array.from(new Set(normalized)) : ["local", ...DEFAULT_REMOTE_SOURCES];
}

function dedupeResults(results: KnowledgeSearchResult[], limit: number): KnowledgeSearchResult[] {
  const seen = new Set<string>();
  const deduped: KnowledgeSearchResult[] = [];
  for (const result of results) {
    const key = `${result.source}:${result.url || result.title.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(result);
    if (deduped.length >= limit) break;
  }
  return deduped.sort((left, right) => right.score - left.score);
}

function buildMemorySummary(query: string, results: KnowledgeSearchResult[]): string {
  const summary = results
    .slice(0, 5)
    .map((result, index) => `${index + 1}. [${result.source}] ${result.title} - ${result.snippet}`)
    .join("\n");
  return `Knowledge search for \"${query}\":\n${summary}`;
}

export const knowledgeBaseEngine = new KnowledgeBaseEngine();