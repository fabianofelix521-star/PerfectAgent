/**
 * AuctioneerDaemon — closes auctions and assigns winners.
 *
 * Runs on a configurable interval. An auction closes when EITHER:
 *   • its `auctionClosesAt` deadline has passed AND it has at least one bid; OR
 *   • a "fast-track" supermajority: a single bid scored ≥ 0.95.
 *
 * Ties are broken by (a) higher capacity component, then (b) earlier bid.
 */

import type { Agent } from "./Agent";
import type { Bid, RuntimeEvents, TaskUnit } from "./types";

export interface AuctioneerOptions {
  /** Polling interval in ms. Default 100ms. */
  tickMs?: number;
  /** Score above which an auction closes immediately. */
  fastTrackScore?: number;
}

export class AuctioneerDaemon {
  private readonly tickMs: number;
  private readonly fastTrackScore: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private agents: Map<string, Agent> = new Map();
  private events: RuntimeEvents = {};

  constructor(
    private readonly ledger: Map<string, TaskUnit>,
    options: AuctioneerOptions = {},
  ) {
    this.tickMs = options.tickMs ?? 100;
    this.fastTrackScore = options.fastTrackScore ?? 0.95;
  }

  attach(agents: Map<string, Agent>, events: RuntimeEvents): void {
    this.agents = agents;
    this.events = events;
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      try {
        this.resolveAuctions();
      } catch (err) {
        console.error("[Morpheus] AuctioneerDaemon tick failed", err);
      }
    }, this.tickMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** One pass over the ledger. Public for deterministic testing. */
  resolveAuctions(): void {
    const now = Date.now();
    for (const task of this.ledger.values()) {
      if (task.status !== "OPEN") continue;
      if (task.bids.length === 0) continue;

      const top = this.pickWinner(task.bids);
      const fastTrack = top.score >= this.fastTrackScore;
      const expired = now >= task.auctionClosesAt;
      if (!fastTrack && !expired) continue;

      task.status = "ASSIGNED";
      task.assignee = top.agentId;
      task.updatedAt = now;
      this.events.onTaskAssigned?.(task, top);
      this.dispatch(task, top);
    }
  }

  private pickWinner(bids: Bid[]): Bid {
    return bids.reduce((best, b) => {
      if (b.score > best.score) return b;
      if (b.score < best.score) return best;
      if (b.breakdown.capacity > best.breakdown.capacity) return b;
      if (b.placedAt < best.placedAt) return b;
      return best;
    });
  }

  private dispatch(task: TaskUnit, bid: Bid): void {
    const agent = this.agents.get(bid.agentId);
    if (!agent) {
      task.status = "FAILED";
      task.result = {
        success: false,
        error: `Winning agent ${bid.agentId} not registered`,
        durationMs: 0,
        finishedAt: Date.now(),
      };
      task.updatedAt = Date.now();
      this.events.onTaskFailed?.(task);
      return;
    }
    task.status = "IN_PROGRESS";
    task.updatedAt = Date.now();
    void agent.execute(task).then((result) => {
      task.result = result;
      task.status = result.success ? "COMPLETED" : "FAILED";
      task.updatedAt = Date.now();
      if (result.success) this.events.onTaskCompleted?.(task);
      else this.events.onTaskFailed?.(task);
    });
  }
}
