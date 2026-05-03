import { BaseCapabilityModule } from "@/runtimes/transcendent/BaseCapabilityModule";
import { TranscendentBaseAgent } from "@/runtimes/transcendent/TranscendentBaseAgent";
import { TranscendentRuntimeKernel } from "@/runtimes/transcendent/TranscendentRuntimeKernel";
import { PROMETHEAN_FORGE_SYSTEM_PROMPT } from "@/runtimes/promethean-forge/prompts/systemPrompt";
import { PrometheanForgeToolPack } from "@/runtimes/promethean-forge/tools/PrometheanForgeToolPack";
import { PrometheanForgeMemorySeeds } from "@/runtimes/promethean-forge/memory/PrometheanForgeMemorySeeds";
import { PrometheanForgeDreamPatterns } from "@/runtimes/promethean-forge/memory/PrometheanForgeDreamPatterns";
import { InterRuntimeResonanceMemory } from "@/runtimes/transcendent/HyperdimensionalMemoryGraph";

const AGENT_SPECS = [
  { id: "promethean-forge:TransformerArchitectureSavant", name: "TransformerArchitectureSavantAgent", specialties: ["TransformerArchitectureSavant", "Promethean Forge Runtime", "adversarial review"] },
  { id: "promethean-forge:TrainingInfrastructureGod", name: "TrainingInfrastructureGodAgent", specialties: ["TrainingInfrastructureGod", "Promethean Forge Runtime", "adversarial review"] },
  { id: "promethean-forge:RLHFConstitutionalAI", name: "RLHFConstitutionalAIAgent", specialties: ["RLHFConstitutionalAI", "Promethean Forge Runtime", "adversarial review"] },
  { id: "promethean-forge:DataCurationArchmage", name: "DataCurationArchmageAgent", specialties: ["DataCurationArchmage", "Promethean Forge Runtime", "adversarial review"] },
  { id: "promethean-forge:TokenizationVocabularyArchitect", name: "TokenizationVocabularyArchitectAgent", specialties: ["TokenizationVocabularyArchitect", "Promethean Forge Runtime", "adversarial review"] },
  { id: "promethean-forge:PretrainingScalingLaws", name: "PretrainingScalingLawsAgent", specialties: ["PretrainingScalingLaws", "Promethean Forge Runtime", "adversarial review"] },
  { id: "promethean-forge:FineTuningSpecialist", name: "FineTuningSpecialistAgent", specialties: ["FineTuningSpecialist", "Promethean Forge Runtime", "adversarial review"] },
  { id: "promethean-forge:MultimodalFusionMaster", name: "MultimodalFusionMasterAgent", specialties: ["MultimodalFusionMaster", "Promethean Forge Runtime", "adversarial review"] },
  { id: "promethean-forge:LongContextEngineer", name: "LongContextEngineerAgent", specialties: ["LongContextEngineer", "Promethean Forge Runtime", "adversarial review"] },
  { id: "promethean-forge:InferenceOptimizationGod", name: "InferenceOptimizationGodAgent", specialties: ["InferenceOptimizationGod", "Promethean Forge Runtime", "adversarial review"] },
  { id: "promethean-forge:MechanisticInterpretability", name: "MechanisticInterpretabilityAgent", specialties: ["MechanisticInterpretability", "Promethean Forge Runtime", "adversarial review"] },
  { id: "promethean-forge:CapabilityEvaluation", name: "CapabilityEvaluationAgent", specialties: ["CapabilityEvaluation", "Promethean Forge Runtime", "adversarial review"] },
  { id: "promethean-forge:AgentArchitectureResearcher", name: "AgentArchitectureResearcherAgent", specialties: ["AgentArchitectureResearcher", "Promethean Forge Runtime", "adversarial review"] },
  { id: "promethean-forge:DiffusionGenerativeArchitect", name: "DiffusionGenerativeArchitectAgent", specialties: ["DiffusionGenerativeArchitect", "Promethean Forge Runtime", "adversarial review"] },
  { id: "promethean-forge:ReinforcementLearningResearcher", name: "ReinforcementLearningResearcherAgent", specialties: ["ReinforcementLearningResearcher", "Promethean Forge Runtime", "adversarial review"] },
  { id: "promethean-forge:AIAlignmentResearcher", name: "AIAlignmentResearcherAgent", specialties: ["AIAlignmentResearcher", "Promethean Forge Runtime", "adversarial review"] },
  { id: "promethean-forge:NeuroScienceInspiredAI", name: "NeuroScienceInspiredAIAgent", specialties: ["NeuroScienceInspiredAI", "Promethean Forge Runtime", "adversarial review"] },
  { id: "promethean-forge:FederatedLearning", name: "FederatedLearningAgent", specialties: ["FederatedLearning", "Promethean Forge Runtime", "adversarial review"] },
  { id: "promethean-forge:GraphNeuralNetworkArchitect", name: "GraphNeuralNetworkArchitectAgent", specialties: ["GraphNeuralNetworkArchitect", "Promethean Forge Runtime", "adversarial review"] },
  { id: "promethean-forge:TimeSeriesForecasting", name: "TimeSeriesForecastingAgent", specialties: ["TimeSeriesForecasting", "Promethean Forge Runtime", "adversarial review"] },
  { id: "promethean-forge:AIResearchPaperAnalyst", name: "AIResearchPaperAnalystAgent", specialties: ["AIResearchPaperAnalyst", "Promethean Forge Runtime", "adversarial review"] },
  { id: "promethean-forge:ASIPathwayResearcher", name: "ASIPathwayResearcherAgent", specialties: ["ASIPathwayResearcher", "Promethean Forge Runtime", "adversarial review"] },
] as const;

