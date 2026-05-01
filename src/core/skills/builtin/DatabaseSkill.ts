import type { Skill } from "@/core/skills/types";

export const DatabaseSkill: Skill = {
  id: "database",
  name: "Database",
  description: "Gera queries seguras e estrategias de acesso a dados.",
  category: "data",
  version: "1.0.0",
  author: "builtin",
  inputSchema: { objective: { type: "string" }, dialect: { type: "string" } },
  outputSchema: { query: { type: "string" } },
  type: "prompt",
  promptTemplate: "Crie query para {{objective}} no dialeto {{dialect}}.",
  tags: ["sql", "database"],
  usageCount: 0,
  rating: 4.7,
  isPublic: true,
  createdAt: new Date("2026-01-01"),
};
