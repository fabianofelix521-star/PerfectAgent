import { TranscendentRuntimeKernel } from "@/runtimes/transcendent/TranscendentRuntimeKernel";
import { OnChainForensicsArchmageAgent } from "@/runtimes/leviathan/agents/OnChainForensicsArchmageAgent";
import { MemecoinLifecycleSpecialistAgent } from "@/runtimes/leviathan/agents/MemecoinLifecycleSpecialistAgent";
import { TechnicalAnalysisAIAdaptiveAgent } from "@/runtimes/leviathan/agents/TechnicalAnalysisAIAdaptiveAgent";
import { PredictionMarketEdgeHunterAgent } from "@/runtimes/leviathan/agents/PredictionMarketEdgeHunterAgent";
import { NarrativeIntelligenceAgent } from "@/runtimes/leviathan/agents/NarrativeIntelligenceAgent";
import { DeFiYieldArchitectAgent } from "@/runtimes/leviathan/agents/DeFiYieldArchitectAgent";
import { RiskManagementSovereignAgent } from "@/runtimes/leviathan/agents/RiskManagementSovereignAgent";
import { MEVProtectionStrategistAgent } from "@/runtimes/leviathan/agents/MEVProtectionStrategistAgent";
import { BacktestingForwardTestingAgent } from "@/runtimes/leviathan/agents/BacktestingForwardTestingAgent";
import { TradingPsychologyGuardianAgent } from "@/runtimes/leviathan/agents/TradingPsychologyGuardianAgent";
import { SuperpositionalReasoner } from "@/runtimes/leviathan/core/SuperpositionalReasoner";
import { RecursiveSelfImprover } from "@/runtimes/leviathan/core/RecursiveSelfImprover";
import { CounterfactualSimulator } from "@/runtimes/leviathan/core/CounterfactualSimulator";
import { HyperdimensionalMemory } from "@/runtimes/leviathan/core/HyperdimensionalMemory";
import { TemporalAbstraction } from "@/runtimes/leviathan/core/TemporalAbstraction";
import { DreamModeEngine } from "@/runtimes/leviathan/core/DreamModeEngine";
import { MultiAgentDebateProtocol } from "@/runtimes/leviathan/core/MultiAgentDebateProtocol";
import { CausalInferenceEngine } from "@/runtimes/leviathan/core/CausalInferenceEngine";
import { MetacognitiveCalibrator } from "@/runtimes/leviathan/core/MetacognitiveCalibrator";
import { MultimodalFusion } from "@/runtimes/leviathan/core/MultimodalFusion";
import { EmergenceMonitor } from "@/runtimes/leviathan/core/EmergenceMonitor";
import { PredictiveWorldModel } from "@/runtimes/leviathan/core/PredictiveWorldModel";
import { AdversarialReviewer } from "@/runtimes/leviathan/core/AdversarialReviewer";
import { EthicsKernel } from "@/runtimes/leviathan/core/EthicsKernel";
import { ResonanceProtocol } from "@/runtimes/leviathan/core/ResonanceProtocol";
import { LEVIATHAN_SYSTEM_PROMPT } from "@/runtimes/leviathan/prompts/systemPrompt";
import { LeviathanToolPack } from "@/runtimes/leviathan/tools/LeviathanToolPack";

export class LeviathanRuntime extends TranscendentRuntimeKernel {
  constructor() {
    super(
      "leviathan",
      "Leviathan Runtime",
      "Crypto Markets Alpha & Risk Sovereignty",
      LEVIATHAN_SYSTEM_PROMPT,
      [
    new OnChainForensicsArchmageAgent(),
    new MemecoinLifecycleSpecialistAgent(),
    new TechnicalAnalysisAIAdaptiveAgent(),
    new PredictionMarketEdgeHunterAgent(),
    new NarrativeIntelligenceAgent(),
    new DeFiYieldArchitectAgent(),
    new RiskManagementSovereignAgent(),
    new MEVProtectionStrategistAgent(),
    new BacktestingForwardTestingAgent(),
    new TradingPsychologyGuardianAgent(),
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
      ...LeviathanToolPack,
      ],
      [
        "As informações geradas por este runtime têm caráter informativo. Consulte especialistas antes de tomar decisões.",
      ],
    );
  }
}
