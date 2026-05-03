import { BaseCognitiveAgent } from "@/runtimes/_nextgen/BaseCognitiveAgent";
import type { AgentDecision } from "@/runtimes/_nextgen/RuntimeTypes";
import type { CognitiveState, FrequencyBandPower, IntentionDecodeResult, NeuralSignalFrame } from "@/runtimes/cortex/domain/types";

interface SignalPerception {
  frame: NeuralSignalFrame;
  bands: FrequencyBandPower;
  state: CognitiveState;
}

export class SignalDecoderAgent extends BaseCognitiveAgent<{ query: string }, SignalPerception, SignalPerception, AgentDecision, IntentionDecodeResult> {
  constructor() {
    super("cortex:signal-decoder", "Signal Decoder Agent", "neural-decoding");
  }

  async perceive(): Promise<SignalPerception> {
    return {
      frame: { channels: 32, sampleRateHz: 512, artifacts: ["blink", "jaw tension"] },
      bands: { delta: 0.18, theta: 0.42, alpha: 0.61, beta: 0.55, gamma: 0.27 },
      state: { focus: 0.71, fatigue: 0.33, stress: 0.41, workingMemoryLoad: 0.58 },
    };
  }

  async reason(context: SignalPerception): Promise<AgentDecision> {
    return {
      kind: "observation",
      confidence: 0.76,
      signals: [
        `alpha=${context.bands.alpha.toFixed(2)}`,
        `beta=${context.bands.beta.toFixed(2)}`,
        `focus=${context.state.focus.toFixed(2)}`,
      ],
      summary: "Signals suggest goal-directed focus with manageable fatigue and no justification for invasive intervention.",
    };
  }

  async act(decision: AgentDecision): Promise<IntentionDecodeResult> {
    return {
      intention: decision.kind === "observation" ? "sustained-attention" : "unknown",
      confidence: decision.confidence,
      supportingBands: decision.kind === "observation" ? decision.signals : [],
    };
  }
}