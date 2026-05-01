import { SimpleNexusTool } from "@/tools/core/SimpleNexusTool";

export class DeepWebCrawlerTool extends SimpleNexusTool {
  constructor() {
    super({
      id: "deep-web-crawler",
      name: "Deep Web Crawler",
      description: "Coleta sinais de fontes profundas, documentos, foruns e paginas pouco estruturadas com avaliacao de confiabilidade.",
      category: "perception",
      keywords: ["crawl", "source", "document", "forum", "deep", "web", "research"],
      strategy: "source-map-and-credibility-scan",
    });
  }
}
