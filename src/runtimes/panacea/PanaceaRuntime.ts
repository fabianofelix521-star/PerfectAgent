import { TranscendentRuntimeKernel } from "@/runtimes/transcendent/TranscendentRuntimeKernel";
import { MolecularPharmacologyOmniscientAgent } from "@/runtimes/panacea/agents/MolecularPharmacologyOmniscientAgent";
import { SignalingCascadeNavigatorAgent } from "@/runtimes/panacea/agents/SignalingCascadeNavigatorAgent";
import { PolypharmacyMatrixAgent } from "@/runtimes/panacea/agents/PolypharmacyMatrixAgent";
import { DiagnosticBayesianMasterAgent } from "@/runtimes/panacea/agents/DiagnosticBayesianMasterAgent";
import { PharmacogenomicTailorAgent } from "@/runtimes/panacea/agents/PharmacogenomicTailorAgent";
import { SystemsPhysiologyHolistAgent } from "@/runtimes/panacea/agents/SystemsPhysiologyHolistAgent";
import { MolecularDynamicsSimulatorAgent } from "@/runtimes/panacea/agents/MolecularDynamicsSimulatorAgent";
import { ChronoMedicineAgent } from "@/runtimes/panacea/agents/ChronoMedicineAgent";
import { MicrobiomeAwarePhysicianAgent } from "@/runtimes/panacea/agents/MicrobiomeAwarePhysicianAgent";
import { RareDiseaseHunterAgent } from "@/runtimes/panacea/agents/RareDiseaseHunterAgent";
import { SuperpositionalReasoner } from "@/runtimes/panacea/core/SuperpositionalReasoner";
import { RecursiveSelfImprover } from "@/runtimes/panacea/core/RecursiveSelfImprover";
import { CounterfactualSimulator } from "@/runtimes/panacea/core/CounterfactualSimulator";
import { HyperdimensionalMemory } from "@/runtimes/panacea/core/HyperdimensionalMemory";
import { TemporalAbstraction } from "@/runtimes/panacea/core/TemporalAbstraction";
import { DreamModeEngine } from "@/runtimes/panacea/core/DreamModeEngine";
import { MultiAgentDebateProtocol } from "@/runtimes/panacea/core/MultiAgentDebateProtocol";
import { CausalInferenceEngine } from "@/runtimes/panacea/core/CausalInferenceEngine";
import { MetacognitiveCalibrator } from "@/runtimes/panacea/core/MetacognitiveCalibrator";
import { MultimodalFusion } from "@/runtimes/panacea/core/MultimodalFusion";
import { EmergenceMonitor } from "@/runtimes/panacea/core/EmergenceMonitor";
import { PredictiveWorldModel } from "@/runtimes/panacea/core/PredictiveWorldModel";
import { AdversarialReviewer } from "@/runtimes/panacea/core/AdversarialReviewer";
import { EthicsKernel } from "@/runtimes/panacea/core/EthicsKernel";
import { ResonanceProtocol } from "@/runtimes/panacea/core/ResonanceProtocol";
import { PANACEA_SYSTEM_PROMPT } from "@/runtimes/panacea/prompts/systemPrompt";
import { PanaceaToolPack } from "@/runtimes/panacea/tools/PanaceaToolPack";

export class PanaceaRuntime extends TranscendentRuntimeKernel {
  constructor() {
    super(
      "panacea",
      "Panacea Runtime",
      "Molecular Medicine & Systemic Healing",
      PANACEA_SYSTEM_PROMPT,
      [
    new MolecularPharmacologyOmniscientAgent(),
    new SignalingCascadeNavigatorAgent(),
    new PolypharmacyMatrixAgent(),
    new DiagnosticBayesianMasterAgent(),
    new PharmacogenomicTailorAgent(),
    new SystemsPhysiologyHolistAgent(),
    new MolecularDynamicsSimulatorAgent(),
    new ChronoMedicineAgent(),
    new MicrobiomeAwarePhysicianAgent(),
    new RareDiseaseHunterAgent(),
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
      ...PanaceaToolPack,
      ],
      [
        "As informações geradas por este runtime têm caráter informativo. Consulte especialistas antes de tomar decisões.",
      ],
    );
  }
}
