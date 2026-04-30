/**
 * BiddingModule — the agent's Confidence Oracle.
 *
 * Computes a [0..1] confidence score for an open task by combining:
 *   • cosine similarity between the agent's soul vector and the task vector
 *   • the agent's historical success rate on similar tasks
 *   • current capacity (1.0 idle, 0 saturated)
 *   • a small skill-tag bonus when the task metadata matches the agent's skills
 */

import type { Agent } from "./Agent";
import type { Bid, TaskUnit } from "./types";
import { cosineSimilarity } from "./vectorize";

export interface BiddingOptions {
  /** Bids below this score are dropped silently. */
  threshold: number;
}

export class BiddingModule {
  constructor(
    private readonly agent: Agent,
    private readonly options: BiddingOptions,
  ) {}

  /** Build (and possibly post) a bid for a single task. */
  evaluate(task: TaskUnit): Bid | null {
    const similarity = cosineSimilarity(this.agent.soulVector, task.vector);
    const historicalPerformance = this.agent.performance.successRate;
    const capacity = this.agent.capacityRemaining();
    const bonus = this.skillBonus(task);
    const priority = task.metadata.priority ?? 1;

    // Weighted geometric-ish blend. Skill bonus is additive on top.
    const base =
      similarity * (0.5 + 0.5 * historicalPerformance) * capacity * priority;
    const score = Math.min(1, base + bonus);

    if (score < this.options.threshold) return null;

    return {
      agentId: this.agent.id,
      score,
      breakdown: { similarity, historicalPerformance, capacity, bonus },
      placedAt: Date.now(),
    };
  }

  /** Scan an entire ledger snapshot and emit bids for OPEN tasks. */
  scanAndBid(tasks: TaskUnit[]): Array<{ task: TaskUnit; bid: Bid }> {
    const out: Array<{ task: TaskUnit; bid: Bid }> = [];
    for (const task of tasks) {
      if (task.status !== "OPEN") continue;
      // Skip tasks the agent has already bid on.
      if (task.bids.some((b) => b.agentId === this.agent.id)) continue;
      const bid = this.evaluate(task);
      if (bid) out.push({ task, bid });
    }
    return out;
  }

  private skillBonus(task: TaskUnit): number {
    const tags = task.metadata.tags ?? [];
    if (tags.length === 0) return 0;
    const overlap = tags.filter((t) =>
      this.agent.skillSet.has(t.toLowerCase()),
    ).length;
    return Math.min(0.25, overlap * 0.08);
  }
}
