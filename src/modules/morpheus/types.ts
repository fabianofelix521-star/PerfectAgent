/**
 * Morpheus Runtime — public types.
 *
 * A decentralised, auction-based multi-agent runtime. Every task posted on
 * the Hyperledger is auctioned to the agent with the highest confidence
 * score. Agents bid asynchronously through their {@link BiddingModule}.
 */

/** Numeric embedding (unit-normalised) used for similarity scoring. */
export type Vector = Float32Array;

/** Lifecycle of a task on the hyperledger. */
export type TaskStatus =
  | "OPEN"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

/** Free-form metadata attached to a task. */
export interface TaskMetadata {
  /** Hard skill tags ("typescript", "security", "design"). */
  tags?: string[];
  /** Optional priority 0..1 — multiplies winning bid scores. */
  priority?: number;
  /** Soft deadline in epoch ms. */
  deadline?: number;
  /** Free-form payload forwarded to the executing agent. */
  payload?: unknown;
}

/** A single bid placed by an agent for an open task. */
export interface Bid {
  agentId: string;
  score: number;
  /** Score components for transparency / auditing. */
  breakdown: {
    similarity: number;
    historicalPerformance: number;
    capacity: number;
    bonus: number;
  };
  placedAt: number;
}

/** A unit of work on the hyperledger. */
export interface TaskUnit {
  id: string;
  description: string;
  metadata: TaskMetadata;
  vector: Vector;
  status: TaskStatus;
  bids: Bid[];
  assignee: string | null;
  result: TaskResult | null;
  createdAt: number;
  /** Epoch ms when the auction window closes. */
  auctionClosesAt: number;
  updatedAt: number;
}

/** Outcome of executing a task. */
export interface TaskResult {
  success: boolean;
  output?: unknown;
  error?: string;
  durationMs: number;
  finishedAt: number;
}

/** Snapshot of agent performance used to modulate bids. */
export interface AgentPerformance {
  attempted: number;
  succeeded: number;
  failed: number;
  averageDurationMs: number;
  /** Exponentially-weighted success rate in [0..1]. */
  successRate: number;
}

/** Definition needed to instantiate an Agent. */
export interface AgentDefinition {
  id: string;
  name: string;
  /** One-line role description shown in logs / UIs. */
  role: string;
  /** The "soul" — what this agent IS, in natural language. */
  soulPrompt: string;
  /** Hard skill tags this agent excels at. */
  skills: string[];
  /** Maximum concurrent tasks this agent will accept. */
  capacity?: number;
  /** Bid threshold — bids below this are silently dropped. */
  bidThreshold?: number;
  /** Static prior in [0..1] applied before any history exists. */
  prior?: number;
}

/** Events emitted by the runtime. */
export interface RuntimeEvents {
  onTaskPosted?: (task: TaskUnit) => void;
  onBidPlaced?: (task: TaskUnit, bid: Bid) => void;
  onTaskAssigned?: (task: TaskUnit, winner: Bid) => void;
  onTaskCompleted?: (task: TaskUnit) => void;
  onTaskFailed?: (task: TaskUnit) => void;
}

/**
 * An agent's executor — the unit that actually runs the work after winning.
 * Returning a rejected promise marks the task as FAILED.
 */
export type AgentExecutor = (task: TaskUnit) => Promise<unknown>;
