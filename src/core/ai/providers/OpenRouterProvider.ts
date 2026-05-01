import { BaseProvider } from "@/core/ai/providers/BaseProvider";

export class OpenRouterProvider extends BaseProvider {
  readonly id = "openrouter" as const;
  readonly label = "OpenRouter";

  supportsModel(_model: string): boolean {
    return true;
  }
}
