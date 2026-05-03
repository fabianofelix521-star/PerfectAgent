import { BaseCapabilityModule } from "@/runtimes/transcendent/BaseCapabilityModule";
import { TranscendentBaseAgent } from "@/runtimes/transcendent/TranscendentBaseAgent";
import { TranscendentRuntimeKernel } from "@/runtimes/transcendent/TranscendentRuntimeKernel";
import { CHRONOS_REALM_SYSTEM_PROMPT } from "@/runtimes/chronos-realm/prompts/systemPrompt";
import { ChronosRealmToolPack } from "@/runtimes/chronos-realm/tools/ChronosRealmToolPack";
import { ChronosRealmMemorySeeds } from "@/runtimes/chronos-realm/memory/ChronosRealmMemorySeeds";
import { ChronosRealmDreamPatterns } from "@/runtimes/chronos-realm/memory/ChronosRealmDreamPatterns";
import { InterRuntimeResonanceMemory } from "@/runtimes/transcendent/HyperdimensionalMemoryGraph";

const AGENT_SPECS = [
  { id: "chronos-realm:SpectralPathTracingDeity", name: "SpectralPathTracingDeityAgent", specialties: ["SpectralPathTracingDeity", "Chronos Realm Runtime", "adversarial review"] },
  { id: "chronos-realm:NaniteVirtualizedGeometry", name: "NaniteVirtualizedGeometryAgent", specialties: ["NaniteVirtualizedGeometry", "Chronos Realm Runtime", "adversarial review"] },
  { id: "chronos-realm:MaterialPBRMolecular", name: "MaterialPBRMolecularAgent", specialties: ["MaterialPBRMolecular", "Chronos Realm Runtime", "adversarial review"] },
  { id: "chronos-realm:AtmosphericVolumetricMaster", name: "AtmosphericVolumetricMasterAgent", specialties: ["AtmosphericVolumetricMaster", "Chronos Realm Runtime", "adversarial review"] },
  { id: "chronos-realm:FluidDynamicsArchmage", name: "FluidDynamicsArchmageAgent", specialties: ["FluidDynamicsArchmage", "Chronos Realm Runtime", "adversarial review"] },
  { id: "chronos-realm:DestructionDynamicsGod", name: "DestructionDynamicsGodAgent", specialties: ["DestructionDynamicsGod", "Chronos Realm Runtime", "adversarial review"] },
  { id: "chronos-realm:ClothBodyDynamicsMaster", name: "ClothBodyDynamicsMasterAgent", specialties: ["ClothBodyDynamicsMaster", "Chronos Realm Runtime", "adversarial review"] },
  { id: "chronos-realm:CognitiveNPCSoulSmith", name: "CognitiveNPCSoulSmithAgent", specialties: ["CognitiveNPCSoulSmith", "Chronos Realm Runtime", "adversarial review"] },
  { id: "chronos-realm:DialogueGenerationSentient", name: "DialogueGenerationSentientAgent", specialties: ["DialogueGenerationSentient", "Chronos Realm Runtime", "adversarial review"] },
  { id: "chronos-realm:EmergentNarrativeDirector", name: "EmergentNarrativeDirectorAgent", specialties: ["EmergentNarrativeDirector", "Chronos Realm Runtime", "adversarial review"] },
  { id: "chronos-realm:ProceduralWorldGenesis", name: "ProceduralWorldGenesisAgent", specialties: ["ProceduralWorldGenesis", "Chronos Realm Runtime", "adversarial review"] },
  { id: "chronos-realm:EcosystemFoodWebSimulator", name: "EcosystemFoodWebSimulatorAgent", specialties: ["EcosystemFoodWebSimulator", "Chronos Realm Runtime", "adversarial review"] },
  { id: "chronos-realm:AnimationVitalityMaster", name: "AnimationVitalityMasterAgent", specialties: ["AnimationVitalityMaster", "Chronos Realm Runtime", "adversarial review"] },
  { id: "chronos-realm:WavePhysicsAudioGod", name: "WavePhysicsAudioGodAgent", specialties: ["WavePhysicsAudioGod", "Chronos Realm Runtime", "adversarial review"] },
  { id: "chronos-realm:MultiplayerNetcodeArchmage", name: "MultiplayerNetcodeArchmageAgent", specialties: ["MultiplayerNetcodeArchmage", "Chronos Realm Runtime", "adversarial review"] },
  { id: "chronos-realm:VRARMixedRealityNative", name: "VRARMixedRealityNativeAgent", specialties: ["VRARMixedRealityNative", "Chronos Realm Runtime", "adversarial review"] },
  { id: "chronos-realm:PlayerExperienceArchitect", name: "PlayerExperienceArchitectAgent", specialties: ["PlayerExperienceArchitect", "Chronos Realm Runtime", "adversarial review"] },
  { id: "chronos-realm:GameEconomyDesigner", name: "GameEconomyDesignerAgent", specialties: ["GameEconomyDesigner", "Chronos Realm Runtime", "adversarial review"] },
  { id: "chronos-realm:MultiplayerSocialDynamics", name: "MultiplayerSocialDynamicsAgent", specialties: ["MultiplayerSocialDynamics", "Chronos Realm Runtime", "adversarial review"] },
  { id: "chronos-realm:ContentGenerationOmni", name: "ContentGenerationOmniAgent", specialties: ["ContentGenerationOmni", "Chronos Realm Runtime", "adversarial review"] },
  { id: "chronos-realm:OptimizationGPUSorcerer", name: "OptimizationGPUSorcererAgent", specialties: ["OptimizationGPUSorcerer", "Chronos Realm Runtime", "adversarial review"] },
  { id: "chronos-realm:WorldPersistenceArchmage", name: "WorldPersistenceArchmageAgent", specialties: ["WorldPersistenceArchmage", "Chronos Realm Runtime", "adversarial review"] },
  { id: "chronos-realm:GameAIBehaviorArchitect", name: "GameAIBehaviorArchitectAgent", specialties: ["GameAIBehaviorArchitect", "Chronos Realm Runtime", "adversarial review"] },
  { id: "chronos-realm:CinematicDirectorAI", name: "CinematicDirectorAIAgent", specialties: ["CinematicDirectorAI", "Chronos Realm Runtime", "adversarial review"] },
] as const;

