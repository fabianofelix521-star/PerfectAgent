export interface AkashaSignal {
  query: string;
  objective: string;
  constraints: string[];
  horizon: "instant" | "tactical" | "strategic" | "epoch";
}

export interface AkashaResult {
  summary: string;
  confidence: number;
  actions: string[];
  risks: string[];
}
