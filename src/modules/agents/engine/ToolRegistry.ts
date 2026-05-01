import type { AgentTool } from "@/modules/agents/tools/types";
import { WebSearchTool } from "@/modules/agents/tools/WebSearchTool";
import { BrowserTool } from "@/modules/agents/tools/BrowserTool";
import { CodeExecutionTool } from "@/modules/agents/tools/CodeExecutionTool";
import { FileSystemTool } from "@/modules/agents/tools/FileSystemTool";
import { APICallTool } from "@/modules/agents/tools/APICallTool";
import { DatabaseTool } from "@/modules/agents/tools/DatabaseTool";
import { EmailTool } from "@/modules/agents/tools/EmailTool";
import { CalendarTool } from "@/modules/agents/tools/CalendarTool";
import { ImageGenTool } from "@/modules/agents/tools/ImageGenTool";
import { DataAnalysisTool } from "@/modules/agents/tools/DataAnalysisTool";
import { GitTool } from "@/modules/agents/tools/GitTool";
import { KnowledgeBaseTool } from "@/modules/agents/tools/KnowledgeBaseTool";
import { RAGTool } from "@/modules/agents/tools/RAGTool";
import { MCPTool } from "@/modules/agents/tools/MCPTool";

export class ToolRegistry {
  private readonly tools = new Map<string, AgentTool>();

  constructor() {
    this.register(new WebSearchTool());
    this.register(new BrowserTool());
    this.register(new CodeExecutionTool());
    this.register(new FileSystemTool());
    this.register(new APICallTool());
    this.register(new DatabaseTool());
    this.register(new EmailTool());
    this.register(new CalendarTool());
    this.register(new ImageGenTool());
    this.register(new DataAnalysisTool());
    this.register(new GitTool());
    this.register(new KnowledgeBaseTool());
    this.register(new RAGTool());
    this.register(new MCPTool());
  }

  register(tool: AgentTool): void {
    this.tools.set(tool.id, tool);
  }

  get(id: string): AgentTool | undefined {
    return this.tools.get(id);
  }

  list(): AgentTool[] {
    return Array.from(this.tools.values());
  }
}

export const toolRegistry = new ToolRegistry();
