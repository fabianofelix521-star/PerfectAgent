import { SimpleNexusTool } from "@/tools/core/SimpleNexusTool";

export class MemoryConsolidatorTool extends SimpleNexusTool {
  constructor() {
    super({
      id: "memory-consolidator",
      name: "Memory Consolidator",
      description: "Remove redundancia, fortalece memorias uteis e cria conexoes semanticas duraveis.",
      category: "memory",
      keywords: ["consolidate", "memory", "dedupe", "compress", "semantic", "long", "term"],
      strategy: "dedupe-strengthen-promote",
    });
  }
}
