export type KnowledgeSourceId =
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
  errors: Array<{ source: KnowledgeSourceId; message: string }>;
  fetchedAt: number;
}

const DEFAULT_SOURCES: KnowledgeSourceId[] = [
  "pubmed",
  "arxiv",
  "github",
  "crossref",
  "wikipedia",
];

const OUTBOUND_HEADERS = {
  "user-agent": "PerfectAgent/1.0 (knowledge-search)",
  accept: "application/json, text/plain, */*",
};

export async function searchKnowledge(params: {
  query: string;
  limit?: number;
  sources?: string[];
}): Promise<KnowledgeSearchResponse> {
  const query = params.query.trim();
  const limit = clamp(Math.round(params.limit ?? 8), 1, 20);
  const sources = normalizeSources(params.sources);

  const settled = await Promise.all(
    sources.map(async (source) => {
      try {
        const results = await searchers[source](query, limit);
        return { source, results, error: null };
      } catch (error) {
        return {
          source,
          results: [] as KnowledgeSearchResult[],
          error: (error as Error).message,
        };
      }
    }),
  );

  return {
    query,
    sources,
    results: dedupeResults(
      settled
        .flatMap((item) => item.results)
        .sort((left, right) => right.score - left.score)
        .slice(0, limit * 2),
      limit,
    ),
    errors: settled
      .filter((item): item is typeof item & { error: string } => Boolean(item.error))
      .map((item) => ({ source: item.source, message: item.error })),
    fetchedAt: Date.now(),
  };
}

const searchers: Record<KnowledgeSourceId, (query: string, limit: number) => Promise<KnowledgeSearchResult[]>> = {
  pubmed: searchPubMed,
  arxiv: searchArxiv,
  github: searchGitHub,
  crossref: searchCrossref,
  wikipedia: searchWikipedia,
};

async function searchPubMed(query: string, limit: number): Promise<KnowledgeSearchResult[]> {
  const searchUrl = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi");
  searchUrl.searchParams.set("db", "pubmed");
  searchUrl.searchParams.set("retmode", "json");
  searchUrl.searchParams.set("retmax", String(limit));
  searchUrl.searchParams.set("sort", "relevance");
  searchUrl.searchParams.set("term", query);

  const searchJson = await fetchJson(searchUrl.toString());
  const idList = asStringArray(searchJson?.esearchresult?.idlist);
  if (!idList.length) return [];

  const summaryUrl = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi");
  summaryUrl.searchParams.set("db", "pubmed");
  summaryUrl.searchParams.set("retmode", "json");
  summaryUrl.searchParams.set("id", idList.join(","));

  const summaryJson = await fetchJson(summaryUrl.toString());
  const summaryResult = asRecord(summaryJson?.result);

  return idList
    .map((id, index) => {
      const item = asRecord(summaryResult[id]);
      const title = asString(item.title, `PubMed ${id}`);
      const authors = asRecordArray(item.authors)
        .map((author) => asString(author.name))
        .filter(Boolean);
      const snippet = [
        title,
        asString(item.source),
        asString(item.pubdate || item.sortpubdate),
      ]
        .filter(Boolean)
        .join(" · ");
      return {
        id: `pubmed:${id}`,
        source: "pubmed" as const,
        title,
        snippet,
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
        authors,
        publishedAt: asString(item.pubdate || item.sortpubdate),
        score: rankScore(index, limit, 0.92),
        metadata: {
          journal: asString(item.fulljournalname || item.source),
          articleIds: item.articleids,
        },
      } satisfies KnowledgeSearchResult;
    })
    .filter((item) => item.title.trim());
}

async function searchArxiv(query: string, limit: number): Promise<KnowledgeSearchResult[]> {
  const url = new URL("https://export.arxiv.org/api/query");
  url.searchParams.set("search_query", `all:${query}`);
  url.searchParams.set("start", "0");
  url.searchParams.set("max_results", String(limit));
  url.searchParams.set("sortBy", "relevance");
  url.searchParams.set("sortOrder", "descending");

  const xml = await fetchText(url.toString());
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];

  return entries.map((entry, index) => ({
    id: `arxiv:${stripTag(entry, "id")}`,
    source: "arxiv" as const,
    title: decodeXml(stripTag(entry, "title")),
    snippet: normalizeWhitespace(decodeXml(stripTag(entry, "summary"))),
    url: stripTag(entry, "id"),
    authors: Array.from(entry.matchAll(/<name>([\s\S]*?)<\/name>/g)).map((match) => decodeXml(match[1].trim())),
    publishedAt: stripTag(entry, "published"),
    score: rankScore(index, limit, 0.88),
    metadata: {
      updatedAt: stripTag(entry, "updated"),
      primaryCategory: extractArxivCategory(entry),
    },
  }));
}

