export interface LeviathanSignal {
  query: string;
  objective: string;
  constraints: string[];
  horizon: "instant" | "tactical" | "strategic" | "epoch";
}

export interface LeviathanResult {
  summary: string;
  confidence: number;
  actions: string[];
  risks: string[];
}
