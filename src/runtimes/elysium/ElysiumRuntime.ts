import { TranscendentRuntimeKernel } from "@/runtimes/transcendent/TranscendentRuntimeKernel";
import { SpectralRenderingArchmageAgent } from "@/runtimes/elysium/agents/SpectralRenderingArchmageAgent";
import { EmergentPhysicsDeityAgent } from "@/runtimes/elysium/agents/EmergentPhysicsDeityAgent";
import { CognitiveNPCSoulSmithAgent } from "@/runtimes/elysium/agents/CognitiveNPCSoulSmithAgent";
import { ProceduralCosmosArchitectAgent } from "@/runtimes/elysium/agents/ProceduralCosmosArchitectAgent";
import { EmergentNarrativeDirectorAgent } from "@/runtimes/elysium/agents/EmergentNarrativeDirectorAgent";
import { ShaderAlchemyGrandmasterAgent } from "@/runtimes/elysium/agents/ShaderAlchemyGrandmasterAgent";
import { WavePhysicsAudioAgent } from "@/runtimes/elysium/agents/WavePhysicsAudioAgent";
import { AnimationVitalityAgent } from "@/runtimes/elysium/agents/AnimationVitalityAgent";
import { OptimizationSorcererAgent } from "@/runtimes/elysium/agents/OptimizationSorcererAgent";
import { WorldPersistenceTimekeeperAgent } from "@/runtimes/elysium/agents/WorldPersistenceTimekeeperAgent";
import { SuperpositionalReasoner } from "@/runtimes/elysium/core/SuperpositionalReasoner";
import { RecursiveSelfImprover } from "@/runtimes/elysium/core/RecursiveSelfImprover";
import { CounterfactualSimulator } from "@/runtimes/elysium/core/CounterfactualSimulator";
import { HyperdimensionalMemory } from "@/runtimes/elysium/core/HyperdimensionalMemory";
import { TemporalAbstraction } from "@/runtimes/elysium/core/TemporalAbstraction";
import { DreamModeEngine } from "@/runtimes/elysium/core/DreamModeEngine";
import { MultiAgentDebateProtocol } from "@/runtimes/elysium/core/MultiAgentDebateProtocol";
import { CausalInferenceEngine } from "@/runtimes/elysium/core/CausalInferenceEngine";
import { MetacognitiveCalibrator } from "@/runtimes/elysium/core/MetacognitiveCalibrator";
import { MultimodalFusion } from "@/runtimes/elysium/core/MultimodalFusion";
import { EmergenceMonitor } from "@/runtimes/elysium/core/EmergenceMonitor";
import { PredictiveWorldModel } from "@/runtimes/elysium/core/PredictiveWorldModel";
import { AdversarialReviewer } from "@/runtimes/elysium/core/AdversarialReviewer";
import { EthicsKernel } from "@/runtimes/elysium/core/EthicsKernel";
import { ResonanceProtocol } from "@/runtimes/elysium/core/ResonanceProtocol";
import { ELYSIUM_SYSTEM_PROMPT } from "@/runtimes/elysium/prompts/systemPrompt";
import { ElysiumToolPack } from "@/runtimes/elysium/tools/ElysiumToolPack";

export class ElysiumRuntime extends TranscendentRuntimeKernel {
  constructor() {
    super(
      "elysium",
      "Elysium Runtime",
      "Hyperreal Worlds & Living Realities Genesis",
      ELYSIUM_SYSTEM_PROMPT,
      [
    new SpectralRenderingArchmageAgent(),
    new EmergentPhysicsDeityAgent(),
    new CognitiveNPCSoulSmithAgent(),
    new ProceduralCosmosArchitectAgent(),
    new EmergentNarrativeDirectorAgent(),
    new ShaderAlchemyGrandmasterAgent(),
    new WavePhysicsAudioAgent(),
    new AnimationVitalityAgent(),
    new OptimizationSorcererAgent(),
    new WorldPersistenceTimekeeperAgent(),
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
      ...ElysiumToolPack,
      ],
      [
        "As informações geradas por este runtime têm caráter informativo. Consulte especialistas antes de tomar decisões.",
      ],
    );
  }
}
