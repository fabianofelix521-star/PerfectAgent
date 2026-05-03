import { BaseCapabilityModule } from "@/runtimes/transcendent/BaseCapabilityModule";
import { TranscendentBaseAgent } from "@/runtimes/transcendent/TranscendentBaseAgent";
import { TranscendentRuntimeKernel } from "@/runtimes/transcendent/TranscendentRuntimeKernel";
import { ATLAS_IMMORTALIS_SYSTEM_PROMPT } from "@/runtimes/atlas-immortalis/prompts/systemPrompt";
import { AtlasImmortalisToolPack } from "@/runtimes/atlas-immortalis/tools/AtlasImmortalisToolPack";
import { AtlasImmortalisMemorySeeds } from "@/runtimes/atlas-immortalis/memory/AtlasImmortalisMemorySeeds";
import { AtlasImmortalisDreamPatterns } from "@/runtimes/atlas-immortalis/memory/AtlasImmortalisDreamPatterns";
import { InterRuntimeResonanceMemory } from "@/runtimes/transcendent/HyperdimensionalMemoryGraph";

const AGENT_SPECS = [
  { id: "atlas-immortalis:HallmarksOfAgingArchmage", name: "HallmarksOfAgingArchmageAgent", specialties: ["HallmarksOfAgingArchmage", "Atlas Immortalis Runtime", "adversarial review"] },
  { id: "atlas-immortalis:EpigeneticReversal", name: "EpigeneticReversalAgent", specialties: ["EpigeneticReversal", "Atlas Immortalis Runtime", "adversarial review"] },
  { id: "atlas-immortalis:HormonalOptimizationDeity", name: "HormonalOptimizationDeityAgent", specialties: ["HormonalOptimizationDeity", "Atlas Immortalis Runtime", "adversarial review"] },
  { id: "atlas-immortalis:MitochondrialOptimization", name: "MitochondrialOptimizationAgent", specialties: ["MitochondrialOptimization", "Atlas Immortalis Runtime", "adversarial review"] },
  { id: "atlas-immortalis:SleepOptimizationGod", name: "SleepOptimizationGodAgent", specialties: ["SleepOptimizationGod", "Atlas Immortalis Runtime", "adversarial review"] },
  { id: "atlas-immortalis:CircadianBiologyMaster", name: "CircadianBiologyMasterAgent", specialties: ["CircadianBiologyMaster", "Atlas Immortalis Runtime", "adversarial review"] },
  { id: "atlas-immortalis:NutritionPersonalization", name: "NutritionPersonalizationAgent", specialties: ["NutritionPersonalization", "Atlas Immortalis Runtime", "adversarial review"] },
  { id: "atlas-immortalis:FastingProtocolArchmage", name: "FastingProtocolArchmageAgent", specialties: ["FastingProtocolArchmage", "Atlas Immortalis Runtime", "adversarial review"] },
  { id: "atlas-immortalis:MovementMedicine", name: "MovementMedicineAgent", specialties: ["MovementMedicine", "Atlas Immortalis Runtime", "adversarial review"] },
  { id: "atlas-immortalis:StrengthHypertrophyArchmage", name: "StrengthHypertrophyArchmageAgent", specialties: ["StrengthHypertrophyArchmage", "Atlas Immortalis Runtime", "adversarial review"] },
  { id: "atlas-immortalis:CardiovascularConditioning", name: "CardiovascularConditioningAgent", specialties: ["CardiovascularConditioning", "Atlas Immortalis Runtime", "adversarial review"] },
  { id: "atlas-immortalis:BodyCompositionOptimization", name: "BodyCompositionOptimizationAgent", specialties: ["BodyCompositionOptimization", "Atlas Immortalis Runtime", "adversarial review"] },
  { id: "atlas-immortalis:StressResilienceArchitect", name: "StressResilienceArchitectAgent", specialties: ["StressResilienceArchitect", "Atlas Immortalis Runtime", "adversarial review"] },
  { id: "atlas-immortalis:CognitiveOptimization", name: "CognitiveOptimizationAgent", specialties: ["CognitiveOptimization", "Atlas Immortalis Runtime", "adversarial review"] },
  { id: "atlas-immortalis:EmotionalIntelligence", name: "EmotionalIntelligenceAgent", specialties: ["EmotionalIntelligence", "Atlas Immortalis Runtime", "adversarial review"] },
  { id: "atlas-immortalis:BiomarkerTrackingObsessive", name: "BiomarkerTrackingObsessiveAgent", specialties: ["BiomarkerTrackingObsessive", "Atlas Immortalis Runtime", "adversarial review"] },
  { id: "atlas-immortalis:SupplementProtocolGrandmaster", name: "SupplementProtocolGrandmasterAgent", specialties: ["SupplementProtocolGrandmaster", "Atlas Immortalis Runtime", "adversarial review"] },
  { id: "atlas-immortalis:DetoxificationOptimization", name: "DetoxificationOptimizationAgent", specialties: ["DetoxificationOptimization", "Atlas Immortalis Runtime", "adversarial review"] },
  { id: "atlas-immortalis:GutHealthOptimization", name: "GutHealthOptimizationAgent", specialties: ["GutHealthOptimization", "Atlas Immortalis Runtime", "adversarial review"] },
  { id: "atlas-immortalis:SkinAestheticOptimization", name: "SkinAestheticOptimizationAgent", specialties: ["SkinAestheticOptimization", "Atlas Immortalis Runtime", "adversarial review"] },
  { id: "atlas-immortalis:SpiritualLongevity", name: "SpiritualLongevityAgent", specialties: ["SpiritualLongevity", "Atlas Immortalis Runtime", "adversarial review"] },
  { id: "atlas-immortalis:PersonalizedProtocolSynthesizer", name: "PersonalizedProtocolSynthesizerAgent", specialties: ["PersonalizedProtocolSynthesizer", "Atlas Immortalis Runtime", "adversarial review"] },
] as const;

