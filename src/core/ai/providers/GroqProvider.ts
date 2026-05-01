import { BaseProvider } from "@/core/ai/providers/BaseProvider";

export class GroqProvider extends BaseProvider {
  readonly id = "groq" as const;
  readonly label = "Groq";

  supportsModel(model: string): boolean {
    return /llama|mixtral|groq/i.test(model);
  }
}
