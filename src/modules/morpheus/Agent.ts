/**
 * Agent — a sovereign actor in the Morpheus runtime.
 *
 * Each agent owns a soul vector (its identity), a bidding module (its
 * Confidence Oracle), and a performance ledger (its track record). Agents
 * are stateless about tasks they don't own — the runtime owns the ledger.
 */

import { BiddingModule } from "./BiddingModule";
import { SYSTEM_ACCESS_RUNTIME_RULE } from "@/runtimes/shared/systemAccess";
import type {
  AgentDefinition,
  AgentExecutor,
  AgentPerformance,
  TaskResult,
  TaskUnit,
  Vector,
} from "./types";
import { vectorize } from "./vectorize";

const DEFAULT_CAPACITY = 3;
const DEFAULT_THRESHOLD = 0.5;
const DEFAULT_PRIOR = 0.7;
const PERFORMANCE_DECAY = 0.85;
const PANTHEON_SYSTEM_SKILLS = [
  "web-search",
  "system-access",
  "filesystem",
  "shell",
  "brew",
  "sudo",
  "curl",
  "ssh-deploy",
];

export class Agent {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly soulPrompt: string;
  readonly soulVector: Vector;
  readonly skills: string[];
  readonly skillSet: Set<string>;
  readonly maxCapacity: number;

  readonly bidding: BiddingModule;
  performance: AgentPerformance;

  private executor: AgentExecutor | null = null;
  private inflight = 0;

  constructor(def: AgentDefinition) {
    this.id = def.id;
    this.name = def.name;
    this.role = def.role;
    this.soulPrompt = `${def.soulPrompt}\n\n${SYSTEM_ACCESS_RUNTIME_RULE}`;
    this.skills = [...new Set([...def.skills, ...PANTHEON_SYSTEM_SKILLS])];
    this.skillSet = new Set(def.skills.map((s) => s.toLowerCase()));
    this.maxCapacity = def.capacity ?? DEFAULT_CAPACITY;

    this.soulVector = vectorize(`${def.role}. ${def.soulPrompt}`, def.skills);
    this.bidding = new BiddingModule(this, {
      threshold: def.bidThreshold ?? DEFAULT_THRESHOLD,
    });
    this.performance = {
      attempted: 0,
      succeeded: 0,
      failed: 0,
      averageDurationMs: 0,
      successRate: def.prior ?? DEFAULT_PRIOR,
    };
  }

  /** Register the function that runs when this agent wins a task. */
  withExecutor(fn: AgentExecutor): this {
    this.executor = fn;
    return this;
  }

  capacityRemaining(): number {
    if (this.maxCapacity <= 0) return 0;
    return Math.max(0, 1 - this.inflight / this.maxCapacity);
  }

  /** Invoked by the runtime after winning an auction. */
  async execute(task: TaskUnit): Promise<TaskResult> {
    this.inflight++;
    const startedAt = Date.now();
    try {
      const output = this.executor
        ? await this.executor(task)
        : await this.defaultExecutor(task);
      const result: TaskResult = {
        success: true,
        output,
        durationMs: Date.now() - startedAt,
        finishedAt: Date.now(),
      };
      this.recordOutcome(true, result.durationMs);
      return result;
    } catch (err) {
      const result: TaskResult = {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startedAt,
        finishedAt: Date.now(),
      };
      this.recordOutcome(false, result.durationMs);
      return result;
    } finally {
      this.inflight = Math.max(0, this.inflight - 1);
    }
  }

  private async defaultExecutor(task: TaskUnit): Promise<unknown> {
    // Stub — real agents replace this via withExecutor.
    return {
      agent: this.id,
      acknowledged: task.id,
      role: this.role,
    };
  }

  private recordOutcome(success: boolean, durationMs: number): void {
    const p = this.performance;
    p.attempted++;
    if (success) p.succeeded++;
    else p.failed++;
    p.averageDurationMs =
      p.averageDurationMs === 0
        ? durationMs
        : Math.round(p.averageDurationMs * 0.7 + durationMs * 0.3);
    // EWMA on success rate.
    const sample = success ? 1 : 0;
    p.successRate =
      PERFORMANCE_DECAY * p.successRate + (1 - PERFORMANCE_DECAY) * sample;
  }
}
