export interface AetherionSignal {
  query: string;
  objective: string;
  constraints: string[];
  horizon: "instant" | "tactical" | "strategic" | "epoch";
}

export interface AetherionResult {
  summary: string;
  confidence: number;
  actions: string[];
  risks: string[];
}
