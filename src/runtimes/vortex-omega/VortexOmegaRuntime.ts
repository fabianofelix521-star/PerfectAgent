import { BaseCapabilityModule } from "@/runtimes/transcendent/BaseCapabilityModule";
import { TranscendentBaseAgent } from "@/runtimes/transcendent/TranscendentBaseAgent";
import { TranscendentRuntimeKernel } from "@/runtimes/transcendent/TranscendentRuntimeKernel";
import { VORTEX_OMEGA_SYSTEM_PROMPT } from "@/runtimes/vortex-omega/prompts/systemPrompt";
import { VortexOmegaToolPack } from "@/runtimes/vortex-omega/tools/VortexOmegaToolPack";
import { VortexOmegaMemorySeeds } from "@/runtimes/vortex-omega/memory/VortexOmegaMemorySeeds";
import { VortexOmegaDreamPatterns } from "@/runtimes/vortex-omega/memory/VortexOmegaDreamPatterns";
import { InterRuntimeResonanceMemory } from "@/runtimes/transcendent/HyperdimensionalMemoryGraph";

const AGENT_SPECS = [
  { id: "vortex-omega:CulturalTrendProphetic", name: "CulturalTrendPropheticAgent", specialties: ["CulturalTrendProphetic", "Vortex Omega Runtime", "adversarial review"] },
  { id: "vortex-omega:ViralCoefficientArchmage", name: "ViralCoefficientArchmageAgent", specialties: ["ViralCoefficientArchmage", "Vortex Omega Runtime", "adversarial review"] },
  { id: "vortex-omega:TikTokAlgorithmExploiter", name: "TikTokAlgorithmExploiterAgent", specialties: ["TikTokAlgorithmExploiter", "Vortex Omega Runtime", "adversarial review"] },
  { id: "vortex-omega:InstagramReelsScientist", name: "InstagramReelsScientistAgent", specialties: ["InstagramReelsScientist", "Vortex Omega Runtime", "adversarial review"] },
  { id: "vortex-omega:XTwitterAlgorithmHunter", name: "XTwitterAlgorithmHunterAgent", specialties: ["XTwitterAlgorithmHunter", "Vortex Omega Runtime", "adversarial review"] },
  { id: "vortex-omega:YouTubeLongFormStrategist", name: "YouTubeLongFormStrategistAgent", specialties: ["YouTubeLongFormStrategist", "Vortex Omega Runtime", "adversarial review"] },
  { id: "vortex-omega:LinkedInB2BPersuader", name: "LinkedInB2BPersuaderAgent", specialties: ["LinkedInB2BPersuader", "Vortex Omega Runtime", "adversarial review"] },
  { id: "vortex-omega:PaidMediaArchmage", name: "PaidMediaArchmageAgent", specialties: ["PaidMediaArchmage", "Vortex Omega Runtime", "adversarial review"] },
  { id: "vortex-omega:CreativeTestingFactory", name: "CreativeTestingFactoryAgent", specialties: ["CreativeTestingFactory", "Vortex Omega Runtime", "adversarial review"] },
  { id: "vortex-omega:InfluencerEcosystemOrchestrator", name: "InfluencerEcosystemOrchestratorAgent", specialties: ["InfluencerEcosystemOrchestrator", "Vortex Omega Runtime", "adversarial review"] },
  { id: "vortex-omega:CommunityCultivatorArchmage", name: "CommunityCultivatorArchmageAgent", specialties: ["CommunityCultivatorArchmage", "Vortex Omega Runtime", "adversarial review"] },
  { id: "vortex-omega:EmailMarketingAutomationGod", name: "EmailMarketingAutomationGodAgent", specialties: ["EmailMarketingAutomationGod", "Vortex Omega Runtime", "adversarial review"] },
  { id: "vortex-omega:SEOTopicalAuthorityArchitect", name: "SEOTopicalAuthorityArchitectAgent", specialties: ["SEOTopicalAuthorityArchitect", "Vortex Omega Runtime", "adversarial review"] },
  { id: "vortex-omega:ContentGenerationFactory", name: "ContentGenerationFactoryAgent", specialties: ["ContentGenerationFactory", "Vortex Omega Runtime", "adversarial review"] },
  { id: "vortex-omega:CopywritingTranscendent", name: "CopywritingTranscendentAgent", specialties: ["CopywritingTranscendent", "Vortex Omega Runtime", "adversarial review"] },
  { id: "vortex-omega:FunnelArchitectGrandmaster", name: "FunnelArchitectGrandmasterAgent", specialties: ["FunnelArchitectGrandmaster", "Vortex Omega Runtime", "adversarial review"] },
  { id: "vortex-omega:ConversionRateOptimizationScientist", name: "ConversionRateOptimizationScientistAgent", specialties: ["ConversionRateOptimizationScientist", "Vortex Omega Runtime", "adversarial review"] },
  { id: "vortex-omega:BrandMythologyArchitect", name: "BrandMythologyArchitectAgent", specialties: ["BrandMythologyArchitect", "Vortex Omega Runtime", "adversarial review"] },
  { id: "vortex-omega:CulturalMomentHijacker", name: "CulturalMomentHijackerAgent", specialties: ["CulturalMomentHijacker", "Vortex Omega Runtime", "adversarial review"] },
  { id: "vortex-omega:MultiTouchAttributionScientist", name: "MultiTouchAttributionScientistAgent", specialties: ["MultiTouchAttributionScientist", "Vortex Omega Runtime", "adversarial review"] },
  { id: "vortex-omega:CustomerLifetimeValueOracle", name: "CustomerLifetimeValueOracleAgent", specialties: ["CustomerLifetimeValueOracle", "Vortex Omega Runtime", "adversarial review"] },
  { id: "vortex-omega:GrowthLoopEngineer", name: "GrowthLoopEngineerAgent", specialties: ["GrowthLoopEngineer", "Vortex Omega Runtime", "adversarial review"] },
  { id: "vortex-omega:CrossCulturalLocalizationMaster", name: "CrossCulturalLocalizationMasterAgent", specialties: ["CrossCulturalLocalizationMaster", "Vortex Omega Runtime", "adversarial review"] },
  { id: "vortex-omega:PerformanceMarketingMercenary", name: "PerformanceMarketingMercenaryAgent", specialties: ["PerformanceMarketingMercenary", "Vortex Omega Runtime", "adversarial review"] },
  { id: "vortex-omega:PredictiveMarketingAI", name: "PredictiveMarketingAIAgent", specialties: ["PredictiveMarketingAI", "Vortex Omega Runtime", "adversarial review"] },
] as const;

