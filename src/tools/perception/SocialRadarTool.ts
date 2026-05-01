import { SimpleNexusTool } from "@/tools/core/SimpleNexusTool";

export class SocialRadarTool extends SimpleNexusTool {
  constructor() {
    super({
      id: "social-radar",
      name: "Social Radar",
      description: "Detecta narrativas sociais, KOLs, memes emergentes e mudancas de sentimento antes de aparecerem em metricas tardias.",
      category: "perception",
      keywords: ["social", "twitter", "telegram", "discord", "reddit", "meme", "sentiment", "narrative"],
      strategy: "narrative-velocity-radar",
    });
  }
}
