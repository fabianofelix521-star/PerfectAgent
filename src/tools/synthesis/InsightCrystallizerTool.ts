import { SimpleNexusTool } from "@/tools/core/SimpleNexusTool";

export class InsightCrystallizerTool extends SimpleNexusTool {
  constructor() {
    super({
      id: "insight-crystallizer",
      name: "Insight Crystallizer",
      description: "Condensa sinais difusos em insights acionaveis, diferenciando obvio, novo e validavel.",
      category: "synthesis",
      keywords: ["insight", "novel", "actionable", "signal", "pattern", "emergent"],
      strategy: "signal-to-action-crystallization",
    });
  }
}
