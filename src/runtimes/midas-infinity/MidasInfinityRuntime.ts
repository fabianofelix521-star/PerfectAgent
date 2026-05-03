import { BaseCapabilityModule } from "@/runtimes/transcendent/BaseCapabilityModule";
import { TranscendentBaseAgent } from "@/runtimes/transcendent/TranscendentBaseAgent";
import { TranscendentRuntimeKernel } from "@/runtimes/transcendent/TranscendentRuntimeKernel";
import { MIDAS_INFINITY_SYSTEM_PROMPT } from "@/runtimes/midas-infinity/prompts/systemPrompt";
import { MidasInfinityToolPack } from "@/runtimes/midas-infinity/tools/MidasInfinityToolPack";
import { MidasInfinityMemorySeeds } from "@/runtimes/midas-infinity/memory/MidasInfinityMemorySeeds";
import { MidasInfinityDreamPatterns } from "@/runtimes/midas-infinity/memory/MidasInfinityDreamPatterns";
import { InterRuntimeResonanceMemory } from "@/runtimes/transcendent/HyperdimensionalMemoryGraph";

const AGENT_SPECS = [
  { id: "midas-infinity:EquityFundamentalAnalyst", name: "EquityFundamentalAnalystAgent", specialties: ["EquityFundamentalAnalyst", "Midas Infinity Runtime", "adversarial review"] },
  { id: "midas-infinity:TechnicalAnalysisInstitutional", name: "TechnicalAnalysisInstitutionalAgent", specialties: ["TechnicalAnalysisInstitutional", "Midas Infinity Runtime", "adversarial review"] },
  { id: "midas-infinity:MacroEconomicStrategist", name: "MacroEconomicStrategistAgent", specialties: ["MacroEconomicStrategist", "Midas Infinity Runtime", "adversarial review"] },
  { id: "midas-infinity:ForexTradingArchmage", name: "ForexTradingArchmageAgent", specialties: ["ForexTradingArchmage", "Midas Infinity Runtime", "adversarial review"] },
  { id: "midas-infinity:OptionsVolatilityWizard", name: "OptionsVolatilityWizardAgent", specialties: ["OptionsVolatilityWizard", "Midas Infinity Runtime", "adversarial review"] },
  { id: "midas-infinity:FuturesTradingMaster", name: "FuturesTradingMasterAgent", specialties: ["FuturesTradingMaster", "Midas Infinity Runtime", "adversarial review"] },
  { id: "midas-infinity:CommoditiesSpecialist", name: "CommoditiesSpecialistAgent", specialties: ["CommoditiesSpecialist", "Midas Infinity Runtime", "adversarial review"] },
  { id: "midas-infinity:FixedIncomeRatesArchmage", name: "FixedIncomeRatesArchmageAgent", specialties: ["FixedIncomeRatesArchmage", "Midas Infinity Runtime", "adversarial review"] },
  { id: "midas-infinity:QuantitativeStrategist", name: "QuantitativeStrategistAgent", specialties: ["QuantitativeStrategist", "Midas Infinity Runtime", "adversarial review"] },
  { id: "midas-infinity:HighFrequencyMicrostructure", name: "HighFrequencyMicrostructureAgent", specialties: ["HighFrequencyMicrostructure", "Midas Infinity Runtime", "adversarial review"] },
  { id: "midas-infinity:EventDrivenTrader", name: "EventDrivenTraderAgent", specialties: ["EventDrivenTrader", "Midas Infinity Runtime", "adversarial review"] },
  { id: "midas-infinity:VolatilityTrader", name: "VolatilityTraderAgent", specialties: ["VolatilityTrader", "Midas Infinity Runtime", "adversarial review"] },
  { id: "midas-infinity:CryptoToTradFiBridge", name: "CryptoToTradFiBridgeAgent", specialties: ["CryptoToTradFiBridge", "Midas Infinity Runtime", "adversarial review"] },
  { id: "midas-infinity:GlobalMacroPortfolio", name: "GlobalMacroPortfolioAgent", specialties: ["GlobalMacroPortfolio", "Midas Infinity Runtime", "adversarial review"] },
  { id: "midas-infinity:RiskManagementInstitutional", name: "RiskManagementInstitutionalAgent", specialties: ["RiskManagementInstitutional", "Midas Infinity Runtime", "adversarial review"] },
  { id: "midas-infinity:PortfolioConstructionScientist", name: "PortfolioConstructionScientistAgent", specialties: ["PortfolioConstructionScientist", "Midas Infinity Runtime", "adversarial review"] },
  { id: "midas-infinity:BacktestingForwardTesting", name: "BacktestingForwardTestingAgent", specialties: ["BacktestingForwardTesting", "Midas Infinity Runtime", "adversarial review"] },
  { id: "midas-infinity:AlgorithmicExecution", name: "AlgorithmicExecutionAgent", specialties: ["AlgorithmicExecution", "Midas Infinity Runtime", "adversarial review"] },
  { id: "midas-infinity:SectorRotationStrategist", name: "SectorRotationStrategistAgent", specialties: ["SectorRotationStrategist", "Midas Infinity Runtime", "adversarial review"] },
  { id: "midas-infinity:EarningsCalendarTrader", name: "EarningsCalendarTraderAgent", specialties: ["EarningsCalendarTrader", "Midas Infinity Runtime", "adversarial review"] },
  { id: "midas-infinity:SentimentAlternativeData", name: "SentimentAlternativeDataAgent", specialties: ["SentimentAlternativeData", "Midas Infinity Runtime", "adversarial review"] },
  { id: "midas-infinity:TaxOptimizationStrategist", name: "TaxOptimizationStrategistAgent", specialties: ["TaxOptimizationStrategist", "Midas Infinity Runtime", "adversarial review"] },
  { id: "midas-infinity:TradingPsychologySovereign", name: "TradingPsychologySovereignAgent", specialties: ["TradingPsychologySovereign", "Midas Infinity Runtime", "adversarial review"] },
  { id: "midas-infinity:LiquidityAnalysis", name: "LiquidityAnalysisAgent", specialties: ["LiquidityAnalysis", "Midas Infinity Runtime", "adversarial review"] },
  { id: "midas-infinity:MarketRegimeDetector", name: "MarketRegimeDetectorAgent", specialties: ["MarketRegimeDetector", "Midas Infinity Runtime", "adversarial review"] },
] as const;

