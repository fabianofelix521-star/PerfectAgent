import { BaseCapabilityModule } from "@/runtimes/transcendent/BaseCapabilityModule";
import { TranscendentBaseAgent } from "@/runtimes/transcendent/TranscendentBaseAgent";
import { TranscendentRuntimeKernel } from "@/runtimes/transcendent/TranscendentRuntimeKernel";
import { HEPHAESTUS_PRIME_SYSTEM_PROMPT } from "@/runtimes/hephaestus-prime/prompts/systemPrompt";
import { HephaestusPrimeToolPack } from "@/runtimes/hephaestus-prime/tools/HephaestusPrimeToolPack";
import { HephaestusPrimeMemorySeeds } from "@/runtimes/hephaestus-prime/memory/HephaestusPrimeMemorySeeds";
import { HephaestusPrimeDreamPatterns } from "@/runtimes/hephaestus-prime/memory/HephaestusPrimeDreamPatterns";
import { InterRuntimeResonanceMemory } from "@/runtimes/transcendent/HyperdimensionalMemoryGraph";

const AGENT_SPECS = [
  { id: "hephaestus-prime:FullStackOmniscient", name: "FullStackOmniscientAgent", specialties: ["FullStackOmniscient", "Hephaestus Prime Runtime", "adversarial review"] },
  { id: "hephaestus-prime:SystemDesignArchmage", name: "SystemDesignArchmageAgent", specialties: ["SystemDesignArchmage", "Hephaestus Prime Runtime", "adversarial review"] },
  { id: "hephaestus-prime:DatabaseEngineeringWizard", name: "DatabaseEngineeringWizardAgent", specialties: ["DatabaseEngineeringWizard", "Hephaestus Prime Runtime", "adversarial review"] },
  { id: "hephaestus-prime:CloudInfrastructureArchitect", name: "CloudInfrastructureArchitectAgent", specialties: ["CloudInfrastructureArchitect", "Hephaestus Prime Runtime", "adversarial review"] },
  { id: "hephaestus-prime:DevOpsAutomationDeity", name: "DevOpsAutomationDeityAgent", specialties: ["DevOpsAutomationDeity", "Hephaestus Prime Runtime", "adversarial review"] },
  { id: "hephaestus-prime:KubernetesGrandmaster", name: "KubernetesGrandmasterAgent", specialties: ["KubernetesGrandmaster", "Hephaestus Prime Runtime", "adversarial review"] },
  { id: "hephaestus-prime:CodeGenerationFactory", name: "CodeGenerationFactoryAgent", specialties: ["CodeGenerationFactory", "Hephaestus Prime Runtime", "adversarial review"] },
  { id: "hephaestus-prime:RefactoringSurgeon", name: "RefactoringSurgeonAgent", specialties: ["RefactoringSurgeon", "Hephaestus Prime Runtime", "adversarial review"] },
  { id: "hephaestus-prime:DebuggingClairvoyant", name: "DebuggingClairvoyantAgent", specialties: ["DebuggingClairvoyant", "Hephaestus Prime Runtime", "adversarial review"] },
  { id: "hephaestus-prime:PerformanceOptimizationGod", name: "PerformanceOptimizationGodAgent", specialties: ["PerformanceOptimizationGod", "Hephaestus Prime Runtime", "adversarial review"] },
  { id: "hephaestus-prime:SecurityHardeningArchmage", name: "SecurityHardeningArchmageAgent", specialties: ["SecurityHardeningArchmage", "Hephaestus Prime Runtime", "adversarial review"] },
  { id: "hephaestus-prime:TestEngineeringMaster", name: "TestEngineeringMasterAgent", specialties: ["TestEngineeringMaster", "Hephaestus Prime Runtime", "adversarial review"] },
  { id: "hephaestus-prime:APIDesignVirtuoso", name: "APIDesignVirtuosoAgent", specialties: ["APIDesignVirtuoso", "Hephaestus Prime Runtime", "adversarial review"] },
  { id: "hephaestus-prime:FrontendArchitectArchmage", name: "FrontendArchitectArchmageAgent", specialties: ["FrontendArchitectArchmage", "Hephaestus Prime Runtime", "adversarial review"] },
  { id: "hephaestus-prime:MobileEngineeringMaster", name: "MobileEngineeringMasterAgent", specialties: ["MobileEngineeringMaster", "Hephaestus Prime Runtime", "adversarial review"] },
  { id: "hephaestus-prime:GameEngineEngineer", name: "GameEngineEngineerAgent", specialties: ["GameEngineEngineer", "Hephaestus Prime Runtime", "adversarial review"] },
  { id: "hephaestus-prime:EmbeddedSystemsArchmage", name: "EmbeddedSystemsArchmageAgent", specialties: ["EmbeddedSystemsArchmage", "Hephaestus Prime Runtime", "adversarial review"] },
  { id: "hephaestus-prime:BlockchainSmartContractWizard", name: "BlockchainSmartContractWizardAgent", specialties: ["BlockchainSmartContractWizard", "Hephaestus Prime Runtime", "adversarial review"] },
  { id: "hephaestus-prime:MachineLearningEngineering", name: "MachineLearningEngineeringAgent", specialties: ["MachineLearningEngineering", "Hephaestus Prime Runtime", "adversarial review"] },
  { id: "hephaestus-prime:DataEngineeringMaster", name: "DataEngineeringMasterAgent", specialties: ["DataEngineeringMaster", "Hephaestus Prime Runtime", "adversarial review"] },
  { id: "hephaestus-prime:LegacyModernizationSurgeon", name: "LegacyModernizationSurgeonAgent", specialties: ["LegacyModernizationSurgeon", "Hephaestus Prime Runtime", "adversarial review"] },
  { id: "hephaestus-prime:DocumentationLivingArchitect", name: "DocumentationLivingArchitectAgent", specialties: ["DocumentationLivingArchitect", "Hephaestus Prime Runtime", "adversarial review"] },
  { id: "hephaestus-prime:CodeReviewSentinel", name: "CodeReviewSentinelAgent", specialties: ["CodeReviewSentinel", "Hephaestus Prime Runtime", "adversarial review"] },
  { id: "hephaestus-prime:CompilerLanguageArchmage", name: "CompilerLanguageArchmageAgent", specialties: ["CompilerLanguageArchmage", "Hephaestus Prime Runtime", "adversarial review"] },
  { id: "hephaestus-prime:IntentToProductionTransmuter", name: "IntentToProductionTransmuterAgent", specialties: ["IntentToProductionTransmuter", "Hephaestus Prime Runtime", "adversarial review"] },
] as const;

