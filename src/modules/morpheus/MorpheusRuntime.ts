/**
 * MorpheusRuntime — orchestrates agents and the task hyperledger.
 *
 * Workflow:
 *   1. Caller posts a task via {@link postNewTask}.
 *   2. Each registered agent's BiddingModule is given a chance to bid.
 *   3. The {@link AuctioneerDaemon} polls the ledger and assigns winners.
 *   4. The winning agent's executor runs; result is stored on the task.
 */

import { Agent } from "./Agent";
import { AuctioneerDaemon, type AuctioneerOptions } from "./AuctioneerDaemon";
import type {
  AgentDefinition,
  Bid,
  RuntimeEvents,
  TaskMetadata,
  TaskResult,
  TaskUnit,
} from "./types";
import { vectorize } from "./vectorize";

let __taskCounter = 0;
const nextTaskId = (): string =>
  `tsk_${Date.now().toString(36)}_${(++__taskCounter).toString(36)}`;

export interface RuntimeOptions extends AuctioneerOptions {
  /** Default auction window in ms before a task can close on time. */
  defaultAuctionWindowMs?: number;
  /** Bidding wave delay between agents (jitter to mimic async). */
  bidJitterMs?: number;
}

export interface PostTaskOptions extends TaskMetadata {
  /** Override the auction window for this task only. */
  auctionWindowMs?: number;
}

const DEFAULT_AUCTION_WINDOW = 250;

export class MorpheusRuntime {
  readonly ledger: Map<string, TaskUnit> = new Map();
  readonly agents: Map<string, Agent> = new Map();
  readonly auctioneer: AuctioneerDaemon;

  private readonly events: RuntimeEvents = {};
  private readonly defaultWindow: number;
  private readonly bidJitter: number;
  private running = false;

  constructor(
    agents: Array<Agent | AgentDefinition> = [],
    options: RuntimeOptions = {},
  ) {
    this.defaultWindow =
      options.defaultAuctionWindowMs ?? DEFAULT_AUCTION_WINDOW;
    this.bidJitter = options.bidJitterMs ?? 5;
    this.auctioneer = new AuctioneerDaemon(this.ledger, options);
    for (const a of agents) this.registerAgent(a);
    this.auctioneer.attach(this.agents, this.events);
  }

  /** Register or replace an agent. Definitions are wrapped automatically. */
  registerAgent(agent: Agent | AgentDefinition): Agent {
    const a = agent instanceof Agent ? agent : new Agent(agent);
    this.agents.set(a.id, a);
    this.auctioneer.attach(this.agents, this.events);
    return a;
  }

  /** Subscribe to lifecycle events. Returns an unsubscribe closure. */
  on(handlers: RuntimeEvents): () => void {
    Object.assign(this.events, handlers);
    return () => {
      for (const key of Object.keys(handlers) as Array<keyof RuntimeEvents>) {
        delete this.events[key];
      }
    };
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.auctioneer.start();
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    this.auctioneer.stop();
  }

  /** Post a new task and trigger one bidding wave across all agents. */
  postNewTask(description: string, metadata: PostTaskOptions = {}): TaskUnit {
    const now = Date.now();
    const window = metadata.auctionWindowMs ?? this.defaultWindow;
    const task: TaskUnit = {
      id: nextTaskId(),
      description,
      metadata: {
        tags: metadata.tags,
        priority: metadata.priority,
        deadline: metadata.deadline,
        payload: metadata.payload,
      },
      vector: vectorize(description, metadata.tags ?? []),
      status: "OPEN",
      bids: [],
      assignee: null,
      result: null,
      createdAt: now,
      auctionClosesAt: now + window,
      updatedAt: now,
    };
    this.ledger.set(task.id, task);
    this.events.onTaskPosted?.(task);
    this.runBiddingWave(task);
    return task;
  }

  /** Convenience: post a task and resolve once it's COMPLETED or FAILED. */
  async runTask(
    description: string,
    metadata: PostTaskOptions = {},
  ): Promise<TaskResult> {
    const task = this.postNewTask(description, metadata);
    return this.awaitCompletion(task.id);
  }

  /** Block until the given task reaches a terminal state. */
  awaitCompletion(taskId: string): Promise<TaskResult> {
    return new Promise((resolve, reject) => {
      const tick = () => {
        const t = this.ledger.get(taskId);
        if (!t) {
          reject(new Error(`Unknown task ${taskId}`));
          return;
        }
        if (
          t.status === "COMPLETED" ||
          t.status === "FAILED" ||
          t.status === "CANCELLED"
        ) {
          if (t.result) resolve(t.result);
          else reject(new Error(`Task ${taskId} ended without result`));
          return;
        }
        setTimeout(tick, 25);
      };
      tick();
    });
  }

  /** Cancel an open or in-progress task. */
  cancelTask(taskId: string): void {
    const t = this.ledger.get(taskId);
    if (!t || t.status === "COMPLETED" || t.status === "FAILED") return;
    t.status = "CANCELLED";
    t.updatedAt = Date.now();
  }

  /** Force a manual auction resolution pass (useful in tests). */
  tick(): void {
    this.auctioneer.resolveAuctions();
  }

  /** Bidding wave: every agent gets a chance, with tiny async jitter. */
  private runBiddingWave(task: TaskUnit): void {
    const agents = [...this.agents.values()];
    agents.forEach((agent, idx) => {
      const placeBid = () => {
        if (task.status !== "OPEN") return;
        const bid = agent.bidding.evaluate(task);
        if (!bid) return;
        // Concurrency-safe-ish: skip if a duplicate slipped in.
        if (task.bids.some((b) => b.agentId === bid.agentId)) return;
        task.bids.push(bid);
        this.events.onBidPlaced?.(task, bid);
      };
      if (this.bidJitter <= 0) {
        placeBid();
      } else {
        // Stagger so agents bid in slightly different microticks.
        setTimeout(
          placeBid,
          idx * this.bidJitter + Math.random() * this.bidJitter,
        );
      }
    });
  }

  // -- Diagnostics ----------------------------------------------------------

  listOpenTasks(): TaskUnit[] {
    return [...this.ledger.values()].filter((t) => t.status === "OPEN");
  }

  listAgentBids(agentId: string): Bid[] {
    const out: Bid[] = [];
    for (const t of this.ledger.values()) {
      for (const b of t.bids) if (b.agentId === agentId) out.push(b);
    }
    return out;
  }

  getTask(id: string): TaskUnit | undefined {
    return this.ledger.get(id);
  }
}
