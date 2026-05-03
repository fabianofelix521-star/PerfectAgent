export interface HeliosGenesisSubSwarm {
  id: string;
  level: 1 | 2 | 3 | 4 | 5;
  focus: string;
  members: string[];
}

export const HeliosGenesisSubSwarms: HeliosGenesisSubSwarm[] = [
  { id: "helios-genesis:strategic", level: 1, focus: "Grand strategy and arbitration", members: ["CRISPRDesignArchmageAgent", "ProteinEngineeringSavantAgent"] },
  { id: "helios-genesis:tactical", level: 2, focus: "Domain tactical synthesis", members: ["SyntheticBiologyDesignerAgent", "mRNATherapeuticsAgent", "GeneTherapyVectorEngineerAgent"] },
  { id: "helios-genesis:execution", level: 3, focus: "Execution and optimization", members: ["CellTherapyArchmageAgent", "BioinformaticsMasterAgent"] },
  { id: "helios-genesis:validation", level: 4, focus: "Adversarial validation", members: ["DrugDiscoveryComputationalAgent", "StructuralBiologyAgent"] },
  { id: "helios-genesis:dream", level: 5, focus: "Dream mode consolidation", members: ["ImmunologyEngineeringAgent"] },
];
