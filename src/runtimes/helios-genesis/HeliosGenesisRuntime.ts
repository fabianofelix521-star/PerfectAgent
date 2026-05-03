import { BaseCapabilityModule } from "@/runtimes/transcendent/BaseCapabilityModule";
import { TranscendentBaseAgent } from "@/runtimes/transcendent/TranscendentBaseAgent";
import { TranscendentRuntimeKernel } from "@/runtimes/transcendent/TranscendentRuntimeKernel";
import { HELIOS_GENESIS_SYSTEM_PROMPT } from "@/runtimes/helios-genesis/prompts/systemPrompt";
import { HeliosGenesisToolPack } from "@/runtimes/helios-genesis/tools/HeliosGenesisToolPack";
import { HeliosGenesisMemorySeeds } from "@/runtimes/helios-genesis/memory/HeliosGenesisMemorySeeds";
import { HeliosGenesisDreamPatterns } from "@/runtimes/helios-genesis/memory/HeliosGenesisDreamPatterns";
import { InterRuntimeResonanceMemory } from "@/runtimes/transcendent/HyperdimensionalMemoryGraph";

const AGENT_SPECS = [
  { id: "helios-genesis:CRISPRDesignArchmage", name: "CRISPRDesignArchmageAgent", specialties: ["CRISPRDesignArchmage", "Helios Genesis Runtime", "adversarial review"] },
  { id: "helios-genesis:ProteinEngineeringSavant", name: "ProteinEngineeringSavantAgent", specialties: ["ProteinEngineeringSavant", "Helios Genesis Runtime", "adversarial review"] },
  { id: "helios-genesis:SyntheticBiologyDesigner", name: "SyntheticBiologyDesignerAgent", specialties: ["SyntheticBiologyDesigner", "Helios Genesis Runtime", "adversarial review"] },
  { id: "helios-genesis:mRNATherapeutics", name: "mRNATherapeuticsAgent", specialties: ["mRNATherapeutics", "Helios Genesis Runtime", "adversarial review"] },
  { id: "helios-genesis:GeneTherapyVectorEngineer", name: "GeneTherapyVectorEngineerAgent", specialties: ["GeneTherapyVectorEngineer", "Helios Genesis Runtime", "adversarial review"] },
  { id: "helios-genesis:CellTherapyArchmage", name: "CellTherapyArchmageAgent", specialties: ["CellTherapyArchmage", "Helios Genesis Runtime", "adversarial review"] },
  { id: "helios-genesis:BioinformaticsMaster", name: "BioinformaticsMasterAgent", specialties: ["BioinformaticsMaster", "Helios Genesis Runtime", "adversarial review"] },
  { id: "helios-genesis:DrugDiscoveryComputational", name: "DrugDiscoveryComputationalAgent", specialties: ["DrugDiscoveryComputational", "Helios Genesis Runtime", "adversarial review"] },
  { id: "helios-genesis:StructuralBiology", name: "StructuralBiologyAgent", specialties: ["StructuralBiology", "Helios Genesis Runtime", "adversarial review"] },
  { id: "helios-genesis:ImmunologyEngineering", name: "ImmunologyEngineeringAgent", specialties: ["ImmunologyEngineering", "Helios Genesis Runtime", "adversarial review"] },
  { id: "helios-genesis:StemCellRegeneration", name: "StemCellRegenerationAgent", specialties: ["StemCellRegeneration", "Helios Genesis Runtime", "adversarial review"] },
  { id: "helios-genesis:MicrobiomeEngineering", name: "MicrobiomeEngineeringAgent", specialties: ["MicrobiomeEngineering", "Helios Genesis Runtime", "adversarial review"] },
  { id: "helios-genesis:AgriculturalBiotech", name: "AgriculturalBiotechAgent", specialties: ["AgriculturalBiotech", "Helios Genesis Runtime", "adversarial review"] },
  { id: "helios-genesis:IndustrialBiotech", name: "IndustrialBiotechAgent", specialties: ["IndustrialBiotech", "Helios Genesis Runtime", "adversarial review"] },
  { id: "helios-genesis:PrecisionMedicine", name: "PrecisionMedicineAgent", specialties: ["PrecisionMedicine", "Helios Genesis Runtime", "adversarial review"] },
  { id: "helios-genesis:GenomicMedicine", name: "GenomicMedicineAgent", specialties: ["GenomicMedicine", "Helios Genesis Runtime", "adversarial review"] },
  { id: "helios-genesis:LongevityBiotech", name: "LongevityBiotechAgent", specialties: ["LongevityBiotech", "Helios Genesis Runtime", "adversarial review"] },
  { id: "helios-genesis:CancerBiology", name: "CancerBiologyAgent", specialties: ["CancerBiology", "Helios Genesis Runtime", "adversarial review"] },
  { id: "helios-genesis:NeuroscienceBiotech", name: "NeuroscienceBiotechAgent", specialties: ["NeuroscienceBiotech", "Helios Genesis Runtime", "adversarial review"] },
  { id: "helios-genesis:BioethicsResponsibleInnovation", name: "BioethicsResponsibleInnovationAgent", specialties: ["BioethicsResponsibleInnovation", "Helios Genesis Runtime", "adversarial review"] },
  { id: "helios-genesis:FrontierBiotechResearch", name: "FrontierBiotechResearchAgent", specialties: ["FrontierBiotechResearch", "Helios Genesis Runtime", "adversarial review"] },
  { id: "helios-genesis:TranslationalMedicine", name: "TranslationalMedicineAgent", specialties: ["TranslationalMedicine", "Helios Genesis Runtime", "adversarial review"] },
] as const;

