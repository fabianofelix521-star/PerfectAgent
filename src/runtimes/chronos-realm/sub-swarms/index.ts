export interface ChronosRealmSubSwarm {
  id: string;
  level: 1 | 2 | 3 | 4 | 5;
  focus: string;
  members: string[];
}

export const ChronosRealmSubSwarms: ChronosRealmSubSwarm[] = [
  { id: "chronos-realm:strategic", level: 1, focus: "Grand strategy and arbitration", members: ["SpectralPathTracingDeityAgent", "NaniteVirtualizedGeometryAgent"] },
  { id: "chronos-realm:tactical", level: 2, focus: "Domain tactical synthesis", members: ["MaterialPBRMolecularAgent", "AtmosphericVolumetricMasterAgent", "FluidDynamicsArchmageAgent"] },
  { id: "chronos-realm:execution", level: 3, focus: "Execution and optimization", members: ["DestructionDynamicsGodAgent", "ClothBodyDynamicsMasterAgent"] },
  { id: "chronos-realm:validation", level: 4, focus: "Adversarial validation", members: ["CognitiveNPCSoulSmithAgent", "DialogueGenerationSentientAgent"] },
  { id: "chronos-realm:dream", level: 5, focus: "Dream mode consolidation", members: ["EmergentNarrativeDirectorAgent"] },
];
