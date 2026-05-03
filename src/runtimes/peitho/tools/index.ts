export interface DomainToolResult {
  score: number;
  notes: string[];
}

export function scoreScenario(inputs: string[]): DomainToolResult {
  const score = Math.max(0.4, Math.min(0.95, 0.5 + inputs.length * 0.03));
  return { score, notes: inputs.slice(0, 6).map((item, index) => `${index + 1}. ${item}`) };
}

export function rankRisks(risks: string[]): string[] {
  return [...risks].sort((a, b) => b.length - a.length).slice(0, 8);
}