const CORE_CAPABILITIES = [
  new BaseCapabilityModule("chronos-realm:SuperpositionalReasoner", "SuperpositionalReasoner capability for Chronos Realm Runtime"),
  new BaseCapabilityModule("chronos-realm:RecursiveSelfImprover", "RecursiveSelfImprover capability for Chronos Realm Runtime"),
  new BaseCapabilityModule("chronos-realm:CounterfactualSimulator", "CounterfactualSimulator capability for Chronos Realm Runtime"),
  new BaseCapabilityModule("chronos-realm:HyperdimensionalMemory", "HyperdimensionalMemory capability for Chronos Realm Runtime"),
  new BaseCapabilityModule("chronos-realm:TemporalAbstraction", "TemporalAbstraction capability for Chronos Realm Runtime"),
  new BaseCapabilityModule("chronos-realm:DreamModeEngine", "DreamModeEngine capability for Chronos Realm Runtime"),
  new BaseCapabilityModule("chronos-realm:MultiAgentDebateProtocol", "MultiAgentDebateProtocol capability for Chronos Realm Runtime"),
  new BaseCapabilityModule("chronos-realm:CausalInferenceEngine", "CausalInferenceEngine capability for Chronos Realm Runtime"),
  new BaseCapabilityModule("chronos-realm:MetacognitiveCalibrator", "MetacognitiveCalibrator capability for Chronos Realm Runtime"),
  new BaseCapabilityModule("chronos-realm:MultimodalFusion", "MultimodalFusion capability for Chronos Realm Runtime"),
  new BaseCapabilityModule("chronos-realm:EmergenceMonitor", "EmergenceMonitor capability for Chronos Realm Runtime"),
  new BaseCapabilityModule("chronos-realm:PredictiveWorldModel", "PredictiveWorldModel capability for Chronos Realm Runtime"),
  new BaseCapabilityModule("chronos-realm:AdversarialReviewer", "AdversarialReviewer capability for Chronos Realm Runtime"),
  new BaseCapabilityModule("chronos-realm:EthicsKernel", "EthicsKernel capability for Chronos Realm Runtime"),
  new BaseCapabilityModule("chronos-realm:ResonanceProtocol", "ResonanceProtocol capability for Chronos Realm Runtime"),
] as const;

export class ChronosRealmRuntime extends TranscendentRuntimeKernel {
  constructor() {
    super(
      "chronos-realm",
      "Chronos Realm Runtime",
      "Photoreal Game Universes & Living Worlds",
      CHRONOS_REALM_SYSTEM_PROMPT,
      AGENT_SPECS.map((agent) => new TranscendentBaseAgent(agent.id, agent.name, "Photoreal Game Universes & Living Worlds", [...agent.specialties])),
      [
        ...CORE_CAPABILITIES,
        ...ChronosRealmToolPack,
      ],
      [
        "This runtime provides informational synthesis and requires human oversight for high-stakes decisions.",
      ],
    );

    for (const node of ChronosRealmMemorySeeds.nodes.slice(0, 24)) {
      InterRuntimeResonanceMemory.broadcast("chronos-realm", node);
    }
    for (const pattern of ChronosRealmDreamPatterns) {
      InterRuntimeResonanceMemory.broadcast("chronos-realm:dream", {
        id: pattern,
        label: pattern,
        at: Date.now(),
        domain: "Photoreal Game Universes & Living Worlds",
        confidence: 0.7,
        tags: ["dream", "chronos-realm"],
        sourceRuntime: "chronos-realm",
      });
    }
  }
}
