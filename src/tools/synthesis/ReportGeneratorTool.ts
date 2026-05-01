import { SimpleNexusTool } from "@/tools/core/SimpleNexusTool";

export class ReportGeneratorTool extends SimpleNexusTool {
  constructor() {
    super({
      id: "report-generator",
      name: "Report Generator",
      description: "Gera relatorios estruturados com achados, evidencias, limites, proximas acoes e confianca.",
      category: "synthesis",
      keywords: ["report", "summary", "findings", "evidence", "recommendation", "confidence"],
      strategy: "decision-grade-reporting",
    });
  }
}
