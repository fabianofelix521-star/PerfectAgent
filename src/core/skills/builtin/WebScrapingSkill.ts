import type { Skill } from "@/core/skills/types";

export const WebScrapingSkill: Skill = {
  id: "web-scraping",
  name: "Web Scraping",
  description: "Extrai conteudo de paginas web com normalizacao de texto.",
  category: "research",
  version: "1.0.0",
  author: "builtin",
  inputSchema: { url: { type: "string", description: "URL alvo" } },
  outputSchema: { content: { type: "string" } },
  type: "prompt",
  promptTemplate: "Extraia e resuma os pontos principais de {{url}}.",
  tags: ["web", "research"],
  usageCount: 0,
  rating: 4.7,
  isPublic: true,
  createdAt: new Date("2026-01-01"),
};
