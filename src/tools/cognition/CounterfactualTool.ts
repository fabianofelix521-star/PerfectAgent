import { SimpleNexusTool } from "@/tools/core/SimpleNexusTool";

export class CounterfactualTool extends SimpleNexusTool {
  constructor() {
    super({
      id: "counterfactual-reasoning",
      name: "Counterfactual Reasoning",
      description: "Avalia o que teria acontecido sob intervencoes alternativas e explicita suposicoes causais.",
      category: "cognition",
      keywords: ["counterfactual", "alternative", "would", "without", "intervention", "scenario"],
      strategy: "contrastive-world-simulation",
    });
  }
}
