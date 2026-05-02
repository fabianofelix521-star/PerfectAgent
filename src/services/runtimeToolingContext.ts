import { api } from "@/services/api";
import { buildSkillMarketplaceContext } from "@/services/skillMarketplaces";
import { useConfig } from "@/stores/config";
import type { Skill, Tool } from "@/types";

interface RuntimeToolingContextOptions {
  prompt: string;
  selectedSkillIds?: string[];
  includeLiveWebSearch?: boolean;
}

interface SearchResult {
  title?: string;
  url?: string;
  snippet?: string;
}

export async function buildRuntimeToolingContext({
  prompt,
  selectedSkillIds = [],
  includeLiveWebSearch = true,
}: RuntimeToolingContextOptions): Promise<string | undefined> {
  const state = useConfig.getState();
  const skills = selectRuntimeSkills(state.skills, selectedSkillIds);
  const tools = (state.tools ?? []).filter((tool) => tool.enabled);
  const sections: string[] = [];

  sections.push(buildSkillMarketplaceContext());

  if (skills.length) {
    sections.push(
      [
        "## Skills habilitadas no sistema",
        ...skills
          .slice(0, 16)
          .map(
            (skill) =>
              `### ${skill.name}\n${skill.description}\n${skill.systemPrompt}`,
          ),
      ].join("\n\n"),
    );
  }

  if (tools.length) {
    sections.push(
      [
        "## Ferramentas habilitadas no sistema",
        "Quando uma ferramenta for relevante, emita um bloco <tool_call> para execucao real pelo Nexus Ultra AGI. Nao escreva pseudo-JavaScript nem finja que executou.",
        "Formato exato: <tool_call><function=Nome da Tool><parameter=parametro>valor</parameter></function></tool_call>. Depois da execucao, o chat anexara os resultados reais.",
        ...tools.slice(0, 24).map(formatTool),
      ].join("\n"),
    );
  }

  if (includeLiveWebSearch && shouldRunLiveWebSearch(prompt)) {
    const research = await runLiveWebResearch(prompt, tools);
    if (research) sections.push(research);
  }

  return sections.filter(Boolean).join("\n\n---\n\n") || undefined;
}

function selectRuntimeSkills(skills: Skill[], selectedSkillIds: string[]): Skill[] {
  const selected = new Set(selectedSkillIds);
  return (skills ?? []).filter((skill) => skill.enabled || selected.has(skill.id));
}

function formatTool(tool: Tool): string {
  const params = tool.params
    .map((param) => `${param.key}:${param.type}${param.required ? "*" : ""}`)
    .join(", ");
  const config = tool.config && Object.keys(tool.config).length
    ? ` config=${JSON.stringify(tool.config)}`
    : "";
  return `- ${tool.name} [${tool.kind}] (${params || "sem parametros"}). ${tool.description}${config}`;
}

function shouldRunLiveWebSearch(prompt: string): boolean {
  if (!prompt.trim()) return false;
  const env = (import.meta as ImportMeta & { env?: { MODE?: string } }).env;
  if (env?.MODE === "test") return false;
  return true;
}

async function runLiveWebResearch(
  prompt: string,
  tools: Tool[],
): Promise<string | undefined> {
  const webTool =
    tools.find((tool) => tool.id === "tl-open-websearch" && tool.enabled) ??
    tools.find((tool) => tool.kind === "websearch" && tool.enabled);
  if (!webTool) return undefined;

  const args = {
    ...(webTool.config ?? {}),
    query: prompt,
    maxResults: 6,
  };

  try {
    const response = await api.runTool({
      kind: "websearch",
      args,
    });
    if (!response.ok) {
      return [
        "## Pesquisa web em tempo real",
        `Falhou ao buscar: ${response.error ?? "erro desconhecido"}`,
      ].join("\n");
    }
    const result = normalizeSearchResult(response.result);
    const rows = result.results
      .slice(0, 6)
      .map(
        (item, index) =>
          `${index + 1}. ${item.title ?? "Sem titulo"}\n   ${item.url ?? ""}\n   ${item.snippet ?? ""}`,
      );
    return [
      "## Pesquisa web em tempo real",
      `Query: ${result.query || prompt}`,
      "Resultados para usar como contexto verificavel:",
      rows.length ? rows.join("\n") : "Nenhum resultado retornado.",
    ].join("\n");
  } catch (error) {
    return [
      "## Pesquisa web em tempo real",
      `Falhou ao buscar: ${error instanceof Error ? error.message : String(error)}`,
    ].join("\n");
  }
}

function normalizeSearchResult(value: unknown): {
  query?: string;
  results: SearchResult[];
} {
  if (!value || typeof value !== "object") return { results: [] };
  const record = value as Record<string, unknown>;
  const rawResults = Array.isArray(record.results) ? record.results : [];
  return {
    query: typeof record.query === "string" ? record.query : undefined,
    results: rawResults
      .filter((item): item is SearchResult => Boolean(item) && typeof item === "object")
      .map((item) => ({
        title: typeof item.title === "string" ? item.title : undefined,
        url: typeof item.url === "string" ? item.url : undefined,
        snippet: typeof item.snippet === "string" ? item.snippet : undefined,
      })),
  };
}
