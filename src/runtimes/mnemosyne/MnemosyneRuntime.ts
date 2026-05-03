import { TranscendentRuntimeKernel } from "@/runtimes/transcendent/TranscendentRuntimeKernel";
import { NeurotransmitterSystemsArchmageAgent } from "@/runtimes/mnemosyne/agents/NeurotransmitterSystemsArchmageAgent";
import { NeuroplasticityEngineerAgent } from "@/runtimes/mnemosyne/agents/NeuroplasticityEngineerAgent";
import { ComputationalNeuroscienceArchitectAgent } from "@/runtimes/mnemosyne/agents/ComputationalNeuroscienceArchitectAgent";
import { PsychopharmacologyOmniscientAgent } from "@/runtimes/mnemosyne/agents/PsychopharmacologyOmniscientAgent";
import { BrainComputerInterfaceArchitectAgent } from "@/runtimes/mnemosyne/agents/BrainComputerInterfaceArchitectAgent";
import { CognitiveEnhancementArchmageAgent } from "@/runtimes/mnemosyne/agents/CognitiveEnhancementArchmageAgent";
import { MentalHealthCircuitryAgent } from "@/runtimes/mnemosyne/agents/MentalHealthCircuitryAgent";
import { SleepNeuroscienceMaestroAgent } from "@/runtimes/mnemosyne/agents/SleepNeuroscienceMaestroAgent";
import { ConsciousnessCorrelatesAgent } from "@/runtimes/mnemosyne/agents/ConsciousnessCorrelatesAgent";
import { NeurotechnologyFuturistAgent } from "@/runtimes/mnemosyne/agents/NeurotechnologyFuturistAgent";
import { SuperpositionalReasoner } from "@/runtimes/mnemosyne/core/SuperpositionalReasoner";
import { RecursiveSelfImprover } from "@/runtimes/mnemosyne/core/RecursiveSelfImprover";
import { CounterfactualSimulator } from "@/runtimes/mnemosyne/core/CounterfactualSimulator";
import { HyperdimensionalMemory } from "@/runtimes/mnemosyne/core/HyperdimensionalMemory";
import { TemporalAbstraction } from "@/runtimes/mnemosyne/core/TemporalAbstraction";
import { DreamModeEngine } from "@/runtimes/mnemosyne/core/DreamModeEngine";
import { MultiAgentDebateProtocol } from "@/runtimes/mnemosyne/core/MultiAgentDebateProtocol";
import { CausalInferenceEngine } from "@/runtimes/mnemosyne/core/CausalInferenceEngine";
import { MetacognitiveCalibrator } from "@/runtimes/mnemosyne/core/MetacognitiveCalibrator";
import { MultimodalFusion } from "@/runtimes/mnemosyne/core/MultimodalFusion";
import { EmergenceMonitor } from "@/runtimes/mnemosyne/core/EmergenceMonitor";
import { PredictiveWorldModel } from "@/runtimes/mnemosyne/core/PredictiveWorldModel";
import { AdversarialReviewer } from "@/runtimes/mnemosyne/core/AdversarialReviewer";
import { EthicsKernel } from "@/runtimes/mnemosyne/core/EthicsKernel";
import { ResonanceProtocol } from "@/runtimes/mnemosyne/core/ResonanceProtocol";
import { MNEMOSYNE_SYSTEM_PROMPT } from "@/runtimes/mnemosyne/prompts/systemPrompt";
import { MnemosyneToolPack } from "@/runtimes/mnemosyne/tools/MnemosyneToolPack";

export class MnemosyneRuntime extends TranscendentRuntimeKernel {
  constructor() {
    super(
      "mnemosyne",
      "Mnemosyne Runtime",
      "Neural Architecture & Cognitive Engineering",
      MNEMOSYNE_SYSTEM_PROMPT,
      [
    new NeurotransmitterSystemsArchmageAgent(),
    new NeuroplasticityEngineerAgent(),
    new ComputationalNeuroscienceArchitectAgent(),
    new PsychopharmacologyOmniscientAgent(),
    new BrainComputerInterfaceArchitectAgent(),
    new CognitiveEnhancementArchmageAgent(),
    new MentalHealthCircuitryAgent(),
    new SleepNeuroscienceMaestroAgent(),
    new ConsciousnessCorrelatesAgent(),
    new NeurotechnologyFuturistAgent(),
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
      ...MnemosyneToolPack,
      ],
      [
        "As informações geradas por este runtime têm caráter informativo. Consulte especialistas antes de tomar decisões.",
      ],
    );
  }
}
