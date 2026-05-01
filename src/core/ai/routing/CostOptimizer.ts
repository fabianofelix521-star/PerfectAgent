export interface CostEstimateInput {
  model: string;
  inputTokens: number;
  outputTokens?: number;
}

const PRICE_PER_1K: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 0.005, output: 0.015 },
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  "claude-3-5-sonnet-20241022": { input: 0.003, output: 0.015 },
  "claude-3-5-haiku-20241022": { input: 0.0008, output: 0.004 },
  "llama-3.1-70b-versatile": { input: 0.0008, output: 0.0008 },
};

export class CostOptimizer {
  estimate(input: CostEstimateInput): number {
    const row = PRICE_PER_1K[input.model] ?? { input: 0.001, output: 0.0015 };
    const out = input.outputTokens ?? Math.max(256, Math.round(input.inputTokens * 0.5));
    return (input.inputTokens / 1000) * row.input + (out / 1000) * row.output;
  }

  suggestLowerCostModel(model: string): string {
    if (/opus|o1|o3|gpt-4o$/i.test(model)) return "gpt-4o-mini";
    if (/sonnet/i.test(model)) return "claude-3-5-haiku-20241022";
    return model;
  }
}