async function searchGitHub(query: string, limit: number): Promise<KnowledgeSearchResult[]> {
  const url = new URL("https://api.github.com/search/repositories");
  url.searchParams.set("q", query);
  url.searchParams.set("per_page", String(limit));
  url.searchParams.set("sort", "stars");
  url.searchParams.set("order", "desc");

  const data = await fetchJson(url.toString(), {
    headers: {
      ...OUTBOUND_HEADERS,
      accept: "application/vnd.github+json",
    },
  });
  const items = asRecordArray(data?.items);
  const topStars = Math.max(...items.map((item) => asNumber(item.stargazers_count, 0)), 1);

  return items.map((item, index) => {
    const stars = asNumber(item.stargazers_count, 0);
    const starBoost = Math.min(stars / topStars, 1) * 0.08;
    return {
      id: `github:${asString(item.full_name)}`,
      source: "github" as const,
      title: asString(item.full_name, asString(item.name, `repo-${index + 1}`)),
      snippet: [asString(item.description), asString(item.language), stars ? `${stars} stars` : ""]
        .filter(Boolean)
        .join(" · "),
      url: asString(item.html_url),
      publishedAt: asString(item.updated_at),
      score: clamp01(rankScore(index, limit, 0.84) + starBoost),
      metadata: {
        language: asString(item.language),
        stars,
        forks: asNumber(item.forks_count, 0),
        topics: item.topics,
      },
    } satisfies KnowledgeSearchResult;
  });
}

async function searchCrossref(query: string, limit: number): Promise<KnowledgeSearchResult[]> {
  const url = new URL("https://api.crossref.org/works");
  url.searchParams.set("rows", String(limit));
  url.searchParams.set("query.bibliographic", query);
  const data = await fetchJson(url.toString());
  const items = asRecordArray(data?.message?.items);

  return items.map((item, index) => {
    const titles = Array.isArray(item.title) ? item.title : [];
    const title = typeof titles[0] === "string" ? titles[0] : `Crossref ${index + 1}`;
    const authors = asRecordArray(item.author)
      .map((author) => `${asString(author.given)} ${asString(author.family)}`.trim())
      .filter(Boolean);
    return {
      id: `crossref:${asString(item.DOI, `${index}`)}`,
      source: "crossref" as const,
      title,
      snippet: normalizeWhitespace(stripHtml(asString(item.abstract, asString(item.publisher, "")))),
      url: asString(item.URL, `https://doi.org/${asString(item.DOI)}`),
      authors,
      publishedAt: extractCrossrefDate(item),
      score: clamp01(rankScore(index, limit, 0.8) + Math.min(asNumber(item.score, 0) / 200, 0.12)),
      metadata: {
        doi: asString(item.DOI),
        publisher: asString(item.publisher),
        type: asString(item.type),
      },
    } satisfies KnowledgeSearchResult;
  });
}

async function searchWikipedia(query: string, limit: number): Promise<KnowledgeSearchResult[]> {
  const url = new URL("https://en.wikipedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("list", "search");
  url.searchParams.set("utf8", "1");
  url.searchParams.set("format", "json");
  url.searchParams.set("srlimit", String(limit));
  url.searchParams.set("srsearch", query);
  const data = await fetchJson(url.toString());
  const items = asRecordArray(data?.query?.search);

  return items.map((item, index) => ({
    id: `wikipedia:${String(item.pageid ?? index)}`,
    source: "wikipedia" as const,
    title: asString(item.title, `Wikipedia ${index + 1}`),
    snippet: normalizeWhitespace(stripHtml(asString(item.snippet))),
    url: `https://en.wikipedia.org/?curid=${String(item.pageid ?? "")}`,
    publishedAt: asString(item.timestamp),
    score: rankScore(index, limit, 0.76),
    metadata: {
      pageId: item.pageid,
      wordCount: item.wordcount,
    },
  }));
}

async function fetchJson(url: string, init?: RequestInit): Promise<any> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...OUTBOUND_HEADERS,
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response.json();
}

async function fetchText(url: string, init?: RequestInit): Promise<string> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...OUTBOUND_HEADERS,
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response.text();
}

function normalizeSources(sources?: string[]): KnowledgeSourceId[] {
  const valid = new Set(DEFAULT_SOURCES);
  const normalized = (sources ?? DEFAULT_SOURCES).filter(
    (source): source is KnowledgeSourceId => valid.has(source as KnowledgeSourceId),
  );
  return normalized.length ? Array.from(new Set(normalized)) : DEFAULT_SOURCES;
}

function dedupeResults(results: KnowledgeSearchResult[], limit: number): KnowledgeSearchResult[] {
  const seen = new Set<string>();
  const deduped: KnowledgeSearchResult[] = [];
  for (const result of results) {
    const key = `${result.url}|${result.title.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(result);
    if (deduped.length >= limit) break;
  }
  return deduped;
}

function rankScore(index: number, limit: number, baseline: number): number {
  const decay = limit > 1 ? index / (limit - 1) : 0;
  return clamp01(baseline - decay * 0.18);
}

function extractArxivCategory(entry: string): string {
  const match = entry.match(/<arxiv:primary_category[^>]*term="([^"]+)"/);
  return match?.[1] ?? "";
}

function extractCrossrefDate(item: Record<string, unknown>): string {
  const parts = asRecord(item["published-print"] ?? item["published-online"] ?? item.created)["date-parts"];
  if (!Array.isArray(parts) || !Array.isArray(parts[0])) return "";
  return parts[0].filter((value): value is number => typeof value === "number").join("-");
}

function stripTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return decodeXml(match?.[1]?.trim() ?? "");
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, " ");
}

function decodeXml(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asRecordArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value: number): number {
  return clamp(Number.isFinite(value) ? value : 0, 0, 1);
}