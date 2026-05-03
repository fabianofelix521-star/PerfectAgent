export interface PanaceaSignal {
  query: string;
  objective: string;
  constraints: string[];
  horizon: "instant" | "tactical" | "strategic" | "epoch";
}

export interface PanaceaResult {
  summary: string;
  confidence: number;
  actions: string[];
  risks: string[];
}
