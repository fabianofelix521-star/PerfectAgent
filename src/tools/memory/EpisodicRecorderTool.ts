import { SimpleNexusTool } from "@/tools/core/SimpleNexusTool";

export class EpisodicRecorderTool extends SimpleNexusTool {
  constructor() {
    super({
      id: "episodic-recorder",
      name: "Episodic Recorder",
      description: "Registra eventos, decisoes, resultados e contexto para memoria episodica auditavel.",
      category: "memory",
      keywords: ["episode", "event", "decision", "record", "context", "history", "memory"],
      strategy: "context-rich-event-capture",
    });
  }
}