const CORE_CAPABILITIES = [
  new BaseCapabilityModule("promethean-forge:SuperpositionalReasoner", "SuperpositionalReasoner capability for Promethean Forge Runtime"),
  new BaseCapabilityModule("promethean-forge:RecursiveSelfImprover", "RecursiveSelfImprover capability for Promethean Forge Runtime"),
  new BaseCapabilityModule("promethean-forge:CounterfactualSimulator", "CounterfactualSimulator capability for Promethean Forge Runtime"),
  new BaseCapabilityModule("promethean-forge:HyperdimensionalMemory", "HyperdimensionalMemory capability for Promethean Forge Runtime"),
  new BaseCapabilityModule("promethean-forge:TemporalAbstraction", "TemporalAbstraction capability for Promethean Forge Runtime"),
  new BaseCapabilityModule("promethean-forge:DreamModeEngine", "DreamModeEngine capability for Promethean Forge Runtime"),
  new BaseCapabilityModule("promethean-forge:MultiAgentDebateProtocol", "MultiAgentDebateProtocol capability for Promethean Forge Runtime"),
  new BaseCapabilityModule("promethean-forge:CausalInferenceEngine", "CausalInferenceEngine capability for Promethean Forge Runtime"),
  new BaseCapabilityModule("promethean-forge:MetacognitiveCalibrator", "MetacognitiveCalibrator capability for Promethean Forge Runtime"),
  new BaseCapabilityModule("promethean-forge:MultimodalFusion", "MultimodalFusion capability for Promethean Forge Runtime"),
  new BaseCapabilityModule("promethean-forge:EmergenceMonitor", "EmergenceMonitor capability for Promethean Forge Runtime"),
  new BaseCapabilityModule("promethean-forge:PredictiveWorldModel", "PredictiveWorldModel capability for Promethean Forge Runtime"),
  new BaseCapabilityModule("promethean-forge:AdversarialReviewer", "AdversarialReviewer capability for Promethean Forge Runtime"),
  new BaseCapabilityModule("promethean-forge:EthicsKernel", "EthicsKernel capability for Promethean Forge Runtime"),
  new BaseCapabilityModule("promethean-forge:ResonanceProtocol", "ResonanceProtocol capability for Promethean Forge Runtime"),
] as const;

export class PrometheanForgeRuntime extends TranscendentRuntimeKernel {
  constructor() {
    super(
      "promethean-forge",
      "Promethean Forge Runtime",
      "AI ML Research, Model Genesis & Architecture Engineering",
      PROMETHEAN_FORGE_SYSTEM_PROMPT,
      AGENT_SPECS.map((agent) => new TranscendentBaseAgent(agent.id, agent.name, "AI ML Research, Model Genesis & Architecture Engineering", [...agent.specialties])),
      [
        ...CORE_CAPABILITIES,
        ...PrometheanForgeToolPack,
      ],
      [
        "This runtime provides informational synthesis and requires human oversight for high-stakes decisions.",
      ],
    );

    for (const node of PrometheanForgeMemorySeeds.nodes.slice(0, 24)) {
      InterRuntimeResonanceMemory.broadcast("promethean-forge", node);
    }
    for (const pattern of PrometheanForgeDreamPatterns) {
      InterRuntimeResonanceMemory.broadcast("promethean-forge:dream", {
        id: pattern,
        label: pattern,
        at: Date.now(),
        domain: "AI ML Research, Model Genesis & Architecture Engineering",
        confidence: 0.7,
        tags: ["dream", "promethean-forge"],
        sourceRuntime: "promethean-forge",
      });
    }
  }
}
