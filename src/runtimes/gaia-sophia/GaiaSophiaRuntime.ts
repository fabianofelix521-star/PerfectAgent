import { BaseCapabilityModule } from "@/runtimes/transcendent/BaseCapabilityModule";
import { TranscendentBaseAgent } from "@/runtimes/transcendent/TranscendentBaseAgent";
import { TranscendentRuntimeKernel } from "@/runtimes/transcendent/TranscendentRuntimeKernel";
import { GAIA_SOPHIA_SYSTEM_PROMPT } from "@/runtimes/gaia-sophia/prompts/systemPrompt";
import { GaiaSophiaToolPack } from "@/runtimes/gaia-sophia/tools/GaiaSophiaToolPack";
import { GaiaSophiaMemorySeeds } from "@/runtimes/gaia-sophia/memory/GaiaSophiaMemorySeeds";
import { GaiaSophiaDreamPatterns } from "@/runtimes/gaia-sophia/memory/GaiaSophiaDreamPatterns";
import { InterRuntimeResonanceMemory } from "@/runtimes/transcendent/HyperdimensionalMemoryGraph";

const AGENT_SPECS = [
  { id: "gaia-sophia:PhytochemistryArchmage", name: "PhytochemistryArchmageAgent", specialties: ["PhytochemistryArchmage", "Gaia Sophia Runtime", "adversarial review"] },
  { id: "gaia-sophia:MechanismOfActionMolecular", name: "MechanismOfActionMolecularAgent", specialties: ["MechanismOfActionMolecular", "Gaia Sophia Runtime", "adversarial review"] },
  { id: "gaia-sophia:TraditionalChineseMedicineMaster", name: "TraditionalChineseMedicineMasterAgent", specialties: ["TraditionalChineseMedicineMaster", "Gaia Sophia Runtime", "adversarial review"] },
  { id: "gaia-sophia:AyurvedicArchmage", name: "AyurvedicArchmageAgent", specialties: ["AyurvedicArchmage", "Gaia Sophia Runtime", "adversarial review"] },
  { id: "gaia-sophia:AmazonianPlantMedicine", name: "AmazonianPlantMedicineAgent", specialties: ["AmazonianPlantMedicine", "Gaia Sophia Runtime", "adversarial review"] },
  { id: "gaia-sophia:MicrotherapyMushroomMaster", name: "MicrotherapyMushroomMasterAgent", specialties: ["MicrotherapyMushroomMaster", "Gaia Sophia Runtime", "adversarial review"] },
  { id: "gaia-sophia:AromatherapyClinical", name: "AromatherapyClinicalAgent", specialties: ["AromatherapyClinical", "Gaia Sophia Runtime", "adversarial review"] },
  { id: "gaia-sophia:HomeopathyResearch", name: "HomeopathyResearchAgent", specialties: ["HomeopathyResearch", "Gaia Sophia Runtime", "adversarial review"] },
  { id: "gaia-sophia:FloweEssenceTherapy", name: "FloweEssenceTherapyAgent", specialties: ["FloweEssenceTherapy", "Gaia Sophia Runtime", "adversarial review"] },
  { id: "gaia-sophia:OrthomolecularMegadose", name: "OrthomolecularMegadoseAgent", specialties: ["OrthomolecularMegadose", "Gaia Sophia Runtime", "adversarial review"] },
  { id: "gaia-sophia:MineralTherapyArchmage", name: "MineralTherapyArchmageAgent", specialties: ["MineralTherapyArchmage", "Gaia Sophia Runtime", "adversarial review"] },
  { id: "gaia-sophia:HerbalFormulationArchmage", name: "HerbalFormulationArchmageAgent", specialties: ["HerbalFormulationArchmage", "Gaia Sophia Runtime", "adversarial review"] },
  { id: "gaia-sophia:SpagyricAlchemyMaster", name: "SpagyricAlchemyMasterAgent", specialties: ["SpagyricAlchemyMaster", "Gaia Sophia Runtime", "adversarial review"] },
  { id: "gaia-sophia:ApitherapyMaster", name: "ApitherapyMasterAgent", specialties: ["ApitherapyMaster", "Gaia Sophia Runtime", "adversarial review"] },
  { id: "gaia-sophia:HydrotherapyTraditional", name: "HydrotherapyTraditionalAgent", specialties: ["HydrotherapyTraditional", "Gaia Sophia Runtime", "adversarial review"] },
  { id: "gaia-sophia:TraditionalIndigenousMedicine", name: "TraditionalIndigenousMedicineAgent", specialties: ["TraditionalIndigenousMedicine", "Gaia Sophia Runtime", "adversarial review"] },
  { id: "gaia-sophia:HildegardMonasticMedicine", name: "HildegardMonasticMedicineAgent", specialties: ["HildegardMonasticMedicine", "Gaia Sophia Runtime", "adversarial review"] },
  { id: "gaia-sophia:TibetanMedicineSecrets", name: "TibetanMedicineSecretsAgent", specialties: ["TibetanMedicineSecrets", "Gaia Sophia Runtime", "adversarial review"] },
  { id: "gaia-sophia:FunctionalMedicineIntegration", name: "FunctionalMedicineIntegrationAgent", specialties: ["FunctionalMedicineIntegration", "Gaia Sophia Runtime", "adversarial review"] },
  { id: "gaia-sophia:HerbalMedicineSafetyAdvanced", name: "HerbalMedicineSafetyAdvancedAgent", specialties: ["HerbalMedicineSafetyAdvanced", "Gaia Sophia Runtime", "adversarial review"] },
  { id: "gaia-sophia:EnergyHealingFramework", name: "EnergyHealingFrameworkAgent", specialties: ["EnergyHealingFramework", "Gaia Sophia Runtime", "adversarial review"] },
  { id: "gaia-sophia:TraditionalDietaryTherapy", name: "TraditionalDietaryTherapyAgent", specialties: ["TraditionalDietaryTherapy", "Gaia Sophia Runtime", "adversarial review"] },
  { id: "gaia-sophia:HerbalismFieldcraft", name: "HerbalismFieldcraftAgent", specialties: ["HerbalismFieldcraft", "Gaia Sophia Runtime", "adversarial review"] },
  { id: "gaia-sophia:NaturalMedicineResearchSynthesizer", name: "NaturalMedicineResearchSynthesizerAgent", specialties: ["NaturalMedicineResearchSynthesizer", "Gaia Sophia Runtime", "adversarial review"] },
  { id: "gaia-sophia:IntegrativeProtocolDesigner", name: "IntegrativeProtocolDesignerAgent", specialties: ["IntegrativeProtocolDesigner", "Gaia Sophia Runtime", "adversarial review"] },
] as const;