const CORE_CAPABILITIES = [
  new BaseCapabilityModule("atlas-immortalis:SuperpositionalReasoner", "SuperpositionalReasoner capability for Atlas Immortalis Runtime"),
  new BaseCapabilityModule("atlas-immortalis:RecursiveSelfImprover", "RecursiveSelfImprover capability for Atlas Immortalis Runtime"),
  new BaseCapabilityModule("atlas-immortalis:CounterfactualSimulator", "CounterfactualSimulator capability for Atlas Immortalis Runtime"),
  new BaseCapabilityModule("atlas-immortalis:HyperdimensionalMemory", "HyperdimensionalMemory capability for Atlas Immortalis Runtime"),
  new BaseCapabilityModule("atlas-immortalis:TemporalAbstraction", "TemporalAbstraction capability for Atlas Immortalis Runtime"),
  new BaseCapabilityModule("atlas-immortalis:DreamModeEngine", "DreamModeEngine capability for Atlas Immortalis Runtime"),
  new BaseCapabilityModule("atlas-immortalis:MultiAgentDebateProtocol", "MultiAgentDebateProtocol capability for Atlas Immortalis Runtime"),
  new BaseCapabilityModule("atlas-immortalis:CausalInferenceEngine", "CausalInferenceEngine capability for Atlas Immortalis Runtime"),
  new BaseCapabilityModule("atlas-immortalis:MetacognitiveCalibrator", "MetacognitiveCalibrator capability for Atlas Immortalis Runtime"),
  new BaseCapabilityModule("atlas-immortalis:MultimodalFusion", "MultimodalFusion capability for Atlas Immortalis Runtime"),
  new BaseCapabilityModule("atlas-immortalis:EmergenceMonitor", "EmergenceMonitor capability for Atlas Immortalis Runtime"),
  new BaseCapabilityModule("atlas-immortalis:PredictiveWorldModel", "PredictiveWorldModel capability for Atlas Immortalis Runtime"),
  new BaseCapabilityModule("atlas-immortalis:AdversarialReviewer", "AdversarialReviewer capability for Atlas Immortalis Runtime"),
  new BaseCapabilityModule("atlas-immortalis:EthicsKernel", "EthicsKernel capability for Atlas Immortalis Runtime"),
  new BaseCapabilityModule("atlas-immortalis:ResonanceProtocol", "ResonanceProtocol capability for Atlas Immortalis Runtime"),
] as const;

export class AtlasImmortalisRuntime extends TranscendentRuntimeKernel {
  constructor() {
    super(
      "atlas-immortalis",
      "Atlas Immortalis Runtime",
      "Longevity, Anti-Aging & Human Performance Optimization",
      ATLAS_IMMORTALIS_SYSTEM_PROMPT,
      AGENT_SPECS.map((agent) => new TranscendentBaseAgent(agent.id, agent.name, "Longevity, Anti-Aging & Human Performance Optimization", [...agent.specialties])),
      [
        ...CORE_CAPABILITIES,
        ...AtlasImmortalisToolPack,
      ],
      [
        "This runtime provides informational synthesis and requires human oversight for high-stakes decisions.",
      ],
    );

    for (const node of AtlasImmortalisMemorySeeds.nodes.slice(0, 24)) {
      InterRuntimeResonanceMemory.broadcast("atlas-immortalis", node);
    }
    for (const pattern of AtlasImmortalisDreamPatterns) {
      InterRuntimeResonanceMemory.broadcast("atlas-immortalis:dream", {
        id: pattern,
        label: pattern,
        at: Date.now(),
        domain: "Longevity, Anti-Aging & Human Performance Optimization",
        confidence: 0.7,
        tags: ["dream", "atlas-immortalis"],
        sourceRuntime: "atlas-immortalis",
      });
    }
  }
}
