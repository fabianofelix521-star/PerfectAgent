export interface MnemosyneSignal {
  query: string;
  objective: string;
  constraints: string[];
  horizon: "instant" | "tactical" | "strategic" | "epoch";
}

export interface MnemosyneResult {
  summary: string;
  confidence: number;
  actions: string[];
  risks: string[];
}
