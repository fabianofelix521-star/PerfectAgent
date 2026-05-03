export interface MidasInfinitySubSwarm {
  id: string;
  level: 1 | 2 | 3 | 4 | 5;
  focus: string;
  members: string[];
}

export const MidasInfinitySubSwarms: MidasInfinitySubSwarm[] = [
  { id: "midas-infinity:strategic", level: 1, focus: "Grand strategy and arbitration", members: ["EquityFundamentalAnalystAgent", "TechnicalAnalysisInstitutionalAgent"] },
  { id: "midas-infinity:tactical", level: 2, focus: "Domain tactical synthesis", members: ["MacroEconomicStrategistAgent", "ForexTradingArchmageAgent", "OptionsVolatilityWizardAgent"] },
  { id: "midas-infinity:execution", level: 3, focus: "Execution and optimization", members: ["FuturesTradingMasterAgent", "CommoditiesSpecialistAgent"] },
  { id: "midas-infinity:validation", level: 4, focus: "Adversarial validation", members: ["FixedIncomeRatesArchmageAgent", "QuantitativeStrategistAgent"] },
  { id: "midas-infinity:dream", level: 5, focus: "Dream mode consolidation", members: ["HighFrequencyMicrostructureAgent"] },
];
