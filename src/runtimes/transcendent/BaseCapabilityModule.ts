import type {
  CapabilityInput,
  CapabilityModule,
  CapabilityOutput,
} from "@/runtimes/transcendent/interfaces";

function tokenEntropy(text: string): number {
  const tokens = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return 0;
  const freq = new Map<string, number>();
  for (const token of tokens) freq.set(token, (freq.get(token) ?? 0) + 1);
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / tokens.length;
    entropy += -p * Math.log2(p);
  }
  return Math.min(1, entropy / 6);
}

export class BaseCapabilityModule implements CapabilityModule {
  constructor(
    readonly id: string,
    readonly description: string,
  ) {}

  async run(input: CapabilityInput): Promise<CapabilityOutput> {
    const signal = tokenEntropy(input.query);
    const confidence = Math.max(0.52, Math.min(0.97, 0.58 + signal * 0.32));
    const evidence = [
      `runtime:${input.runtimeId}`,
      input.agentId ? `agent:${input.agentId}` : "agent:runtime",
      `entropy:${signal.toFixed(3)}`,
      ...(input.evidence ?? []).slice(0, 3),
    ];
    return {
      capability: this.id,
      confidence,
      evidence,
      summary: `${this.description} Confidence=${confidence.toFixed(2)}.`,
      deltas: { utility: confidence - 0.5, risk: 1 - confidence },
    };
  }
}
