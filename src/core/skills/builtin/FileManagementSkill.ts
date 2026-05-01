import type { Skill } from "@/core/skills/types";

export const FileManagementSkill: Skill = {
  id: "file-management",
  name: "File Management",
  description: "Planeja manipulacao de arquivos com seguranca e rollback.",
  category: "automation",
  version: "1.0.0",
  author: "builtin",
  inputSchema: { action: { type: "string" }, target: { type: "string" } },
  outputSchema: { operations: { type: "array" } },
  type: "prompt",
  promptTemplate: "Descreva operacoes para {{action}} em {{target}} com validacao.",
  tags: ["files", "automation"],
  usageCount: 0,
  rating: 4.5,
  isPublic: true,
  createdAt: new Date("2026-01-01"),
};
