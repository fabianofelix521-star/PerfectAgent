export type KnowledgeSourceId =
  | "local"
  | "pubmed"
  | "arxiv"
  | "github"
  | "crossref"
  | "wikipedia";

export interface KnowledgeSearchResult {
  id: string;
  source: KnowledgeSourceId;
  title: string;
  snippet: string;
  url: string;
  authors?: string[];
  publishedAt?: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeSearchResponse {
  query: string;
  sources: KnowledgeSourceId[];
  results: KnowledgeSearchResult[];
  errors: Array<{ source: Exclude<KnowledgeSourceId, "local">; message: string }>;
  fetchedAt: number;
}

export interface KnowledgeSearchParams {
  query: string;
  limit?: number;
  sources?: KnowledgeSourceId[];
  includeLocal?: boolean;
  ingest?: boolean;
  agentId?: string;
}