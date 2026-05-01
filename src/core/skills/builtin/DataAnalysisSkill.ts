import type { Skill } from "@/core/skills/types";

export const DataAnalysisSkill: Skill = {
  id: "data-analysis",
  name: "Data Analysis",
  description: "Analisa CSV/Excel e identifica tendencias e anomalias.",
  category: "data",
  version: "1.0.0",
  author: "builtin",
  inputSchema: { dataset: { type: "string", description: "Dados em texto" } },
  outputSchema: { insights: { type: "array" } },
  type: "prompt",
  promptTemplate: "Analise o dataset e entregue insights, anomalias e proximas acoes.",
  tags: ["data", "analysis"],
  usageCount: 0,
  rating: 4.8,
  isPublic: true,
  createdAt: new Date("2026-01-01"),
};
