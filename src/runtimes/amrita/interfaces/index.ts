export interface AmritaSignal {
  query: string;
  objective: string;
  constraints: string[];
  horizon: "instant" | "tactical" | "strategic" | "epoch";
}

export interface AmritaResult {
  summary: string;
  confidence: number;
  actions: string[];
  risks: string[];
}
