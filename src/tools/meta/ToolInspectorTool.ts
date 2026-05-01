import { SimpleNexusTool } from "@/tools/core/SimpleNexusTool";

export class ToolInspectorTool extends SimpleNexusTool {
  constructor() {
    super({
      id: "tool-inspector",
      name: "Tool Inspector",
      description: "Audita tools registradas, metricas, falhas recentes e lacunas de capacidade.",
      category: "meta",
      keywords: ["tool", "inspect", "metrics", "failure", "registry", "audit", "capability"],
      strategy: "registry-health-inspection",
    });
  }
}
