export interface AtlasImmortalisSubSwarm {
  id: string;
  level: 1 | 2 | 3 | 4 | 5;
  focus: string;
  members: string[];
}

export const AtlasImmortalisSubSwarms: AtlasImmortalisSubSwarm[] = [
  { id: "atlas-immortalis:strategic", level: 1, focus: "Grand strategy and arbitration", members: ["HallmarksOfAgingArchmageAgent", "EpigeneticReversalAgent"] },
  { id: "atlas-immortalis:tactical", level: 2, focus: "Domain tactical synthesis", members: ["HormonalOptimizationDeityAgent", "MitochondrialOptimizationAgent", "SleepOptimizationGodAgent"] },
  { id: "atlas-immortalis:execution", level: 3, focus: "Execution and optimization", members: ["CircadianBiologyMasterAgent", "NutritionPersonalizationAgent"] },
  { id: "atlas-immortalis:validation", level: 4, focus: "Adversarial validation", members: ["FastingProtocolArchmageAgent", "MovementMedicineAgent"] },
  { id: "atlas-immortalis:dream", level: 5, focus: "Dream mode consolidation", members: ["StrengthHypertrophyArchmageAgent"] },
];
