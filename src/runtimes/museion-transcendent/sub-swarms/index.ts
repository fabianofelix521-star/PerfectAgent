export interface MuseionTranscendentSubSwarm {
  id: string;
  level: 1 | 2 | 3 | 4 | 5;
  focus: string;
  members: string[];
}

export const MuseionTranscendentSubSwarms: MuseionTranscendentSubSwarm[] = [
  { id: "museion-transcendent:strategic", level: 1, focus: "Grand strategy and arbitration", members: ["MusicCompositionArchmageAgent", "OrchestralCompositionAgent"] },
  { id: "museion-transcendent:tactical", level: 2, focus: "Domain tactical synthesis", members: ["ElectronicMusicProducerAgent", "JazzImprovisationAgent", "WorldMusicMasterAgent"] },
  { id: "museion-transcendent:execution", level: 3, focus: "Execution and optimization", members: ["VisualArtPainterArchmageAgent", "IllustrationDesignAgent"] },
  { id: "museion-transcendent:validation", level: 4, focus: "Adversarial validation", members: ["GraphicDesignArchmageAgent", "CinematographyDirectorAgent"] },
  { id: "museion-transcendent:dream", level: 5, focus: "Dream mode consolidation", members: ["ScreenwritingArchmageAgent"] },
];
