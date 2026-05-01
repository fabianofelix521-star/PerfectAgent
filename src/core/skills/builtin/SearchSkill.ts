import type { Skill } from "@/core/skills/types";

export const SearchSkill: Skill = {
  id: "search",
  name: "Search",
  description: "Pesquisa topicos na web e organiza fontes.",
  category: "research",
  version: "1.0.0",
  author: "builtin",
  inputSchema: { query: { type: "string" } },
  outputSchema: { sources: { type: "array" } },
  type: "prompt",
  promptTemplate: "Pesquise {{query}} e devolva fontes confiaveis com resumo.",
  tags: ["search", "research"],
  usageCount: 0,
  rating: 4.5,
  isPublic: true,
  createdAt: new Date("2026-01-01"),
};
