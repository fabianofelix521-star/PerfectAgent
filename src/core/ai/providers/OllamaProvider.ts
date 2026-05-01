import { BaseProvider } from "@/core/ai/providers/BaseProvider";

export class OllamaProvider extends BaseProvider {
  readonly id = "ollama" as const;
  readonly label = "Ollama";

  supportsModel(model: string): boolean {
    return /llama|phi|qwen|mistral|deepseek|gemma/i.test(model);
  }
}
