import { api } from "@/services/api";
import { buildSkillMarketplaceContext } from "@/services/skillMarketplaces";
import { useConfig } from "@/stores/config";
import type { Skill, Tool } from "@/types";

interface RuntimeToolingContextOptions {
  prompt: string;
  selectedSkillIds?: string[];
  selectedRuntimeId?: string;
  includeLiveWebSearch?: boolean;
}

interface SearchResult {
  title?: string;
  url?: string;
  snippet?: string;
  source?: string;
}

export async function buildRuntimeToolingContext({
  prompt,
  selectedSkillIds = [],
  selectedRuntimeId,
  includeLiveWebSearch = true,
}: RuntimeToolingContextOptions): Promise<string | undefined> {
  const state = useConfig.getState();
  const selectedRuntime = selectedRuntimeId
    ? (state.runtimes ?? []).find((runtime) => runtime.id === selectedRuntimeId)
    : undefined;
  const effectiveSkillIds = uniqueIds(selectedSkillIds, selectedRuntime?.skillIds ?? []);
  const skills = selectRuntimeSkills(state.skills, effectiveSkillIds);
  const preferredSkills = selectPreferredSkills(state.skills, effectiveSkillIds);
  const tools = (state.tools ?? []).filter((tool) => tool.enabled);
  const preferredTools = selectedRuntime?.toolIds?.length
    ? tools.filter((tool) => selectedRuntime.toolIds?.includes(tool.id))
    : [];
  const orderedTools = orderToolsByPreference(tools, preferredTools);
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

  if (selectedRuntime) {
    sections.push(
      [
        "## Runtime selecionado",
        `${selectedRuntime.name} (${selectedRuntime.kind ?? "generic"})`,
        selectedRuntime.description ?? "",
        preferredSkills.length
          ? `Skills preferidas: ${preferredSkills.map((skill) => skill.name).join(", ")}`
          : "",
        preferredTools.length
          ? `Ferramentas preferidas: ${preferredTools.map((tool) => tool.name).join(", ")}`
          : "",

      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  if (orderedTools.length) {
    sections.push(
      [
        "## Ferramentas habilitadas no sistema",
        preferredTools.length
          ? "Ferramentas preferidas do runtime devem ser tentadas primeiro, sem excluir as demais quando agregarem cobertura de risco e verificacao."
          : "",
        "Quando uma ferramenta for relevante, emita um bloco <tool_call> para execucao real pelo Nexus Ultra AGI. Nao escreva pseudo-JavaScript, nao envolva tool_call em ``` e nao finja que executou.",
        "Formato exato fora de code fence: <tool_call><function=Nome da Tool><parameter=parametro>valor</parameter></function></tool_call>. Depois da execucao, o chat anexara os resultados reais e continuara a resposta.",
        ...orderedTools.slice(0, 24).map(formatTool),
      ].join("\n"),
    );
  }

  if (includeLiveWebSearch && shouldRunLiveWebSearch(prompt)) {
    const research = await runLiveWebResearch(prompt, orderedTools, preferredTools);
    if (research) sections.push(research);
  }

  return sections.filter(Boolean).join("\n\n---\n\n") || undefined;
}

function selectRuntimeSkills(skills: Skill[], selectedSkillIds: string[]): Skill[] {
  const selected = new Set(selectedSkillIds);
  return (skills ?? []).filter((skill) => skill.enabled || selected.has(skill.id));
}

function selectPreferredSkills(skills: Skill[], selectedSkillIds: string[]): Skill[] {
  const selected = new Set(selectedSkillIds);
  return (skills ?? []).filter((skill) => selected.has(skill.id));
}

function uniqueIds(...groups: string[][]): string[] {
  return Array.from(new Set(groups.flatMap((group) => group ?? [])));
}

function orderToolsByPreference(tools: Tool[], preferredTools: Tool[]): Tool[] {
  if (!preferredTools.length) return tools;
  const preferred = new Set(preferredTools.map((tool) => tool.id));
  return [
    ...tools.filter((tool) => preferred.has(tool.id)),
    ...tools.filter((tool) => !preferred.has(tool.id)),
  ];
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
  preferredTools: Tool[],
): Promise<string | undefined> {
  const webTools = selectWebResearchTools(prompt, tools, preferredTools);
  if (!webTools.length) return undefined;

  try {
    const responses = await Promise.all(
      webTools.map(async (tool) => {
        const response = await api.runTool({
          kind: "websearch",
          args: {
            ...(tool.config ?? {}),
            query: prompt,
            maxResults: isMedicalPrompt(prompt) ? 10 : 6,
          },
        });
        return { tool, response };
      }),
    );
    const failures = responses
      .filter(({ response }) => !response.ok)
      .map(({ tool, response }) => `${tool.name}: ${response.error ?? "erro desconhecido"}`);
    const merged = dedupeSearchResults(
      responses.flatMap(({ response }) =>
        response.ok ? normalizeSearchResult(response.result).results : [],
      ),
    );
    const rows = merged
      .slice(0, isMedicalPrompt(prompt) ? 14 : 8)
      .map(
        (item, index) =>
          `${index + 1}. ${item.title ?? "Sem titulo"}${item.source ? ` [${item.source}]` : ""}\n   ${item.url ?? ""}\n   ${item.snippet ?? ""}`,
      );
    return [
      "## Pesquisa web em tempo real",
      `Ferramentas usadas: ${webTools.map((tool) => tool.name).join(", ")}`,
      `Query: ${prompt}`,
      "Resultados para usar como contexto verificavel:",
      rows.length ? rows.join("\n") : "Nenhum resultado retornado.",
      failures.length ? `Falhas parciais: ${failures.join("; ")}` : "",
    ].join("\n");
  } catch (error) {
    return [
      "## Pesquisa web em tempo real",
      `Falhou ao buscar: ${error instanceof Error ? error.message : String(error)}`,
    ].join("\n");
  }
}

function selectWebResearchTools(prompt: string, tools: Tool[], preferredTools: Tool[]): Tool[] {
  const enabled = tools.filter((tool) => tool.enabled && tool.kind === "websearch");
  if (!enabled.length) return [];
  const preferredIds = new Set(preferredTools.map((tool) => tool.id));
  const priority = isMedicalPrompt(prompt)
    ? [
        "tl-openclaw-medical-search",
        "tl-open-websearch",
        "tl-autoresearch",
        "tl-autoresearch-claw",
        "tl-search",
      ]
    : ["tl-open-websearch", "tl-autoresearch", "tl-autoresearch-claw", "tl-search"];
  const selected = priority
    .map((id) => enabled.find((tool) => tool.id === id))
    .filter((tool): tool is Tool => Boolean(tool));
  for (const tool of enabled) {
    if (!selected.some((item) => item.id === tool.id)) selected.push(tool);
  }
  selected.sort((a, b) => {
    const ap = preferredIds.has(a.id) ? 1 : 0;
    const bp = preferredIds.has(b.id) ? 1 : 0;
    return bp - ap;
  });
  return selected.slice(0, isMedicalPrompt(prompt) ? 5 : 3);
}

function dedupeSearchResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  const deduped: SearchResult[] = [];
  for (const result of results) {
    const key = (result.url || result.title || "")
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(result);
  }
  return deduped;
}

function isMedicalPrompt(prompt: string): boolean {
  return /\b(medic|medic[ai]na|clinical|trial|pubmed|doenca|doença|tratamento|cancer|tumor|dose|dosage|compound|composto|sleep|cortisol|human|elderly|neuro|amyloid|l-theanine|theanine|hippocrates|asclepius|apollo|openc?law)\b/i.test(prompt);
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
        source: typeof item.source === "string" ? item.source : undefined,
      })),
  };
}
