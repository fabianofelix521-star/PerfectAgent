import { TranscendentRuntimeKernel } from "@/runtimes/transcendent/TranscendentRuntimeKernel";
import { BiochemicalNutritionMolecularAgent } from "@/runtimes/amrita/agents/BiochemicalNutritionMolecularAgent";
import { NutrigenomicArchitectAgent } from "@/runtimes/amrita/agents/NutrigenomicArchitectAgent";
import { MicrobiomeNutritionEcologistAgent } from "@/runtimes/amrita/agents/MicrobiomeNutritionEcologistAgent";
import { ChronoNutritionTimekeeperAgent } from "@/runtimes/amrita/agents/ChronoNutritionTimekeeperAgent";
import { MitochondrialBioenergeticsAgent } from "@/runtimes/amrita/agents/MitochondrialBioenergeticsAgent";
import { HormonalOptimizationAgent } from "@/runtimes/amrita/agents/HormonalOptimizationAgent";
import { CognitiveNutritionEnhancerAgent } from "@/runtimes/amrita/agents/CognitiveNutritionEnhancerAgent";
import { AntiAgingLongevityArchitectAgent } from "@/runtimes/amrita/agents/AntiAgingLongevityArchitectAgent";
import { TherapeuticNutritionProtocolAgent } from "@/runtimes/amrita/agents/TherapeuticNutritionProtocolAgent";
import { PersonalizedProtocolSynthesizerAgent } from "@/runtimes/amrita/agents/PersonalizedProtocolSynthesizerAgent";
import { SuperpositionalReasoner } from "@/runtimes/amrita/core/SuperpositionalReasoner";
import { RecursiveSelfImprover } from "@/runtimes/amrita/core/RecursiveSelfImprover";
import { CounterfactualSimulator } from "@/runtimes/amrita/core/CounterfactualSimulator";
import { HyperdimensionalMemory } from "@/runtimes/amrita/core/HyperdimensionalMemory";
import { TemporalAbstraction } from "@/runtimes/amrita/core/TemporalAbstraction";
import { DreamModeEngine } from "@/runtimes/amrita/core/DreamModeEngine";
import { MultiAgentDebateProtocol } from "@/runtimes/amrita/core/MultiAgentDebateProtocol";
import { CausalInferenceEngine } from "@/runtimes/amrita/core/CausalInferenceEngine";
import { MetacognitiveCalibrator } from "@/runtimes/amrita/core/MetacognitiveCalibrator";
import { MultimodalFusion } from "@/runtimes/amrita/core/MultimodalFusion";
import { EmergenceMonitor } from "@/runtimes/amrita/core/EmergenceMonitor";
import { PredictiveWorldModel } from "@/runtimes/amrita/core/PredictiveWorldModel";
import { AdversarialReviewer } from "@/runtimes/amrita/core/AdversarialReviewer";
import { EthicsKernel } from "@/runtimes/amrita/core/EthicsKernel";
import { ResonanceProtocol } from "@/runtimes/amrita/core/ResonanceProtocol";
import { AMRITA_SYSTEM_PROMPT } from "@/runtimes/amrita/prompts/systemPrompt";
import { AmritaToolPack } from "@/runtimes/amrita/tools/AmritaToolPack";

export class AmritaRuntime extends TranscendentRuntimeKernel {
  constructor() {
    super(
      "amrita",
      "Amrita Runtime",
      "Molecular Nutrition & Metabolic Optimization",
      AMRITA_SYSTEM_PROMPT,
      [
    new BiochemicalNutritionMolecularAgent(),
    new NutrigenomicArchitectAgent(),
    new MicrobiomeNutritionEcologistAgent(),
    new ChronoNutritionTimekeeperAgent(),
    new MitochondrialBioenergeticsAgent(),
    new HormonalOptimizationAgent(),
    new CognitiveNutritionEnhancerAgent(),
    new AntiAgingLongevityArchitectAgent(),
    new TherapeuticNutritionProtocolAgent(),
    new PersonalizedProtocolSynthesizerAgent(),
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
      ...AmritaToolPack,
      ],
      [
        "As informações geradas por este runtime têm caráter informativo. Consulte especialistas antes de tomar decisões.",
      ],
    );
  }
}
