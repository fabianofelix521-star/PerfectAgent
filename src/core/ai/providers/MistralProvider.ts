import { BaseProvider } from "@/core/ai/providers/BaseProvider";

export class MistralProvider extends BaseProvider {
  readonly id = "mistral" as const;
  readonly label = "Mistral";

  supportsModel(model: string): boolean {
    return /mistral|ministral/i.test(model);
  }
}
