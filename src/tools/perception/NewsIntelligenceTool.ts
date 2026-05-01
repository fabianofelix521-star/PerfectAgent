import { SimpleNexusTool } from "@/tools/core/SimpleNexusTool";

export class NewsIntelligenceTool extends SimpleNexusTool {
  constructor() {
    super({
      id: "news-intelligence",
      name: "News Intelligence",
      description: "Agrupa noticias, mede novidade, risco, vies de fonte e impacto provavel por dominio.",
      category: "perception",
      keywords: ["news", "headline", "source", "report", "impact", "regulation", "announcement"],
      strategy: "source-triangulation-and-impact-scoring",
    });
  }
}
