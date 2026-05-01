import { BaseProvider } from "@/core/ai/providers/BaseProvider";

export class OpenAIProvider extends BaseProvider {
  readonly id = "openai" as const;
  readonly label = "OpenAI";

  supportsModel(model: string): boolean {
    return /gpt|o1|o3|omni/i.test(model);
  }
}
