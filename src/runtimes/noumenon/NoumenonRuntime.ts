import { TranscendentRuntimeKernel } from "@/runtimes/transcendent/TranscendentRuntimeKernel";
import { QuantumMechanicsFoundationAgent } from "@/runtimes/noumenon/agents/QuantumMechanicsFoundationAgent";
import { QuantumFieldTheoryArchmageAgent } from "@/runtimes/noumenon/agents/QuantumFieldTheoryArchmageAgent";
import { GeneralRelativityGeometerAgent } from "@/runtimes/noumenon/agents/GeneralRelativityGeometerAgent";
import { QuantumGravityFrontierAgent } from "@/runtimes/noumenon/agents/QuantumGravityFrontierAgent";
import { QuantumInformationArchitectAgent } from "@/runtimes/noumenon/agents/QuantumInformationArchitectAgent";
import { CosmologyArchitectAgent } from "@/runtimes/noumenon/agents/CosmologyArchitectAgent";
import { ParticlePhenomenologistAgent } from "@/runtimes/noumenon/agents/ParticlePhenomenologistAgent";
import { ManyBodyCondensedMatterAgent } from "@/runtimes/noumenon/agents/ManyBodyCondensedMatterAgent";
import { QuantumThermodynamicsAgent } from "@/runtimes/noumenon/agents/QuantumThermodynamicsAgent";
import { PseudoscienceDebunkerAgent } from "@/runtimes/noumenon/agents/PseudoscienceDebunkerAgent";
import { SuperpositionalReasoner } from "@/runtimes/noumenon/core/SuperpositionalReasoner";
import { RecursiveSelfImprover } from "@/runtimes/noumenon/core/RecursiveSelfImprover";
import { CounterfactualSimulator } from "@/runtimes/noumenon/core/CounterfactualSimulator";
import { HyperdimensionalMemory } from "@/runtimes/noumenon/core/HyperdimensionalMemory";
import { TemporalAbstraction } from "@/runtimes/noumenon/core/TemporalAbstraction";
import { DreamModeEngine } from "@/runtimes/noumenon/core/DreamModeEngine";
import { MultiAgentDebateProtocol } from "@/runtimes/noumenon/core/MultiAgentDebateProtocol";
import { CausalInferenceEngine } from "@/runtimes/noumenon/core/CausalInferenceEngine";
import { MetacognitiveCalibrator } from "@/runtimes/noumenon/core/MetacognitiveCalibrator";
import { MultimodalFusion } from "@/runtimes/noumenon/core/MultimodalFusion";
import { EmergenceMonitor } from "@/runtimes/noumenon/core/EmergenceMonitor";
import { PredictiveWorldModel } from "@/runtimes/noumenon/core/PredictiveWorldModel";
import { AdversarialReviewer } from "@/runtimes/noumenon/core/AdversarialReviewer";
import { EthicsKernel } from "@/runtimes/noumenon/core/EthicsKernel";
import { ResonanceProtocol } from "@/runtimes/noumenon/core/ResonanceProtocol";
import { NOUMENON_SYSTEM_PROMPT } from "@/runtimes/noumenon/prompts/systemPrompt";
import { NoumenonToolPack } from "@/runtimes/noumenon/tools/NoumenonToolPack";

export class NoumenonRuntime extends TranscendentRuntimeKernel {
  constructor() {
    super(
      "noumenon",
      "Noumenon Runtime",
      "Quantum Reality & Fundamental Physics",
      NOUMENON_SYSTEM_PROMPT,
      [
    new QuantumMechanicsFoundationAgent(),
    new QuantumFieldTheoryArchmageAgent(),
    new GeneralRelativityGeometerAgent(),
    new QuantumGravityFrontierAgent(),
    new QuantumInformationArchitectAgent(),
    new CosmologyArchitectAgent(),
    new ParticlePhenomenologistAgent(),
    new ManyBodyCondensedMatterAgent(),
    new QuantumThermodynamicsAgent(),
    new PseudoscienceDebunkerAgent(),
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
      ...NoumenonToolPack,
      ],
      [
        "As informações geradas por este runtime têm caráter informativo. Consulte especialistas antes de tomar decisões.",
      ],
    );
  }
}
