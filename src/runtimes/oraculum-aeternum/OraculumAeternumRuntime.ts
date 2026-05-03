import { BaseCapabilityModule } from "@/runtimes/transcendent/BaseCapabilityModule";
import { TranscendentBaseAgent } from "@/runtimes/transcendent/TranscendentBaseAgent";
import { TranscendentRuntimeKernel } from "@/runtimes/transcendent/TranscendentRuntimeKernel";
import { ORACULUM_AETERNUM_SYSTEM_PROMPT } from "@/runtimes/oraculum-aeternum/prompts/systemPrompt";
import { OraculumAeternumToolPack } from "@/runtimes/oraculum-aeternum/tools/OraculumAeternumToolPack";
import { OraculumAeternumMemorySeeds } from "@/runtimes/oraculum-aeternum/memory/OraculumAeternumMemorySeeds";
import { OraculumAeternumDreamPatterns } from "@/runtimes/oraculum-aeternum/memory/OraculumAeternumDreamPatterns";
import { InterRuntimeResonanceMemory } from "@/runtimes/transcendent/HyperdimensionalMemoryGraph";

const AGENT_SPECS = [
  { id: "oraculum-aeternum:GreatPowerCompetition", name: "GreatPowerCompetitionAgent", specialties: ["GreatPowerCompetition", "Oraculum Aeternum Runtime", "adversarial review"] },
  { id: "oraculum-aeternum:IntelligenceAnalysisOmniscient", name: "IntelligenceAnalysisOmniscientAgent", specialties: ["IntelligenceAnalysisOmniscient", "Oraculum Aeternum Runtime", "adversarial review"] },
  { id: "oraculum-aeternum:MilitaryStrategyArchmage", name: "MilitaryStrategyArchmageAgent", specialties: ["MilitaryStrategyArchmage", "Oraculum Aeternum Runtime", "adversarial review"] },
  { id: "oraculum-aeternum:EnergyGeopolitics", name: "EnergyGeopoliticsAgent", specialties: ["EnergyGeopolitics", "Oraculum Aeternum Runtime", "adversarial review"] },
  { id: "oraculum-aeternum:TechnologyGeopolitics", name: "TechnologyGeopoliticsAgent", specialties: ["TechnologyGeopolitics", "Oraculum Aeternum Runtime", "adversarial review"] },
  { id: "oraculum-aeternum:CurrencyReserveDynamics", name: "CurrencyReserveDynamicsAgent", specialties: ["CurrencyReserveDynamics", "Oraculum Aeternum Runtime", "adversarial review"] },
  { id: "oraculum-aeternum:DemographicForecasting", name: "DemographicForecastingAgent", specialties: ["DemographicForecasting", "Oraculum Aeternum Runtime", "adversarial review"] },
  { id: "oraculum-aeternum:EconomicWarfareSpecialist", name: "EconomicWarfareSpecialistAgent", specialties: ["EconomicWarfareSpecialist", "Oraculum Aeternum Runtime", "adversarial review"] },
  { id: "oraculum-aeternum:CyberWarfareIntelligence", name: "CyberWarfareIntelligenceAgent", specialties: ["CyberWarfareIntelligence", "Oraculum Aeternum Runtime", "adversarial review"] },
  { id: "oraculum-aeternum:CivilizationalCycleAnalyst", name: "CivilizationalCycleAnalystAgent", specialties: ["CivilizationalCycleAnalyst", "Oraculum Aeternum Runtime", "adversarial review"] },
  { id: "oraculum-aeternum:BlackSwanTailRisk", name: "BlackSwanTailRiskAgent", specialties: ["BlackSwanTailRisk", "Oraculum Aeternum Runtime", "adversarial review"] },
  { id: "oraculum-aeternum:GlobalSupplyChain", name: "GlobalSupplyChainAgent", specialties: ["GlobalSupplyChain", "Oraculum Aeternum Runtime", "adversarial review"] },
  { id: "oraculum-aeternum:SpaceGeopolitics", name: "SpaceGeopoliticsAgent", specialties: ["SpaceGeopolitics", "Oraculum Aeternum Runtime", "adversarial review"] },
  { id: "oraculum-aeternum:GlobalElitesNetwork", name: "GlobalElitesNetworkAgent", specialties: ["GlobalElitesNetwork", "Oraculum Aeternum Runtime", "adversarial review"] },
  { id: "oraculum-aeternum:PoliticalRiskAnalyst", name: "PoliticalRiskAnalystAgent", specialties: ["PoliticalRiskAnalyst", "Oraculum Aeternum Runtime", "adversarial review"] },
  { id: "oraculum-aeternum:HistoricalPatternMatcher", name: "HistoricalPatternMatcherAgent", specialties: ["HistoricalPatternMatcher", "Oraculum Aeternum Runtime", "adversarial review"] },
  { id: "oraculum-aeternum:MediaInformationLandscape", name: "MediaInformationLandscapeAgent", specialties: ["MediaInformationLandscape", "Oraculum Aeternum Runtime", "adversarial review"] },
  { id: "oraculum-aeternum:GlobalEnvironmentalGeopolitics", name: "GlobalEnvironmentalGeopoliticsAgent", specialties: ["GlobalEnvironmentalGeopolitics", "Oraculum Aeternum Runtime", "adversarial review"] },
  { id: "oraculum-aeternum:ReligionIdeologyDynamics", name: "ReligionIdeologyDynamicsAgent", specialties: ["ReligionIdeologyDynamics", "Oraculum Aeternum Runtime", "adversarial review"] },
  { id: "oraculum-aeternum:ScenarioPlanningArchmage", name: "ScenarioPlanningArchmageAgent", specialties: ["ScenarioPlanningArchmage", "Oraculum Aeternum Runtime", "adversarial review"] },
  { id: "oraculum-aeternum:GeopoliticalAlphaGeneration", name: "GeopoliticalAlphaGenerationAgent", specialties: ["GeopoliticalAlphaGeneration", "Oraculum Aeternum Runtime", "adversarial review"] },
  { id: "oraculum-aeternum:GrandStrategyArchitect", name: "GrandStrategyArchitectAgent", specialties: ["GrandStrategyArchitect", "Oraculum Aeternum Runtime", "adversarial review"] },
] as const;

