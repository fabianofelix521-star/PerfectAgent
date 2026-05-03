export interface NoumenonSignal {
  query: string;
  objective: string;
  constraints: string[];
  horizon: "instant" | "tactical" | "strategic" | "epoch";
}

export interface NoumenonResult {
  summary: string;
  confidence: number;
  actions: string[];
  risks: string[];
}
