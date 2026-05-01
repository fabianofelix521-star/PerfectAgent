import type { Skill } from "@/core/skills/types";

export const DocumentSkill: Skill = {
  id: "document-processor",
  name: "Document Processor",
  description: "Resume, compara e extrai dados de documentos.",
  category: "data",
  version: "1.0.0",
  author: "builtin",
  inputSchema: { document: { type: "string" }, goal: { type: "string" } },
  outputSchema: { summary: { type: "string" } },
  type: "prompt",
  promptTemplate: "Processe o documento para {{goal}} e retorne resumo estruturado.",
  tags: ["document", "summary"],
  usageCount: 0,
  rating: 4.7,
  isPublic: true,
  createdAt: new Date("2026-01-01"),
};