const CORE_CAPABILITIES = [
  new BaseCapabilityModule("vortex-omega:SuperpositionalReasoner", "SuperpositionalReasoner capability for Vortex Omega Runtime"),
  new BaseCapabilityModule("vortex-omega:RecursiveSelfImprover", "RecursiveSelfImprover capability for Vortex Omega Runtime"),
  new BaseCapabilityModule("vortex-omega:CounterfactualSimulator", "CounterfactualSimulator capability for Vortex Omega Runtime"),
  new BaseCapabilityModule("vortex-omega:HyperdimensionalMemory", "HyperdimensionalMemory capability for Vortex Omega Runtime"),
  new BaseCapabilityModule("vortex-omega:TemporalAbstraction", "TemporalAbstraction capability for Vortex Omega Runtime"),
  new BaseCapabilityModule("vortex-omega:DreamModeEngine", "DreamModeEngine capability for Vortex Omega Runtime"),
  new BaseCapabilityModule("vortex-omega:MultiAgentDebateProtocol", "MultiAgentDebateProtocol capability for Vortex Omega Runtime"),
  new BaseCapabilityModule("vortex-omega:CausalInferenceEngine", "CausalInferenceEngine capability for Vortex Omega Runtime"),
  new BaseCapabilityModule("vortex-omega:MetacognitiveCalibrator", "MetacognitiveCalibrator capability for Vortex Omega Runtime"),
  new BaseCapabilityModule("vortex-omega:MultimodalFusion", "MultimodalFusion capability for Vortex Omega Runtime"),
  new BaseCapabilityModule("vortex-omega:EmergenceMonitor", "EmergenceMonitor capability for Vortex Omega Runtime"),
  new BaseCapabilityModule("vortex-omega:PredictiveWorldModel", "PredictiveWorldModel capability for Vortex Omega Runtime"),
  new BaseCapabilityModule("vortex-omega:AdversarialReviewer", "AdversarialReviewer capability for Vortex Omega Runtime"),
  new BaseCapabilityModule("vortex-omega:EthicsKernel", "EthicsKernel capability for Vortex Omega Runtime"),
  new BaseCapabilityModule("vortex-omega:ResonanceProtocol", "ResonanceProtocol capability for Vortex Omega Runtime"),
] as const;

export class VortexOmegaRuntime extends TranscendentRuntimeKernel {
  constructor() {
    super(
      "vortex-omega",
      "Vortex Omega Runtime",
      "Omni-Channel Marketing Apex & Viral Genesis",
      VORTEX_OMEGA_SYSTEM_PROMPT,
      AGENT_SPECS.map((agent) => new TranscendentBaseAgent(agent.id, agent.name, "Omni-Channel Marketing Apex & Viral Genesis", [...agent.specialties])),
      [
        ...CORE_CAPABILITIES,
        ...VortexOmegaToolPack,
      ],
      [
        "This runtime provides informational synthesis and requires human oversight for high-stakes decisions.",
      ],
    );

    for (const node of VortexOmegaMemorySeeds.nodes.slice(0, 24)) {
      InterRuntimeResonanceMemory.broadcast("vortex-omega", node);
    }
    for (const pattern of VortexOmegaDreamPatterns) {
      InterRuntimeResonanceMemory.broadcast("vortex-omega:dream", {
        id: pattern,
        label: pattern,
        at: Date.now(),
        domain: "Omni-Channel Marketing Apex & Viral Genesis",
        confidence: 0.7,
        tags: ["dream", "vortex-omega"],
        sourceRuntime: "vortex-omega",
      });
    }
  }
}
