import { BaseCapabilityModule } from "@/runtimes/transcendent/BaseCapabilityModule";
import { TranscendentBaseAgent } from "@/runtimes/transcendent/TranscendentBaseAgent";
import { TranscendentRuntimeKernel } from "@/runtimes/transcendent/TranscendentRuntimeKernel";
import { MUSEION_TRANSCENDENT_SYSTEM_PROMPT } from "@/runtimes/museion-transcendent/prompts/systemPrompt";
import { MuseionTranscendentToolPack } from "@/runtimes/museion-transcendent/tools/MuseionTranscendentToolPack";
import { MuseionTranscendentMemorySeeds } from "@/runtimes/museion-transcendent/memory/MuseionTranscendentMemorySeeds";
import { MuseionTranscendentDreamPatterns } from "@/runtimes/museion-transcendent/memory/MuseionTranscendentDreamPatterns";
import { InterRuntimeResonanceMemory } from "@/runtimes/transcendent/HyperdimensionalMemoryGraph";

const AGENT_SPECS = [
  { id: "museion-transcendent:MusicCompositionArchmage", name: "MusicCompositionArchmageAgent", specialties: ["MusicCompositionArchmage", "Museion Transcendent Runtime", "adversarial review"] },
  { id: "museion-transcendent:OrchestralComposition", name: "OrchestralCompositionAgent", specialties: ["OrchestralComposition", "Museion Transcendent Runtime", "adversarial review"] },
  { id: "museion-transcendent:ElectronicMusicProducer", name: "ElectronicMusicProducerAgent", specialties: ["ElectronicMusicProducer", "Museion Transcendent Runtime", "adversarial review"] },
  { id: "museion-transcendent:JazzImprovisation", name: "JazzImprovisationAgent", specialties: ["JazzImprovisation", "Museion Transcendent Runtime", "adversarial review"] },
  { id: "museion-transcendent:WorldMusicMaster", name: "WorldMusicMasterAgent", specialties: ["WorldMusicMaster", "Museion Transcendent Runtime", "adversarial review"] },
  { id: "museion-transcendent:VisualArtPainterArchmage", name: "VisualArtPainterArchmageAgent", specialties: ["VisualArtPainterArchmage", "Museion Transcendent Runtime", "adversarial review"] },
  { id: "museion-transcendent:IllustrationDesign", name: "IllustrationDesignAgent", specialties: ["IllustrationDesign", "Museion Transcendent Runtime", "adversarial review"] },
  { id: "museion-transcendent:GraphicDesignArchmage", name: "GraphicDesignArchmageAgent", specialties: ["GraphicDesignArchmage", "Museion Transcendent Runtime", "adversarial review"] },
  { id: "museion-transcendent:CinematographyDirector", name: "CinematographyDirectorAgent", specialties: ["CinematographyDirector", "Museion Transcendent Runtime", "adversarial review"] },
  { id: "museion-transcendent:ScreenwritingArchmage", name: "ScreenwritingArchmageAgent", specialties: ["ScreenwritingArchmage", "Museion Transcendent Runtime", "adversarial review"] },
  { id: "museion-transcendent:LiteraryFiction", name: "LiteraryFictionAgent", specialties: ["LiteraryFiction", "Museion Transcendent Runtime", "adversarial review"] },
  { id: "museion-transcendent:PoetryArchmage", name: "PoetryArchmageAgent", specialties: ["PoetryArchmage", "Museion Transcendent Runtime", "adversarial review"] },
  { id: "museion-transcendent:EssayistThinker", name: "EssayistThinkerAgent", specialties: ["EssayistThinker", "Museion Transcendent Runtime", "adversarial review"] },
  { id: "museion-transcendent:PlaywrightTheater", name: "PlaywrightTheaterAgent", specialties: ["PlaywrightTheater", "Museion Transcendent Runtime", "adversarial review"] },
  { id: "museion-transcendent:ChoreographyDance", name: "ChoreographyDanceAgent", specialties: ["ChoreographyDance", "Museion Transcendent Runtime", "adversarial review"] },
  { id: "museion-transcendent:ArchitectureDesign", name: "ArchitectureDesignAgent", specialties: ["ArchitectureDesign", "Museion Transcendent Runtime", "adversarial review"] },
  { id: "museion-transcendent:GameNarrative", name: "GameNarrativeAgent", specialties: ["GameNarrative", "Museion Transcendent Runtime", "adversarial review"] },
  { id: "museion-transcendent:PerformanceArt", name: "PerformanceArtAgent", specialties: ["PerformanceArt", "Museion Transcendent Runtime", "adversarial review"] },
  { id: "museion-transcendent:TransmediaStorytelling", name: "TransmediaStorytellingAgent", specialties: ["TransmediaStorytelling", "Museion Transcendent Runtime", "adversarial review"] },
  { id: "museion-transcendent:ArtCriticismScholar", name: "ArtCriticismScholarAgent", specialties: ["ArtCriticismScholar", "Museion Transcendent Runtime", "adversarial review"] },
  { id: "museion-transcendent:CreativeProcessFacilitator", name: "CreativeProcessFacilitatorAgent", specialties: ["CreativeProcessFacilitator", "Museion Transcendent Runtime", "adversarial review"] },
  { id: "museion-transcendent:GenAIArtFusion", name: "GenAIArtFusionAgent", specialties: ["GenAIArtFusion", "Museion Transcendent Runtime", "adversarial review"] },
] as const;

