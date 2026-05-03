import { TranscendentRuntimeKernel } from "@/runtimes/transcendent/TranscendentRuntimeKernel";
import { HermeticPrinciplesArchmageAgent } from "@/runtimes/akasha/agents/HermeticPrinciplesArchmageAgent";
import { KabbalisticTreeNavigatorAgent } from "@/runtimes/akasha/agents/KabbalisticTreeNavigatorAgent";
import { AlchemicalGrandMasterAgent } from "@/runtimes/akasha/agents/AlchemicalGrandMasterAgent";
import { ArchetypalAstrologyOracleAgent } from "@/runtimes/akasha/agents/ArchetypalAstrologyOracleAgent";
import { TarotOracleArchmageAgent } from "@/runtimes/akasha/agents/TarotOracleArchmageAgent";
import { IChingMutationOracleAgent } from "@/runtimes/akasha/agents/IChingMutationOracleAgent";
import { TantricYogicWisdomAgent } from "@/runtimes/akasha/agents/TantricYogicWisdomAgent";
import { BuddhistEsotericArchmageAgent } from "@/runtimes/akasha/agents/BuddhistEsotericArchmageAgent";
import { ConsciousnessCartographerAgent } from "@/runtimes/akasha/agents/ConsciousnessCartographerAgent";
import { UniversalWisdomSynthesizerAgent } from "@/runtimes/akasha/agents/UniversalWisdomSynthesizerAgent";
import { SuperpositionalReasoner } from "@/runtimes/akasha/core/SuperpositionalReasoner";
import { RecursiveSelfImprover } from "@/runtimes/akasha/core/RecursiveSelfImprover";
import { CounterfactualSimulator } from "@/runtimes/akasha/core/CounterfactualSimulator";
import { HyperdimensionalMemory } from "@/runtimes/akasha/core/HyperdimensionalMemory";
import { TemporalAbstraction } from "@/runtimes/akasha/core/TemporalAbstraction";
import { DreamModeEngine } from "@/runtimes/akasha/core/DreamModeEngine";
import { MultiAgentDebateProtocol } from "@/runtimes/akasha/core/MultiAgentDebateProtocol";
import { CausalInferenceEngine } from "@/runtimes/akasha/core/CausalInferenceEngine";
import { MetacognitiveCalibrator } from "@/runtimes/akasha/core/MetacognitiveCalibrator";
import { MultimodalFusion } from "@/runtimes/akasha/core/MultimodalFusion";
import { EmergenceMonitor } from "@/runtimes/akasha/core/EmergenceMonitor";
import { PredictiveWorldModel } from "@/runtimes/akasha/core/PredictiveWorldModel";
import { AdversarialReviewer } from "@/runtimes/akasha/core/AdversarialReviewer";
import { EthicsKernel } from "@/runtimes/akasha/core/EthicsKernel";
import { ResonanceProtocol } from "@/runtimes/akasha/core/ResonanceProtocol";
import { AKASHA_SYSTEM_PROMPT } from "@/runtimes/akasha/prompts/systemPrompt";
import { AkashaToolPack } from "@/runtimes/akasha/tools/AkashaToolPack";

export class AkashaRuntime extends TranscendentRuntimeKernel {
  constructor() {
    super(
      "akasha",
      "Akasha Runtime",
      "Perennial Wisdom & Consciousness Cartography",
      AKASHA_SYSTEM_PROMPT,
      [
    new HermeticPrinciplesArchmageAgent(),
    new KabbalisticTreeNavigatorAgent(),
    new AlchemicalGrandMasterAgent(),
    new ArchetypalAstrologyOracleAgent(),
    new TarotOracleArchmageAgent(),
    new IChingMutationOracleAgent(),
    new TantricYogicWisdomAgent(),
    new BuddhistEsotericArchmageAgent(),
    new ConsciousnessCartographerAgent(),
    new UniversalWisdomSynthesizerAgent(),
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
      ...AkashaToolPack,
      ],
      [
        "As informações geradas por este runtime têm caráter informativo. Consulte especialistas antes de tomar decisões.",
      ],
    );
  }
}
