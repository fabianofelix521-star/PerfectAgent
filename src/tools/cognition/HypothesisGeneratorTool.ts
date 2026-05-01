import { SimpleNexusTool } from "@/tools/core/SimpleNexusTool";

export class HypothesisGeneratorTool extends SimpleNexusTool {
  constructor() {
    super({
      id: "hypothesis-generator",
      name: "Hypothesis Generator",
      description: "Gera hipoteses testaveis, criterios de falseabilidade e proximas evidencias de maior valor.",
      category: "cognition",
      keywords: ["hypothesis", "experiment", "test", "unknown", "gap", "abduction", "research"],
      strategy: "abductive-hypothesis-ranking",
    });
  }
}