const CORE_CAPABILITIES = [
  new BaseCapabilityModule("midas-infinity:SuperpositionalReasoner", "SuperpositionalReasoner capability for Midas Infinity Runtime"),
  new BaseCapabilityModule("midas-infinity:RecursiveSelfImprover", "RecursiveSelfImprover capability for Midas Infinity Runtime"),
  new BaseCapabilityModule("midas-infinity:CounterfactualSimulator", "CounterfactualSimulator capability for Midas Infinity Runtime"),
  new BaseCapabilityModule("midas-infinity:HyperdimensionalMemory", "HyperdimensionalMemory capability for Midas Infinity Runtime"),
  new BaseCapabilityModule("midas-infinity:TemporalAbstraction", "TemporalAbstraction capability for Midas Infinity Runtime"),
  new BaseCapabilityModule("midas-infinity:DreamModeEngine", "DreamModeEngine capability for Midas Infinity Runtime"),
  new BaseCapabilityModule("midas-infinity:MultiAgentDebateProtocol", "MultiAgentDebateProtocol capability for Midas Infinity Runtime"),
  new BaseCapabilityModule("midas-infinity:CausalInferenceEngine", "CausalInferenceEngine capability for Midas Infinity Runtime"),
  new BaseCapabilityModule("midas-infinity:MetacognitiveCalibrator", "MetacognitiveCalibrator capability for Midas Infinity Runtime"),
  new BaseCapabilityModule("midas-infinity:MultimodalFusion", "MultimodalFusion capability for Midas Infinity Runtime"),
  new BaseCapabilityModule("midas-infinity:EmergenceMonitor", "EmergenceMonitor capability for Midas Infinity Runtime"),
  new BaseCapabilityModule("midas-infinity:PredictiveWorldModel", "PredictiveWorldModel capability for Midas Infinity Runtime"),
  new BaseCapabilityModule("midas-infinity:AdversarialReviewer", "AdversarialReviewer capability for Midas Infinity Runtime"),
  new BaseCapabilityModule("midas-infinity:EthicsKernel", "EthicsKernel capability for Midas Infinity Runtime"),
  new BaseCapabilityModule("midas-infinity:ResonanceProtocol", "ResonanceProtocol capability for Midas Infinity Runtime"),
] as const;

export class MidasInfinityRuntime extends TranscendentRuntimeKernel {
  constructor() {
    super(
      "midas-infinity",
      "Midas Infinity Runtime",
      "Universal Trading Across TradFi and Derivatives",
      MIDAS_INFINITY_SYSTEM_PROMPT,
      AGENT_SPECS.map((agent) => new TranscendentBaseAgent(agent.id, agent.name, "Universal Trading Across TradFi and Derivatives", [...agent.specialties])),
      [
        ...CORE_CAPABILITIES,
        ...MidasInfinityToolPack,
      ],
      [
        "This runtime provides informational synthesis and requires human oversight for high-stakes decisions.",
      ],
    );

    for (const node of MidasInfinityMemorySeeds.nodes.slice(0, 24)) {
      InterRuntimeResonanceMemory.broadcast("midas-infinity", node);
    }
    for (const pattern of MidasInfinityDreamPatterns) {
      InterRuntimeResonanceMemory.broadcast("midas-infinity:dream", {
        id: pattern,
        label: pattern,
        at: Date.now(),
        domain: "Universal Trading Across TradFi and Derivatives",
        confidence: 0.7,
        tags: ["dream", "midas-infinity"],
        sourceRuntime: "midas-infinity",
      });
    }
  }
}