const CORE_CAPABILITIES = [
  new BaseCapabilityModule("gaia-sophia:SuperpositionalReasoner", "SuperpositionalReasoner capability for Gaia Sophia Runtime"),
  new BaseCapabilityModule("gaia-sophia:RecursiveSelfImprover", "RecursiveSelfImprover capability for Gaia Sophia Runtime"),
  new BaseCapabilityModule("gaia-sophia:CounterfactualSimulator", "CounterfactualSimulator capability for Gaia Sophia Runtime"),
  new BaseCapabilityModule("gaia-sophia:HyperdimensionalMemory", "HyperdimensionalMemory capability for Gaia Sophia Runtime"),
  new BaseCapabilityModule("gaia-sophia:TemporalAbstraction", "TemporalAbstraction capability for Gaia Sophia Runtime"),
  new BaseCapabilityModule("gaia-sophia:DreamModeEngine", "DreamModeEngine capability for Gaia Sophia Runtime"),
  new BaseCapabilityModule("gaia-sophia:MultiAgentDebateProtocol", "MultiAgentDebateProtocol capability for Gaia Sophia Runtime"),
  new BaseCapabilityModule("gaia-sophia:CausalInferenceEngine", "CausalInferenceEngine capability for Gaia Sophia Runtime"),
  new BaseCapabilityModule("gaia-sophia:MetacognitiveCalibrator", "MetacognitiveCalibrator capability for Gaia Sophia Runtime"),
  new BaseCapabilityModule("gaia-sophia:MultimodalFusion", "MultimodalFusion capability for Gaia Sophia Runtime"),
  new BaseCapabilityModule("gaia-sophia:EmergenceMonitor", "EmergenceMonitor capability for Gaia Sophia Runtime"),
  new BaseCapabilityModule("gaia-sophia:PredictiveWorldModel", "PredictiveWorldModel capability for Gaia Sophia Runtime"),
  new BaseCapabilityModule("gaia-sophia:AdversarialReviewer", "AdversarialReviewer capability for Gaia Sophia Runtime"),
  new BaseCapabilityModule("gaia-sophia:EthicsKernel", "EthicsKernel capability for Gaia Sophia Runtime"),
  new BaseCapabilityModule("gaia-sophia:ResonanceProtocol", "ResonanceProtocol capability for Gaia Sophia Runtime"),
] as const;

export class GaiaSophiaRuntime extends TranscendentRuntimeKernel {
  constructor() {
    super(
      "gaia-sophia",
      "Gaia Sophia Runtime",
      "Natural Medicine, Phytotherapy & Botanical Pharmacology",
      GAIA_SOPHIA_SYSTEM_PROMPT,
      AGENT_SPECS.map((agent) => new TranscendentBaseAgent(agent.id, agent.name, "Natural Medicine, Phytotherapy & Botanical Pharmacology", [...agent.specialties])),
      [
        ...CORE_CAPABILITIES,
        ...GaiaSophiaToolPack,
      ],
      [
        "This runtime provides informational synthesis and requires human oversight for high-stakes decisions.",
      ],
    );

    for (const node of GaiaSophiaMemorySeeds.nodes.slice(0, 24)) {
      InterRuntimeResonanceMemory.broadcast("gaia-sophia", node);
    }
    for (const pattern of GaiaSophiaDreamPatterns) {
      InterRuntimeResonanceMemory.broadcast("gaia-sophia:dream", {
        id: pattern,
        label: pattern,
        at: Date.now(),
        domain: "Natural Medicine, Phytotherapy & Botanical Pharmacology",
        confidence: 0.7,
        tags: ["dream", "gaia-sophia"],
        sourceRuntime: "gaia-sophia",
      });
    }
  }
}
