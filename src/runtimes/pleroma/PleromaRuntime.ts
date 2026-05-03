import { TranscendentRuntimeKernel } from "@/runtimes/transcendent/TranscendentRuntimeKernel";
import { IntentDeepUnderstandingAgent } from "@/runtimes/pleroma/agents/IntentDeepUnderstandingAgent";
import { RuntimeRoutingArchmageAgent } from "@/runtimes/pleroma/agents/RuntimeRoutingArchmageAgent";
import { CrossDomainSynthesisGrandmasterAgent } from "@/runtimes/pleroma/agents/CrossDomainSynthesisGrandmasterAgent";
import { EmergentInsightGeneratorAgent } from "@/runtimes/pleroma/agents/EmergentInsightGeneratorAgent";
import { MetaLearningArchmageAgent } from "@/runtimes/pleroma/agents/MetaLearningArchmageAgent";
import { CapabilityDiscoveryAgent } from "@/runtimes/pleroma/agents/CapabilityDiscoveryAgent";
import { LongTermUnifiedMemoryAgent } from "@/runtimes/pleroma/agents/LongTermUnifiedMemoryAgent";
import { SwarmCoordinationConductorAgent } from "@/runtimes/pleroma/agents/SwarmCoordinationConductorAgent";
import { SystemHealthMonitoringAgent } from "@/runtimes/pleroma/agents/SystemHealthMonitoringAgent";
import { EthicsKernelOmniGuardianAgent } from "@/runtimes/pleroma/agents/EthicsKernelOmniGuardianAgent";
import { SuperpositionalReasoner } from "@/runtimes/pleroma/core/SuperpositionalReasoner";
import { RecursiveSelfImprover } from "@/runtimes/pleroma/core/RecursiveSelfImprover";
import { CounterfactualSimulator } from "@/runtimes/pleroma/core/CounterfactualSimulator";
import { HyperdimensionalMemory } from "@/runtimes/pleroma/core/HyperdimensionalMemory";
import { TemporalAbstraction } from "@/runtimes/pleroma/core/TemporalAbstraction";
import { DreamModeEngine } from "@/runtimes/pleroma/core/DreamModeEngine";
import { MultiAgentDebateProtocol } from "@/runtimes/pleroma/core/MultiAgentDebateProtocol";
import { CausalInferenceEngine } from "@/runtimes/pleroma/core/CausalInferenceEngine";
import { MetacognitiveCalibrator } from "@/runtimes/pleroma/core/MetacognitiveCalibrator";
import { MultimodalFusion } from "@/runtimes/pleroma/core/MultimodalFusion";
import { EmergenceMonitor } from "@/runtimes/pleroma/core/EmergenceMonitor";
import { PredictiveWorldModel } from "@/runtimes/pleroma/core/PredictiveWorldModel";
import { AdversarialReviewer } from "@/runtimes/pleroma/core/AdversarialReviewer";
import { EthicsKernel } from "@/runtimes/pleroma/core/EthicsKernel";
import { ResonanceProtocol } from "@/runtimes/pleroma/core/ResonanceProtocol";
import { PLEROMA_SYSTEM_PROMPT } from "@/runtimes/pleroma/prompts/systemPrompt";
import { PleromaToolPack } from "@/runtimes/pleroma/tools/PleromaToolPack";

export class PleromaRuntime extends TranscendentRuntimeKernel {
  readonly knownRuntimeIds: string[] = [
    "prometheus",
    "morpheus-creative",
    "apollo",
    "hermes",
    "athena",
    "vulcan",
    "oracle",
    "sophia",
    "asclepius",
    "logos",
    "prometheus-mind",
    "nexus-prime",
    "hippocrates-supreme",
    "mendeleev",
    "prompt-forge",
    "silicon-valley",
    "unreal-forge",
    "aegis",
    "content-empire",
    "ad-commander",
    "studio-one",
    "wall-street",
    "pixel-forge",
    "aether",
    "ambrosia",
    "quantum",
    "cortex",
    "midas",
    "asclepius-nextgen",
    "hermes-memetics",
    "oracle-symbolic",
    "aetherion",
    "elysium",
    "panacea",
    "amrita",
    "akasha",
    "noumenon",
    "mnemosyne",
    "peitho",
    "leviathan",
    "pleroma",
  ];

  getKnownRuntimeIds(): string[] {
    return [...this.knownRuntimeIds];
  }

  constructor() {
    super(
      "pleroma",
      "Pleroma Runtime",
      "Meta-Cognitive Orchestration & Emergent Intelligence",
      PLEROMA_SYSTEM_PROMPT,
      [
    new IntentDeepUnderstandingAgent(),
    new RuntimeRoutingArchmageAgent(),
    new CrossDomainSynthesisGrandmasterAgent(),
    new EmergentInsightGeneratorAgent(),
    new MetaLearningArchmageAgent(),
    new CapabilityDiscoveryAgent(),
    new LongTermUnifiedMemoryAgent(),
    new SwarmCoordinationConductorAgent(),
    new SystemHealthMonitoringAgent(),
    new EthicsKernelOmniGuardianAgent(),
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
      ...PleromaToolPack,
      ],
      [
        "As informações geradas por este runtime têm caráter informativo. Consulte especialistas antes de tomar decisões.",
      ],
    );
  }
}
