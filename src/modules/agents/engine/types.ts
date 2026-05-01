export interface AgentConfig {
  usePlanning: boolean;
  useReflection: boolean;
  maxIterations: number;
}

export interface Agent {
  id: string;
  name: string;
  systemPrompt: string;
  config: AgentConfig;
  enabledTools: string[];
  useMCP?: boolean;
}

export interface AgentTask {
  id: string;
  prompt: string;
  startedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface AgentStep {
  type: "planning" | "tool_call" | "tool_result" | "reflection" | "response";
  content?: string;
  toolName?: string;
  toolInput?: unknown;
  toolOutput?: unknown;
  timestamp: Date;
}

export interface PlanStep {
  id: string;
  description: string;
}

export interface TaskPlan {
  steps: PlanStep[];
}

export interface AgentTaskResult {
  success: boolean;
  result: string;
  steps: Array<{ role: string; content: unknown }>;
  tokensUsed: number;
  duration: number;
}

export interface AITool {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

export interface ToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface LLMToolResponse {
  content: string | null;
  tool_calls?: ToolCall[];
}
