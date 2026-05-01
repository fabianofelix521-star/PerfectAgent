import type { Skill } from "@/core/skills/types";

export const GitSkill: Skill = {
  id: "git",
  name: "Git",
  description: "Fluxos Git para branch, commit, rebase e PR com seguranca.",
  category: "coding",
  version: "1.0.0",
  author: "builtin",
  inputSchema: { goal: { type: "string" } },
  outputSchema: { steps: { type: "array" } },
  type: "prompt",
  promptTemplate: "Gere um fluxo Git seguro para atingir: {{goal}}.",
  tags: ["git", "version-control"],
  usageCount: 0,
  rating: 4.8,
  isPublic: true,
  createdAt: new Date("2026-01-01"),
};
