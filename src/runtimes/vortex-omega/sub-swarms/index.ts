export interface VortexOmegaSubSwarm {
  id: string;
  level: 1 | 2 | 3 | 4 | 5;
  focus: string;
  members: string[];
}

export const VortexOmegaSubSwarms: VortexOmegaSubSwarm[] = [
  { id: "vortex-omega:strategic", level: 1, focus: "Grand strategy and arbitration", members: ["CulturalTrendPropheticAgent", "ViralCoefficientArchmageAgent"] },
  { id: "vortex-omega:tactical", level: 2, focus: "Domain tactical synthesis", members: ["TikTokAlgorithmExploiterAgent", "InstagramReelsScientistAgent", "XTwitterAlgorithmHunterAgent"] },
  { id: "vortex-omega:execution", level: 3, focus: "Execution and optimization", members: ["YouTubeLongFormStrategistAgent", "LinkedInB2BPersuaderAgent"] },
  { id: "vortex-omega:validation", level: 4, focus: "Adversarial validation", members: ["PaidMediaArchmageAgent", "CreativeTestingFactoryAgent"] },
  { id: "vortex-omega:dream", level: 5, focus: "Dream mode consolidation", members: ["InfluencerEcosystemOrchestratorAgent"] },
];
