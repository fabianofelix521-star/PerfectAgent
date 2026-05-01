import { ChronoScheduler } from "@/tools/chrono/ChronoEngine";
import { audienceModelRefreshJob } from "@/tools/chrono/jobs/AudienceModelRefreshJob";
import { knowledgeUpdateJob } from "@/tools/chrono/jobs/KnowledgeUpdateJob";
import { marketScanJob } from "@/tools/chrono/jobs/MarketScanJob";
import { memoryConsolidationJob } from "@/tools/chrono/jobs/MemoryConsolidationJob";
import { selfEvolutionJob } from "@/tools/chrono/jobs/SelfEvolutionJob";
import { swarmHealthJob } from "@/tools/chrono/jobs/SwarmHealthJob";
import { ToolRegistry } from "@/tools/core/ToolRegistry";

export interface NexusToolsRuntime {
  chrono: ChronoScheduler;
  stop: () => void;
}

export interface InitializeNexusToolsOptions {
  startChrono?: boolean;
  startFailurePredictor?: boolean;
}

export async function initializeNexusTools(
  options: InitializeNexusToolsOptions = {},
): Promise<NexusToolsRuntime> {
  ToolRegistry.autoRegister();
  const chrono = new ChronoScheduler();
  const schedule = options.startChrono ?? true;

  chrono.register(marketScanJob, { schedule });
  chrono.register(memoryConsolidationJob, { schedule });
  chrono.register(swarmHealthJob, { schedule });
  chrono.register(knowledgeUpdateJob, { schedule });
  chrono.register(audienceModelRefreshJob, { schedule });
  chrono.register(selfEvolutionJob, { schedule });

  const failureTimer =
    options.startFailurePredictor ?? true
      ? setInterval(() => void chrono.predictFailures(), 300_000)
      : undefined;

  return {
    chrono,
    stop: () => {
      chrono.stop();
      if (failureTimer) clearInterval(failureTimer);
    },
  };
}

export { ChronoEngine, ChronoPredictor, ChronoScheduler } from "@/tools/chrono/ChronoEngine";
export type {
  ChronoExecution,
  ChronoJobContext,
  ChronoJobDefinition,
  ChronoJobResult,
  ChronoTriggerType,
  FailurePrediction,
  JobsDashboard,
} from "@/tools/chrono/ChronoEngine";
export { audienceModelRefreshJob } from "@/tools/chrono/jobs/AudienceModelRefreshJob";
export { knowledgeUpdateJob } from "@/tools/chrono/jobs/KnowledgeUpdateJob";
export { marketScanJob } from "@/tools/chrono/jobs/MarketScanJob";
export { memoryConsolidationJob } from "@/tools/chrono/jobs/MemoryConsolidationJob";
export { selfEvolutionJob } from "@/tools/chrono/jobs/SelfEvolutionJob";
export { swarmHealthJob } from "@/tools/chrono/jobs/SwarmHealthJob";
export { NexusToolBase } from "@/tools/core/NexusToolBase";
export type {
  ExecutionApproach,
  LearningOutput,
  NexusToolInput,
  NexusToolOutput,
  QualityAssessment,
  ToolExecutionContext,
  ToolMetrics,
} from "@/tools/core/NexusToolBase";
export { ToolComposer } from "@/tools/core/ToolComposer";
export { ToolMemory } from "@/tools/core/ToolMemory";
export { ToolOrchestrator } from "@/tools/core/ToolOrchestrator";
export { ToolRegistry } from "@/tools/core/ToolRegistry";
export { AnalogicalReasoningTool } from "@/tools/cognition/AnalogicalReasoningTool";
export { BayesianUpdaterTool } from "@/tools/cognition/BayesianUpdaterTool";
export { CausalReasoningTool } from "@/tools/cognition/CausalReasoningTool";
export { ContradictionDetectorTool } from "@/tools/cognition/ContradictionDetectorTool";
export { CounterfactualTool } from "@/tools/cognition/CounterfactualTool";
export { HypothesisGeneratorTool } from "@/tools/cognition/HypothesisGeneratorTool";
export { AutomatedTraderTool } from "@/tools/execution/AutomatedTraderTool";
export { CodeDeployerTool } from "@/tools/execution/CodeDeployerTool";
export { ContentPublisherTool } from "@/tools/execution/ContentPublisherTool";
export { EmailCampaignTool } from "@/tools/execution/EmailCampaignTool";
export { MultiChainBridgeTool } from "@/tools/execution/MultiChainBridgeTool";
export { SmartContractExecutorTool } from "@/tools/execution/SmartContractExecutorTool";
export { EpisodicRecorderTool } from "@/tools/memory/EpisodicRecorderTool";
export { KnowledgeGraphTool } from "@/tools/memory/KnowledgeGraphTool";
export { MemoryConsolidatorTool } from "@/tools/memory/MemoryConsolidatorTool";
export { PatternExtractorTool } from "@/tools/memory/PatternExtractorTool";
export { SemanticSearchTool } from "@/tools/memory/SemanticSearchTool";
export { KnowledgeSupremaTool } from "@/tools/knowledge/KnowledgeSupremaTool";
export { ToolComposerTool } from "@/tools/meta/ToolComposerTool";
export { ToolEvolutionTool } from "@/tools/meta/ToolEvolutionTool";
export { ToolInspectorTool } from "@/tools/meta/ToolInspectorTool";
export { ToolOptimizerTool } from "@/tools/meta/ToolOptimizerTool";
export { BlockchainScannerTool } from "@/tools/perception/BlockchainScannerTool";
export { DarkPoolDetectorTool } from "@/tools/perception/DarkPoolDetectorTool";
export { DeepWebCrawlerTool } from "@/tools/perception/DeepWebCrawlerTool";
export { NewsIntelligenceTool } from "@/tools/perception/NewsIntelligenceTool";
export { RealTimeDataFeedTool } from "@/tools/perception/RealTimeDataFeedTool";
export { SatelliteDataTool } from "@/tools/perception/SatelliteDataTool";
export { SocialRadarTool } from "@/tools/perception/SocialRadarTool";
export { CrossDomainBridgeTool } from "@/tools/synthesis/CrossDomainBridgeTool";
export { InsightCrystallizerTool } from "@/tools/synthesis/InsightCrystallizerTool";
export { MultiSourceSynthesizerTool } from "@/tools/synthesis/MultiSourceSynthesizerTool";
export { NarrativeBuilderTool } from "@/tools/synthesis/NarrativeBuilderTool";
export { ReportGeneratorTool } from "@/tools/synthesis/ReportGeneratorTool";
export { getToolsForRuntime, RUNTIME_TOOL_MAP } from "@/tools/runtimeIntegration";
