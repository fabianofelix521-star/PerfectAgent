import { BaseIntegration } from "@/modules/integrations/integrations/BaseIntegration";

export class GitHubIntegration extends BaseIntegration {
  readonly id = "github";
  readonly name = "GitHub";
}
