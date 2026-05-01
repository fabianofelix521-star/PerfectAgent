export type AgentTier = "HOT" | "WARM" | "COLD";
export type AgentStatus = "idle" | "running" | "error" | "cooldown";

export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
  avgLatencyMs: number;
  costPerCall?: number;
}

export interface AgentMemory {
  shortTerm: Map<string, any>;
  longTerm: Map<string, any>;
  episodic: Array<{
    timestamp: number;
    input: any;
    output: any;
    quality: number;
  }>;
  semantic: Map<string, string[]>;
}

export interface AgentMetrics {
  totalCalls: number;
  successRate: number;
  avgLatencyMs: number;
  avgQualityScore: number;
  lastError?: string;
  lastCalledAt?: number;
}

export interface AgentInput {
  prompt: string;
  context?: Record<string, any>;
  previousOutputs?: AgentOutput[];
  sessionId: string;
  requestId: string;
}

export interface AgentOutput {
  agentId: string;
  result: any;
  reasoning?: string;
  confidence: number;
  latencyMs: number;
  tokensUsed?: number;
  toolsUsed?: string[];
  followUpSuggestions?: string[];
  collaborationNeeded?: string[];
}

export interface AgentTool {
  name: string;
  description: string;
  execute: (params: any) => Promise<any>;
}

export interface CollaborationRequest {
  fromAgentId: string;
  task: string;
  payload?: Record<string, any>;
}

export interface CollaborationResponse {
  responderAgentId: string;
  accepted: boolean;
  result?: any;
  confidence?: number;
  message?: string;
}

export interface ExecutionContext {
  sessionId: string;
  userId?: string;
  previousAgents: string[];
  sharedMemory: Map<string, any>;
  startTime: number;
  budgetMs?: number;
}

export interface BaseAgent {
  id: string;
  name: string;
  description: string;
  supervisorId: string;
  tier: AgentTier;
  tags: string[];
  status: AgentStatus;
  capabilities: AgentCapability[];
  memory: AgentMemory;
  metrics: AgentMetrics;
  systemPrompt: string;
  tools: AgentTool[];

  execute(input: AgentInput, context: ExecutionContext): Promise<AgentOutput>;
  selfEvaluate(output: AgentOutput): Promise<number>;
  collaborate(
    targetAgentId: string,
    request: CollaborationRequest,
  ): Promise<CollaborationResponse>;
}
