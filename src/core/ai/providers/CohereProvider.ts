import { BaseProvider } from "@/core/ai/providers/BaseProvider";

export class CohereProvider extends BaseProvider {
  readonly id = "cohere" as const;
  readonly label = "Cohere";

  supportsModel(model: string): boolean {
    return /cohere|command/i.test(model);
  }
}
