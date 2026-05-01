import { BaseProvider } from "@/core/ai/providers/BaseProvider";

export class HuggingFaceProvider extends BaseProvider {
  readonly id = "huggingface" as const;
  readonly label = "Hugging Face";

  supportsModel(model: string): boolean {
    return /hf|hugging|zephyr|falcon|mistral|llama/i.test(model);
  }
}