const CORE_CAPABILITIES = [
  new BaseCapabilityModule("museion-transcendent:SuperpositionalReasoner", "SuperpositionalReasoner capability for Museion Transcendent Runtime"),
  new BaseCapabilityModule("museion-transcendent:RecursiveSelfImprover", "RecursiveSelfImprover capability for Museion Transcendent Runtime"),
  new BaseCapabilityModule("museion-transcendent:CounterfactualSimulator", "CounterfactualSimulator capability for Museion Transcendent Runtime"),
  new BaseCapabilityModule("museion-transcendent:HyperdimensionalMemory", "HyperdimensionalMemory capability for Museion Transcendent Runtime"),
  new BaseCapabilityModule("museion-transcendent:TemporalAbstraction", "TemporalAbstraction capability for Museion Transcendent Runtime"),
  new BaseCapabilityModule("museion-transcendent:DreamModeEngine", "DreamModeEngine capability for Museion Transcendent Runtime"),
  new BaseCapabilityModule("museion-transcendent:MultiAgentDebateProtocol", "MultiAgentDebateProtocol capability for Museion Transcendent Runtime"),
  new BaseCapabilityModule("museion-transcendent:CausalInferenceEngine", "CausalInferenceEngine capability for Museion Transcendent Runtime"),
  new BaseCapabilityModule("museion-transcendent:MetacognitiveCalibrator", "MetacognitiveCalibrator capability for Museion Transcendent Runtime"),
  new BaseCapabilityModule("museion-transcendent:MultimodalFusion", "MultimodalFusion capability for Museion Transcendent Runtime"),
  new BaseCapabilityModule("museion-transcendent:EmergenceMonitor", "EmergenceMonitor capability for Museion Transcendent Runtime"),
  new BaseCapabilityModule("museion-transcendent:PredictiveWorldModel", "PredictiveWorldModel capability for Museion Transcendent Runtime"),
  new BaseCapabilityModule("museion-transcendent:AdversarialReviewer", "AdversarialReviewer capability for Museion Transcendent Runtime"),
  new BaseCapabilityModule("museion-transcendent:EthicsKernel", "EthicsKernel capability for Museion Transcendent Runtime"),
  new BaseCapabilityModule("museion-transcendent:ResonanceProtocol", "ResonanceProtocol capability for Museion Transcendent Runtime"),
] as const;

export class MuseionTranscendentRuntime extends TranscendentRuntimeKernel {
  constructor() {
    super(
      "museion-transcendent",
      "Museion Transcendent Runtime",
      "Creative Arts Across Music Visual Cinema and Literature",
      MUSEION_TRANSCENDENT_SYSTEM_PROMPT,
      AGENT_SPECS.map((agent) => new TranscendentBaseAgent(agent.id, agent.name, "Creative Arts Across Music Visual Cinema and Literature", [...agent.specialties])),
      [
        ...CORE_CAPABILITIES,
        ...MuseionTranscendentToolPack,
      ],
      [
        "This runtime provides informational synthesis and requires human oversight for high-stakes decisions.",
      ],
    );

    for (const node of MuseionTranscendentMemorySeeds.nodes.slice(0, 24)) {
      InterRuntimeResonanceMemory.broadcast("museion-transcendent", node);
    }
    for (const pattern of MuseionTranscendentDreamPatterns) {
      InterRuntimeResonanceMemory.broadcast("museion-transcendent:dream", {
        id: pattern,
        label: pattern,
        at: Date.now(),
        domain: "Creative Arts Across Music Visual Cinema and Literature",
        confidence: 0.7,
        tags: ["dream", "museion-transcendent"],
        sourceRuntime: "museion-transcendent",
      });
    }
  }
}
