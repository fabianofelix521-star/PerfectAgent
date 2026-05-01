import { SimpleNexusTool } from "@/tools/core/SimpleNexusTool";

export class AnalogicalReasoningTool extends SimpleNexusTool {
  constructor() {
    super({
      id: "analogical-reasoning",
      name: "Analogical Reasoning",
      description: "Transfere estruturas de um dominio para outro e identifica analogias com limites explicitos.",
      category: "cognition",
      keywords: ["analogy", "similar", "pattern", "transfer", "domain", "mapping"],
      strategy: "structure-mapping-with-boundary-checks",
    });
  }
}
