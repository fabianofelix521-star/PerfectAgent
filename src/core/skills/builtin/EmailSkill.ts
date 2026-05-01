import type { Skill } from "@/core/skills/types";

export const EmailSkill: Skill = {
  id: "email-composer",
  name: "Email Composer",
  description: "Cria emails profissionais com objetivo, CTA e tom adequado.",
  category: "communication",
  version: "1.0.0",
  author: "builtin",
  inputSchema: {
    objective: { type: "string" },
    audience: { type: "string" },
  },
  outputSchema: { email: { type: "string" } },
  type: "prompt",
  promptTemplate: "Escreva um email para {{audience}} com foco em {{objective}}.",
  tags: ["email", "writing"],
  usageCount: 0,
  rating: 4.6,
  isPublic: true,
  createdAt: new Date("2026-01-01"),
};
