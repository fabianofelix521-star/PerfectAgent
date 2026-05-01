import type { NexusToolBase, ToolMetrics } from "@/tools/core/NexusToolBase";
import { AnalogicalReasoningTool } from "@/tools/cognition/AnalogicalReasoningTool";
import { BayesianUpdaterTool } from "@/tools/cognition/BayesianUpdaterTool";
import { CausalReasoningTool } from "@/tools/cognition/CausalReasoningTool";
import { ContradictionDetectorTool } from "@/tools/cognition/ContradictionDetectorTool";
import { CounterfactualTool } from "@/tools/cognition/CounterfactualTool";
import { HypothesisGeneratorTool } from "@/tools/cognition/HypothesisGeneratorTool";
import { AutomatedTraderTool } from "@/tools/execution/AutomatedTraderTool";
import { CodeDeployerTool } from "@/tools/execution/CodeDeployerTool";
import { ContentPublisherTool } from "@/tools/execution/ContentPublisherTool";
import { EmailCampaignTool } from "@/tools/execution/EmailCampaignTool";
import { MultiChainBridgeTool } from "@/tools/execution/MultiChainBridgeTool";
import { SmartContractExecutorTool } from "@/tools/execution/SmartContractExecutorTool";
import { EpisodicRecorderTool } from "@/tools/memory/EpisodicRecorderTool";
import { KnowledgeGraphTool } from "@/tools/memory/KnowledgeGraphTool";
import { MemoryConsolidatorTool } from "@/tools/memory/MemoryConsolidatorTool";
import { PatternExtractorTool } from "@/tools/memory/PatternExtractorTool";
import { SemanticSearchTool } from "@/tools/memory/SemanticSearchTool";
import { KnowledgeSupremaTool } from "@/tools/knowledge/KnowledgeSupremaTool";
import { ToolComposerTool } from "@/tools/meta/ToolComposerTool";
import { ToolEvolutionTool } from "@/tools/meta/ToolEvolutionTool";
import { ToolInspectorTool } from "@/tools/meta/ToolInspectorTool";
import { ToolOptimizerTool } from "@/tools/meta/ToolOptimizerTool";
import { BlockchainScannerTool } from "@/tools/perception/BlockchainScannerTool";
import { DarkPoolDetectorTool } from "@/tools/perception/DarkPoolDetectorTool";
import { DeepWebCrawlerTool } from "@/tools/perception/DeepWebCrawlerTool";
import { NewsIntelligenceTool } from "@/tools/perception/NewsIntelligenceTool";
import { RealTimeDataFeedTool } from "@/tools/perception/RealTimeDataFeedTool";
import { SatelliteDataTool } from "@/tools/perception/SatelliteDataTool";
import { SocialRadarTool } from "@/tools/perception/SocialRadarTool";
import { CrossDomainBridgeTool } from "@/tools/synthesis/CrossDomainBridgeTool";
import { InsightCrystallizerTool } from "@/tools/synthesis/InsightCrystallizerTool";
import { MultiSourceSynthesizerTool } from "@/tools/synthesis/MultiSourceSynthesizerTool";
import { NarrativeBuilderTool } from "@/tools/synthesis/NarrativeBuilderTool";
import { ReportGeneratorTool } from "@/tools/synthesis/ReportGeneratorTool";

export class ToolRegistry {
  private static readonly tools = new Map<string, NexusToolBase>();

  static register(tool: NexusToolBase): void {
    this.tools.set(tool.id, tool);
  }

  static unregister(toolId: string): void {
    this.tools.delete(toolId);
  }

  static clear(): void {
    this.tools.clear();
  }

  static get(toolId: string): NexusToolBase | undefined {
    return this.tools.get(toolId);
  }

  static getAll(): NexusToolBase[] {
    return [...this.tools.values()];
  }

  static getByCategory(category: string): NexusToolBase[] {
    return this.getAll().filter((tool) => tool.category === category);
  }

  static getMetrics(): Map<string, ToolMetrics> {
    const metrics = new Map<string, ToolMetrics>();
    for (const [id, tool] of this.tools) metrics.set(id, tool.getMetrics());
    return metrics;
  }

  static autoRegister(): void {
    const allTools: NexusToolBase[] = [
      new DeepWebCrawlerTool(),
      new RealTimeDataFeedTool(),
      new SocialRadarTool(),
      new BlockchainScannerTool(),
      new DarkPoolDetectorTool(),
      new NewsIntelligenceTool(),
      new SatelliteDataTool(),
      new CausalReasoningTool(),
      new CounterfactualTool(),
      new BayesianUpdaterTool(),
      new AnalogicalReasoningTool(),
      new ContradictionDetectorTool(),
      new HypothesisGeneratorTool(),
      new SmartContractExecutorTool(),
      new MultiChainBridgeTool(),
      new AutomatedTraderTool(),
      new ContentPublisherTool(),
      new CodeDeployerTool(),
      new EmailCampaignTool(),
      new EpisodicRecorderTool(),
      new SemanticSearchTool(),
      new KnowledgeSupremaTool(),
      new PatternExtractorTool(),
      new KnowledgeGraphTool(),
      new MemoryConsolidatorTool(),
      new MultiSourceSynthesizerTool(),
      new ReportGeneratorTool(),
      new InsightCrystallizerTool(),
      new NarrativeBuilderTool(),
      new CrossDomainBridgeTool(),
      new ToolInspectorTool(),
      new ToolOptimizerTool(),
      new ToolComposerTool(),
      new ToolEvolutionTool(),
    ];

    for (const tool of allTools) this.register(tool);
  }
}