const CORE_CAPABILITIES = [
  new BaseCapabilityModule("hephaestus-prime:SuperpositionalReasoner", "SuperpositionalReasoner capability for Hephaestus Prime Runtime"),
  new BaseCapabilityModule("hephaestus-prime:RecursiveSelfImprover", "RecursiveSelfImprover capability for Hephaestus Prime Runtime"),
  new BaseCapabilityModule("hephaestus-prime:CounterfactualSimulator", "CounterfactualSimulator capability for Hephaestus Prime Runtime"),
  new BaseCapabilityModule("hephaestus-prime:HyperdimensionalMemory", "HyperdimensionalMemory capability for Hephaestus Prime Runtime"),
  new BaseCapabilityModule("hephaestus-prime:TemporalAbstraction", "TemporalAbstraction capability for Hephaestus Prime Runtime"),
  new BaseCapabilityModule("hephaestus-prime:DreamModeEngine", "DreamModeEngine capability for Hephaestus Prime Runtime"),
  new BaseCapabilityModule("hephaestus-prime:MultiAgentDebateProtocol", "MultiAgentDebateProtocol capability for Hephaestus Prime Runtime"),
  new BaseCapabilityModule("hephaestus-prime:CausalInferenceEngine", "CausalInferenceEngine capability for Hephaestus Prime Runtime"),
  new BaseCapabilityModule("hephaestus-prime:MetacognitiveCalibrator", "MetacognitiveCalibrator capability for Hephaestus Prime Runtime"),
  new BaseCapabilityModule("hephaestus-prime:MultimodalFusion", "MultimodalFusion capability for Hephaestus Prime Runtime"),
  new BaseCapabilityModule("hephaestus-prime:EmergenceMonitor", "EmergenceMonitor capability for Hephaestus Prime Runtime"),
  new BaseCapabilityModule("hephaestus-prime:PredictiveWorldModel", "PredictiveWorldModel capability for Hephaestus Prime Runtime"),
  new BaseCapabilityModule("hephaestus-prime:AdversarialReviewer", "AdversarialReviewer capability for Hephaestus Prime Runtime"),
  new BaseCapabilityModule("hephaestus-prime:EthicsKernel", "EthicsKernel capability for Hephaestus Prime Runtime"),
  new BaseCapabilityModule("hephaestus-prime:ResonanceProtocol", "ResonanceProtocol capability for Hephaestus Prime Runtime"),
] as const;

export class HephaestusPrimeRuntime extends TranscendentRuntimeKernel {
  constructor() {
    super(
      "hephaestus-prime",
      "Hephaestus Prime Runtime",
      "Hyperscale Software Engineering & Code Genesis",
      HEPHAESTUS_PRIME_SYSTEM_PROMPT,
      AGENT_SPECS.map((agent) => new TranscendentBaseAgent(agent.id, agent.name, "Hyperscale Software Engineering & Code Genesis", [...agent.specialties])),
      [
        ...CORE_CAPABILITIES,
        ...HephaestusPrimeToolPack,
      ],
      [
        "This runtime provides informational synthesis and requires human oversight for high-stakes decisions.",
      ],
    );

    for (const node of HephaestusPrimeMemorySeeds.nodes.slice(0, 24)) {
      InterRuntimeResonanceMemory.broadcast("hephaestus-prime", node);
    }
    for (const pattern of HephaestusPrimeDreamPatterns) {
      InterRuntimeResonanceMemory.broadcast("hephaestus-prime:dream", {
        id: pattern,
        label: pattern,
        at: Date.now(),
        domain: "Hyperscale Software Engineering & Code Genesis",
        confidence: 0.7,
        tags: ["dream", "hephaestus-prime"],
        sourceRuntime: "hephaestus-prime",
      });
    }
  }
}
