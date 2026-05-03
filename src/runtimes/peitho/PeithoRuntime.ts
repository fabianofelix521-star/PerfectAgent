import { TranscendentRuntimeKernel } from "@/runtimes/transcendent/TranscendentRuntimeKernel";
import { DeepPsychographyArchitectAgent } from "@/runtimes/peitho/agents/DeepPsychographyArchitectAgent";
import { HypnoticCopyArchmageAgent } from "@/runtimes/peitho/agents/HypnoticCopyArchmageAgent";
import { EmotionalJourneyOrchestratorAgent } from "@/runtimes/peitho/agents/EmotionalJourneyOrchestratorAgent";
import { BrandMythologyArchitectAgent } from "@/runtimes/peitho/agents/BrandMythologyArchitectAgent";
import { GrowthEngineeringArchmageAgent } from "@/runtimes/peitho/agents/GrowthEngineeringArchmageAgent";
import { ConversionArchitectGrandmasterAgent } from "@/runtimes/peitho/agents/ConversionArchitectGrandmasterAgent";
import { NeuromarketingScientistAgent } from "@/runtimes/peitho/agents/NeuromarketingScientistAgent";
import { CulturalIntelligenceAgent } from "@/runtimes/peitho/agents/CulturalIntelligenceAgent";
import { DataDrivenAttributionAgent } from "@/runtimes/peitho/agents/DataDrivenAttributionAgent";
import { EthicalPersuasionGuardianAgent } from "@/runtimes/peitho/agents/EthicalPersuasionGuardianAgent";
import { SuperpositionalReasoner } from "@/runtimes/peitho/core/SuperpositionalReasoner";
import { RecursiveSelfImprover } from "@/runtimes/peitho/core/RecursiveSelfImprover";
import { CounterfactualSimulator } from "@/runtimes/peitho/core/CounterfactualSimulator";
import { HyperdimensionalMemory } from "@/runtimes/peitho/core/HyperdimensionalMemory";
import { TemporalAbstraction } from "@/runtimes/peitho/core/TemporalAbstraction";
import { DreamModeEngine } from "@/runtimes/peitho/core/DreamModeEngine";
import { MultiAgentDebateProtocol } from "@/runtimes/peitho/core/MultiAgentDebateProtocol";
import { CausalInferenceEngine } from "@/runtimes/peitho/core/CausalInferenceEngine";
import { MetacognitiveCalibrator } from "@/runtimes/peitho/core/MetacognitiveCalibrator";
import { MultimodalFusion } from "@/runtimes/peitho/core/MultimodalFusion";
import { EmergenceMonitor } from "@/runtimes/peitho/core/EmergenceMonitor";
import { PredictiveWorldModel } from "@/runtimes/peitho/core/PredictiveWorldModel";
import { AdversarialReviewer } from "@/runtimes/peitho/core/AdversarialReviewer";
import { EthicsKernel } from "@/runtimes/peitho/core/EthicsKernel";
import { ResonanceProtocol } from "@/runtimes/peitho/core/ResonanceProtocol";
import { PEITHO_SYSTEM_PROMPT } from "@/runtimes/peitho/prompts/systemPrompt";
import { PeithoToolPack } from "@/runtimes/peitho/tools/PeithoToolPack";

export class PeithoRuntime extends TranscendentRuntimeKernel {
  constructor() {
    super(
      "peitho",
      "Peitho Runtime",
      "Neuro-Persuasion & Reality Marketing",
      PEITHO_SYSTEM_PROMPT,
      [
    new DeepPsychographyArchitectAgent(),
    new HypnoticCopyArchmageAgent(),
    new EmotionalJourneyOrchestratorAgent(),
    new BrandMythologyArchitectAgent(),
    new GrowthEngineeringArchmageAgent(),
    new ConversionArchitectGrandmasterAgent(),
    new NeuromarketingScientistAgent(),
    new CulturalIntelligenceAgent(),
    new DataDrivenAttributionAgent(),
    new EthicalPersuasionGuardianAgent(),
      ],
      [
      new SuperpositionalReasoner(),
      new RecursiveSelfImprover(),
      new CounterfactualSimulator(),
      new HyperdimensionalMemory(),
      new TemporalAbstraction(),
      new DreamModeEngine(),
      new MultiAgentDebateProtocol(),
      new CausalInferenceEngine(),
      new MetacognitiveCalibrator(),
      new MultimodalFusion(),
      new EmergenceMonitor(),
      new PredictiveWorldModel(),
      new AdversarialReviewer(),
      new EthicsKernel(),
      new ResonanceProtocol(),
      ...PeithoToolPack,
      ],
      [
        "As informações geradas por este runtime têm caráter informativo. Consulte especialistas antes de tomar decisões.",
      ],
    );
  }
}
