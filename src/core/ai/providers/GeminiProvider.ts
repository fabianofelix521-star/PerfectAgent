import { BaseProvider } from "@/core/ai/providers/BaseProvider";

export class GeminiProvider extends BaseProvider {
  readonly id = "gemini" as const;
  readonly label = "Google Gemini";

  supportsModel(model: string): boolean {
    return /gemini/i.test(model);
  }
}
