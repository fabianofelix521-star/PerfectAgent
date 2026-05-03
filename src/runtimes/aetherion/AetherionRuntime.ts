import { TranscendentRuntimeKernel } from "@/runtimes/transcendent/TranscendentRuntimeKernel";
import { FormalVerificationOracleAgent } from "@/runtimes/aetherion/agents/FormalVerificationOracleAgent";
import { ArchitecturalGenomeEvolutionAgent } from "@/runtimes/aetherion/agents/ArchitecturalGenomeEvolutionAgent";
import { CompilerSynthesisOmniAgent } from "@/runtimes/aetherion/agents/CompilerSynthesisOmniAgent";
import { DistributedSystemsArchitectAgent } from "@/runtimes/aetherion/agents/DistributedSystemsArchitectAgent";
import { KernelLevelAlchemistAgent } from "@/runtimes/aetherion/agents/KernelLevelAlchemistAgent";
import { TemporalDebuggerAgent } from "@/runtimes/aetherion/agents/TemporalDebuggerAgent";
import { SelfHealingImmuneAgent } from "@/runtimes/aetherion/agents/SelfHealingImmuneAgent";
import { CodeArcheologistAgent } from "@/runtimes/aetherion/agents/CodeArcheologistAgent";
import { PerformanceClairvoyantAgent } from "@/runtimes/aetherion/agents/PerformanceClairvoyantAgent";
import { SecurityOmniscientAgent } from "@/runtimes/aetherion/agents/SecurityOmniscientAgent";
import { SuperpositionalReasoner } from "@/runtimes/aetherion/core/SuperpositionalReasoner";
import { RecursiveSelfImprover } from "@/runtimes/aetherion/core/RecursiveSelfImprover";
import { CounterfactualSimulator } from "@/runtimes/aetherion/core/CounterfactualSimulator";
import { HyperdimensionalMemory } from "@/runtimes/aetherion/core/HyperdimensionalMemory";
import { TemporalAbstraction } from "@/runtimes/aetherion/core/TemporalAbstraction";
import { DreamModeEngine } from "@/runtimes/aetherion/core/DreamModeEngine";
import { MultiAgentDebateProtocol } from "@/runtimes/aetherion/core/MultiAgentDebateProtocol";
import { CausalInferenceEngine } from "@/runtimes/aetherion/core/CausalInferenceEngine";
import { MetacognitiveCalibrator } from "@/runtimes/aetherion/core/MetacognitiveCalibrator";
import { MultimodalFusion } from "@/runtimes/aetherion/core/MultimodalFusion";
import { EmergenceMonitor } from "@/runtimes/aetherion/core/EmergenceMonitor";
import { PredictiveWorldModel } from "@/runtimes/aetherion/core/PredictiveWorldModel";
import { AdversarialReviewer } from "@/runtimes/aetherion/core/AdversarialReviewer";
import { EthicsKernel } from "@/runtimes/aetherion/core/EthicsKernel";
import { ResonanceProtocol } from "@/runtimes/aetherion/core/ResonanceProtocol";
import { AETHERION_SYSTEM_PROMPT } from "@/runtimes/aetherion/prompts/systemPrompt";
import { AetherionToolPack } from "@/runtimes/aetherion/tools/AetherionToolPack";

export class AetherionRuntime extends TranscendentRuntimeKernel {
  constructor() {
    super(
      "aetherion",
      "Aetherion Runtime",
      "Hyperdimensional Software & Systems Architecture",
      AETHERION_SYSTEM_PROMPT,
      [
    new FormalVerificationOracleAgent(),
    new ArchitecturalGenomeEvolutionAgent(),
    new CompilerSynthesisOmniAgent(),
    new DistributedSystemsArchitectAgent(),
    new KernelLevelAlchemistAgent(),
    new TemporalDebuggerAgent(),
    new SelfHealingImmuneAgent(),
    new CodeArcheologistAgent(),
    new PerformanceClairvoyantAgent(),
    new SecurityOmniscientAgent(),
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
      ...AetherionToolPack,
      ],
      [
        "As informações geradas por este runtime têm caráter informativo. Consulte especialistas antes de tomar decisões.",
      ],
    );
  }
}
