export interface PleromaSignal {
  query: string;
  objective: string;
  constraints: string[];
  horizon: "instant" | "tactical" | "strategic" | "epoch";
}

export interface PleromaResult {
  summary: string;
  confidence: number;
  actions: string[];
  risks: string[];
}
