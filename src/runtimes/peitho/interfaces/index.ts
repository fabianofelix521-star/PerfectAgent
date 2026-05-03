export interface PeithoSignal {
  query: string;
  objective: string;
  constraints: string[];
  horizon: "instant" | "tactical" | "strategic" | "epoch";
}

export interface PeithoResult {
  summary: string;
  confidence: number;
  actions: string[];
  risks: string[];
}
