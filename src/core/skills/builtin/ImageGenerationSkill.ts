import type { Skill } from "@/core/skills/types";

export const ImageGenerationSkill: Skill = {
  id: "image-generation",
  name: "Image Generation",
  description: "Cria prompts de imagem detalhados para modelos generativos.",
  category: "media",
  version: "1.0.0",
  author: "builtin",
  inputSchema: { concept: { type: "string" }, style: { type: "string" } },
  outputSchema: { prompt: { type: "string" } },
  type: "prompt",
  promptTemplate: "Crie prompt de imagem para {{concept}} no estilo {{style}}.",
  tags: ["image", "prompt"],
  usageCount: 0,
  rating: 4.6,
  isPublic: true,
  createdAt: new Date("2026-01-01"),
};
