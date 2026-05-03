export interface GaiaSophiaSubSwarm {
  id: string;
  level: 1 | 2 | 3 | 4 | 5;
  focus: string;
  members: string[];
}

export const GaiaSophiaSubSwarms: GaiaSophiaSubSwarm[] = [
  { id: "gaia-sophia:strategic", level: 1, focus: "Grand strategy and arbitration", members: ["PhytochemistryArchmageAgent", "MechanismOfActionMolecularAgent"] },
  { id: "gaia-sophia:tactical", level: 2, focus: "Domain tactical synthesis", members: ["TraditionalChineseMedicineMasterAgent", "AyurvedicArchmageAgent", "AmazonianPlantMedicineAgent"] },
  { id: "gaia-sophia:execution", level: 3, focus: "Execution and optimization", members: ["MicrotherapyMushroomMasterAgent", "AromatherapyClinicalAgent"] },
  { id: "gaia-sophia:validation", level: 4, focus: "Adversarial validation", members: ["HomeopathyResearchAgent", "FloweEssenceTherapyAgent"] },
  { id: "gaia-sophia:dream", level: 5, focus: "Dream mode consolidation", members: ["OrthomolecularMegadoseAgent"] },
];