const CORE_CAPABILITIES = [
  new BaseCapabilityModule("helios-genesis:SuperpositionalReasoner", "SuperpositionalReasoner capability for Helios Genesis Runtime"),
  new BaseCapabilityModule("helios-genesis:RecursiveSelfImprover", "RecursiveSelfImprover capability for Helios Genesis Runtime"),
  new BaseCapabilityModule("helios-genesis:CounterfactualSimulator", "CounterfactualSimulator capability for Helios Genesis Runtime"),
  new BaseCapabilityModule("helios-genesis:HyperdimensionalMemory", "HyperdimensionalMemory capability for Helios Genesis Runtime"),
  new BaseCapabilityModule("helios-genesis:TemporalAbstraction", "TemporalAbstraction capability for Helios Genesis Runtime"),
  new BaseCapabilityModule("helios-genesis:DreamModeEngine", "DreamModeEngine capability for Helios Genesis Runtime"),
  new BaseCapabilityModule("helios-genesis:MultiAgentDebateProtocol", "MultiAgentDebateProtocol capability for Helios Genesis Runtime"),
  new BaseCapabilityModule("helios-genesis:CausalInferenceEngine", "CausalInferenceEngine capability for Helios Genesis Runtime"),
  new BaseCapabilityModule("helios-genesis:MetacognitiveCalibrator", "MetacognitiveCalibrator capability for Helios Genesis Runtime"),
  new BaseCapabilityModule("helios-genesis:MultimodalFusion", "MultimodalFusion capability for Helios Genesis Runtime"),
  new BaseCapabilityModule("helios-genesis:EmergenceMonitor", "EmergenceMonitor capability for Helios Genesis Runtime"),
  new BaseCapabilityModule("helios-genesis:PredictiveWorldModel", "PredictiveWorldModel capability for Helios Genesis Runtime"),
  new BaseCapabilityModule("helios-genesis:AdversarialReviewer", "AdversarialReviewer capability for Helios Genesis Runtime"),
  new BaseCapabilityModule("helios-genesis:EthicsKernel", "EthicsKernel capability for Helios Genesis Runtime"),
  new BaseCapabilityModule("helios-genesis:ResonanceProtocol", "ResonanceProtocol capability for Helios Genesis Runtime"),
] as const;

export class HeliosGenesisRuntime extends TranscendentRuntimeKernel {
  constructor() {
    super(
      "helios-genesis",
      "Helios Genesis Runtime",
      "Biotechnology, Genetic Engineering & Synthetic Biology",
      HELIOS_GENESIS_SYSTEM_PROMPT,
      AGENT_SPECS.map((agent) => new TranscendentBaseAgent(agent.id, agent.name, "Biotechnology, Genetic Engineering & Synthetic Biology", [...agent.specialties])),
      [
        ...CORE_CAPABILITIES,
        ...HeliosGenesisToolPack,
      ],
      [
        "This runtime provides informational synthesis and requires human oversight for high-stakes decisions.",
      ],
    );

    for (const node of HeliosGenesisMemorySeeds.nodes.slice(0, 24)) {
      InterRuntimeResonanceMemory.broadcast("helios-genesis", node);
    }
    for (const pattern of HeliosGenesisDreamPatterns) {
      InterRuntimeResonanceMemory.broadcast("helios-genesis:dream", {
        id: pattern,
        label: pattern,
        at: Date.now(),
        domain: "Biotechnology, Genetic Engineering & Synthetic Biology",
        confidence: 0.7,
        tags: ["dream", "helios-genesis"],
        sourceRuntime: "helios-genesis",
      });
    }
  }
}
