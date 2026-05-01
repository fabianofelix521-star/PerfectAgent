import type { Skill } from "@/core/skills/types";

export const CalendarSkill: Skill = {
  id: "calendar-manager",
  name: "Calendar Manager",
  description: "Planeja agendas e cria estrutura de eventos com follow-up.",
  category: "automation",
  version: "1.0.0",
  author: "builtin",
  inputSchema: { goal: { type: "string" }, date: { type: "string" } },
  outputSchema: { schedule: { type: "array" } },
  type: "prompt",
  promptTemplate: "Monte uma agenda para {{date}} focada em {{goal}}.",
  tags: ["calendar", "productivity"],
  usageCount: 0,
  rating: 4.5,
  isPublic: true,
  createdAt: new Date("2026-01-01"),
};
