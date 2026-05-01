import type { Skill } from "@/core/skills/types";

export const NotificationSkill: Skill = {
  id: "notification",
  name: "Notification",
  description: "Estrutura notificacoes multi-canal com fallback.",
  category: "communication",
  version: "1.0.0",
  author: "builtin",
  inputSchema: { message: { type: "string" }, channels: { type: "array" } },
  outputSchema: { plan: { type: "array" } },
  type: "prompt",
  promptTemplate: "Crie plano de notificacao para {{message}} nos canais {{channels}}.",
  tags: ["notification", "slack", "email"],
  usageCount: 0,
  rating: 4.4,
  isPublic: true,
  createdAt: new Date("2026-01-01"),
};
