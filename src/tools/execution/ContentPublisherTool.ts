import { SimpleNexusTool } from "@/tools/core/SimpleNexusTool";

export class ContentPublisherTool extends SimpleNexusTool {
  constructor() {
    super({
      id: "content-publisher",
      name: "Content Publisher",
      description: "Prepara publicacao multi-canal com verificacao de formato, tom, horario e rollback editorial.",
      category: "execution",
      keywords: ["publish", "content", "social", "channel", "calendar", "post", "campaign"],
      strategy: "channel-aware-publishing",
    });
  }
}
