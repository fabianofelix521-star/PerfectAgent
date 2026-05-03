export type HealthStatus = "healthy" | "degraded" | "critical";

export type MessagePriority = "low" | "normal" | "high" | "critical";

export interface NexusMessage<TPayload = unknown> {
  from: string;
  to: string | string[];
  type: "query" | "command" | "event" | "data";
  payload: TPayload;
  timestamp: number;
  correlationId?: string;
  priority?: MessagePriority;
}

export type AgentDecision =
  | {
      kind: "recommendation";
      confidence: number;
      rationale: string[];
      actions: string[];
      risks?: string[];
    }
  | {
      kind: "observation";
      confidence: number;
      signals: string[];
      summary: string;
    }
  | {
      kind: "simulation";
      confidence: number;
      scenario: string;
      projectedOutcome: string;
      uncertainty: number;
    }
  | {
      kind: "veto";
      confidence: number;
      reason: string;
      safetyFlags: string[];
    };

export interface IAgent<
  TInput = unknown,
  TPerception = unknown,
  TContext = TPerception,
  TDecision = AgentDecision,
  TResult = unknown,
> {
  id: string;
  name: string;
  domain: string;
  perceive(input: TInput): Promise<TPerception> | TPerception;
  reason(context: TContext): Promise<TDecision> | TDecision;
  act(decision: TDecision): Promise<TResult> | TResult;
  learn(feedback: unknown): Promise<void> | void;
}

export interface IRuntime {
  id: string;
  name: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  healthCheck(): Promise<HealthStatus> | HealthStatus;
  sendMessage?(message: NexusMessage): Promise<unknown>;
}

export interface RuntimeAgentRun<TResult = unknown> {
  agentId: string;
  agentName: string;
  domain: string;
  result: TResult;
}

export interface RuntimeSynthesis {
  summary: string;
  priorityActions: string[];
  risks: string[];
  disclaimers: string[];
}

export interface RuntimeProcessResult<TResult = unknown> {
  agents: RuntimeAgentRun<TResult>[];
  confidence: number;
  synthesis: RuntimeSynthesis;
}

export interface RuntimeContextEnvelope<TResult = unknown> {
  label: string;
  context: string;
  confidence: number;
  evidence: string[];
  response: RuntimeProcessResult<TResult>;
}

export interface RuntimeLoopSnapshot {
  started: boolean;
  loopCount: number;
  failureCount: number;
  lastRunAt?: number;
  lastError?: string;
}