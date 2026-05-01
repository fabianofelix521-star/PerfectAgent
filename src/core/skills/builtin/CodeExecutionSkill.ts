import type { Skill } from "@/core/skills/types";

export const CodeExecutionSkill: Skill = {
  id: "code-execution",
  name: "Code Execution",
  description: "Prepara plano de execucao e validacao de codigo.",
  category: "coding",
  version: "1.0.0",
  author: "builtin",
  inputSchema: { task: { type: "string" } },
  outputSchema: { plan: { type: "array" } },
  type: "prompt",
  promptTemplate: "Gere plano de implementacao e testes para: {{task}}.",
  tags: ["code", "execution"],
  usageCount: 0,
  rating: 4.7,
  isPublic: true,
  createdAt: new Date("2026-01-01"),
};
