import { SimpleNexusTool } from "@/tools/core/SimpleNexusTool";

export class EmailCampaignTool extends SimpleNexusTool {
  constructor() {
    super({
      id: "email-campaign",
      name: "Email Campaign",
      description: "Monta campanhas com segmentacao, deliverability, teste A/B e aprendizado de performance.",
      category: "execution",
      keywords: ["email", "campaign", "segment", "open", "click", "deliverability", "ab"],
      strategy: "segmented-ab-campaign-execution",
    });
  }
}
