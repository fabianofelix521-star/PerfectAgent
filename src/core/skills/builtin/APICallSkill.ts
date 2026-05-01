import type { Skill } from "@/core/skills/types";

export const APICallSkill: Skill = {
  id: "api-call",
  name: "API Call",
  description: "Define chamadas HTTP com schema de entrada e saida.",
  category: "automation",
  version: "1.0.0",
  author: "builtin",
  inputSchema: { endpoint: { type: "string" }, method: { type: "string" } },
  outputSchema: { response: { type: "object" } },
  type: "prompt",
  promptTemplate: "Planeje chamada API {{method}} {{endpoint}} com tratamento de erro.",
  tags: ["api", "integration"],
  usageCount: 0,
  rating: 4.6,
  isPublic: true,
  createdAt: new Date("2026-01-01"),
};
