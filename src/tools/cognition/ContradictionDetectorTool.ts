import { SimpleNexusTool } from "@/tools/core/SimpleNexusTool";

export class ContradictionDetectorTool extends SimpleNexusTool {
  constructor() {
    super({
      id: "contradiction-detector",
      name: "Contradiction Detector",
      description: "Detecta claims conflitantes, separa contradicao real de contexto diferente e sugere evidencias para resolver.",
      category: "cognition",
      keywords: ["contradiction", "conflict", "claim", "evidence", "inconsistent", "disagree"],
      strategy: "claim-graph-conflict-resolution",
    });
  }
}
