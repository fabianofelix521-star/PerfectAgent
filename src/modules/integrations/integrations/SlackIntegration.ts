import { BaseIntegration } from "@/modules/integrations/integrations/BaseIntegration";

export class SlackIntegration extends BaseIntegration {
  readonly id = "slack";
  readonly name = "Slack";
}
