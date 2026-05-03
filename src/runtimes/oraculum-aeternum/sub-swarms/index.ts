export interface OraculumAeternumSubSwarm {
  id: string;
  level: 1 | 2 | 3 | 4 | 5;
  focus: string;
  members: string[];
}

export const OraculumAeternumSubSwarms: OraculumAeternumSubSwarm[] = [
  { id: "oraculum-aeternum:strategic", level: 1, focus: "Grand strategy and arbitration", members: ["GreatPowerCompetitionAgent", "IntelligenceAnalysisOmniscientAgent"] },
  { id: "oraculum-aeternum:tactical", level: 2, focus: "Domain tactical synthesis", members: ["MilitaryStrategyArchmageAgent", "EnergyGeopoliticsAgent", "TechnologyGeopoliticsAgent"] },
  { id: "oraculum-aeternum:execution", level: 3, focus: "Execution and optimization", members: ["CurrencyReserveDynamicsAgent", "DemographicForecastingAgent"] },
  { id: "oraculum-aeternum:validation", level: 4, focus: "Adversarial validation", members: ["EconomicWarfareSpecialistAgent", "CyberWarfareIntelligenceAgent"] },
  { id: "oraculum-aeternum:dream", level: 5, focus: "Dream mode consolidation", members: ["CivilizationalCycleAnalystAgent"] },
];
