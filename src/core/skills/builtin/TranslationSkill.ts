import type { Skill } from "@/core/skills/types";

export const TranslationSkill: Skill = {
  id: "translation",
  name: "Translation",
  description: "Traducao contextual com preservacao de termos tecnicos.",
  category: "writing",
  version: "1.0.0",
  author: "builtin",
  inputSchema: { text: { type: "string" }, targetLang: { type: "string" } },
  outputSchema: { translated: { type: "string" } },
  type: "prompt",
  promptTemplate: "Traduza para {{targetLang}} preservando terminologia tecnica: {{text}}",
  tags: ["translation", "localization"],
  usageCount: 0,
  rating: 4.3,
  isPublic: true,
  createdAt: new Date("2026-01-01"),
};
