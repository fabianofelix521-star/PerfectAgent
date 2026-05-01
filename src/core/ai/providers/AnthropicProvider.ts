import { BaseProvider } from "@/core/ai/providers/BaseProvider";

export class AnthropicProvider extends BaseProvider {
  readonly id = "anthropic" as const;
  readonly label = "Anthropic";

  supportsModel(model: string): boolean {
    return /claude/i.test(model);
  }
}