const CORE_CAPABILITIES = [
  new BaseCapabilityModule("oraculum-aeternum:SuperpositionalReasoner", "SuperpositionalReasoner capability for Oraculum Aeternum Runtime"),
  new BaseCapabilityModule("oraculum-aeternum:RecursiveSelfImprover", "RecursiveSelfImprover capability for Oraculum Aeternum Runtime"),
  new BaseCapabilityModule("oraculum-aeternum:CounterfactualSimulator", "CounterfactualSimulator capability for Oraculum Aeternum Runtime"),
  new BaseCapabilityModule("oraculum-aeternum:HyperdimensionalMemory", "HyperdimensionalMemory capability for Oraculum Aeternum Runtime"),
  new BaseCapabilityModule("oraculum-aeternum:TemporalAbstraction", "TemporalAbstraction capability for Oraculum Aeternum Runtime"),
  new BaseCapabilityModule("oraculum-aeternum:DreamModeEngine", "DreamModeEngine capability for Oraculum Aeternum Runtime"),
  new BaseCapabilityModule("oraculum-aeternum:MultiAgentDebateProtocol", "MultiAgentDebateProtocol capability for Oraculum Aeternum Runtime"),
  new BaseCapabilityModule("oraculum-aeternum:CausalInferenceEngine", "CausalInferenceEngine capability for Oraculum Aeternum Runtime"),
  new BaseCapabilityModule("oraculum-aeternum:MetacognitiveCalibrator", "MetacognitiveCalibrator capability for Oraculum Aeternum Runtime"),
  new BaseCapabilityModule("oraculum-aeternum:MultimodalFusion", "MultimodalFusion capability for Oraculum Aeternum Runtime"),
  new BaseCapabilityModule("oraculum-aeternum:EmergenceMonitor", "EmergenceMonitor capability for Oraculum Aeternum Runtime"),
  new BaseCapabilityModule("oraculum-aeternum:PredictiveWorldModel", "PredictiveWorldModel capability for Oraculum Aeternum Runtime"),
  new BaseCapabilityModule("oraculum-aeternum:AdversarialReviewer", "AdversarialReviewer capability for Oraculum Aeternum Runtime"),
  new BaseCapabilityModule("oraculum-aeternum:EthicsKernel", "EthicsKernel capability for Oraculum Aeternum Runtime"),
  new BaseCapabilityModule("oraculum-aeternum:ResonanceProtocol", "ResonanceProtocol capability for Oraculum Aeternum Runtime"),
] as const;

export class OraculumAeternumRuntime extends TranscendentRuntimeKernel {
  constructor() {
    super(
      "oraculum-aeternum",
      "Oraculum Aeternum Runtime",
      "Geopolitical Intelligence, Macro Strategy & Civilizational Forecasting",
      ORACULUM_AETERNUM_SYSTEM_PROMPT,
      AGENT_SPECS.map((agent) => new TranscendentBaseAgent(agent.id, agent.name, "Geopolitical Intelligence, Macro Strategy & Civilizational Forecasting", [...agent.specialties])),
      [
        ...CORE_CAPABILITIES,
        ...OraculumAeternumToolPack,
      ],
      [
        "This runtime provides informational synthesis and requires human oversight for high-stakes decisions.",
      ],
    );

    for (const node of OraculumAeternumMemorySeeds.nodes.slice(0, 24)) {
      InterRuntimeResonanceMemory.broadcast("oraculum-aeternum", node);
    }
    for (const pattern of OraculumAeternumDreamPatterns) {
      InterRuntimeResonanceMemory.broadcast("oraculum-aeternum:dream", {
        id: pattern,
        label: pattern,
        at: Date.now(),
        domain: "Geopolitical Intelligence, Macro Strategy & Civilizational Forecasting",
        confidence: 0.7,
        tags: ["dream", "oraculum-aeternum"],
        sourceRuntime: "oraculum-aeternum",
      });
    }
  }
}
