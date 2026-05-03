export interface PrometheanForgeSubSwarm {
  id: string;
  level: 1 | 2 | 3 | 4 | 5;
  focus: string;
  members: string[];
}

export const PrometheanForgeSubSwarms: PrometheanForgeSubSwarm[] = [
  { id: "promethean-forge:strategic", level: 1, focus: "Grand strategy and arbitration", members: ["TransformerArchitectureSavantAgent", "TrainingInfrastructureGodAgent"] },
  { id: "promethean-forge:tactical", level: 2, focus: "Domain tactical synthesis", members: ["RLHFConstitutionalAIAgent", "DataCurationArchmageAgent", "TokenizationVocabularyArchitectAgent"] },
  { id: "promethean-forge:execution", level: 3, focus: "Execution and optimization", members: ["PretrainingScalingLawsAgent", "FineTuningSpecialistAgent"] },
  { id: "promethean-forge:validation", level: 4, focus: "Adversarial validation", members: ["MultimodalFusionMasterAgent", "LongContextEngineerAgent"] },
  { id: "promethean-forge:dream", level: 5, focus: "Dream mode consolidation", members: ["InferenceOptimizationGodAgent"] },
];
