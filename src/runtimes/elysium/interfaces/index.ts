export interface ElysiumSignal {
  query: string;
  objective: string;
  constraints: string[];
  horizon: "instant" | "tactical" | "strategic" | "epoch";
}

export interface ElysiumResult {
  summary: string;
  confidence: number;
  actions: string[];
  risks: string[];
}
