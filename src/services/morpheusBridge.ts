/**
 * Morpheus Bridge — Pantheon as a router for Code Studio.
 *
 * Earlier versions of this bridge attached an LLM-backed executor to every
 * agent and started a SECOND streamChat on each user prompt. That caused two
 * concurrent SSE connections per request: when the browser closed one (the
 * Pantheon stream finished first) it cancelled the other via the backend's
 * `req.on("close")` handler, surfacing as "This operation was aborted" in
 * the chat. We also paid for double tokens.
 *
 * The new design is purely advisory:
 *   1. Post the user's prompt as a Morpheus task.
 *   2. Let the auctioneer pick a winner using the existing bidding heuristic.
 *   3. Hand the winner's `soulPrompt` back so `runAgentLoop` can use it as
 *      additional system context (single LLM call, no parallel stream).
 *   4. The auctioneer's stub executor resolves immediately so the ledger and
 *      live MorpheusPanel still react to every prompt.
 */

import { getMorpheus } from "@/services/morpheus";
import type { Agent, TaskUnit } from "@/modules/morpheus";

/* ---------------------------------------------------------------- helpers */

/** Heuristic tag extraction so the bidding module can route the task. */
export function extractTags(text: string): string[] {
  const lower = text.toLowerCase();
  const buckets: Array<[string, RegExp]> = [
    [
      "security",
      /\b(security|vuln|exploit|cve|owasp|csrf|xss|injection|auth)\b/,
    ],
    ["test", /\b(test|spec|jest|vitest|cypress|coverage|tdd)\b/],
    ["refactor", /\b(refactor|cleanup|tidy|restructure|rename|extract)\b/],
    ["debug", /\b(debug|bug|fix|error|crash|stack ?trace|broken)\b/],
    ["performance", /\b(perf|performance|optimi[sz]e|slow|fast|bench)\b/],
    ["ui", /\b(ui|ux|design|layout|component|button|page|landing)\b/],
    ["api", /\b(api|rest|graphql|endpoint|route|server)\b/],
    ["data", /\b(data|database|sql|query|schema|model|table)\b/],
    ["devops", /\b(deploy|ci|cd|pipeline|docker|k8s|kubernetes|infra)\b/],
    ["architecture", /\b(architect|architecture|system|module|design)\b/],
    ["docs", /\b(docs|documentation|readme|guide|manual)\b/],
    ["frontend", /\b(react|vue|svelte|next|frontend|tailwind|css)\b/],
    ["backend", /\b(node|express|fastify|backend|server|nest)\b/],
    ["3d", /\b(3d|three|webgl|fiber|drei)\b/],
    ["game", /\b(game|jogo|snake|cobrinha|tetris|pong|arcade|player|score)\b/],
    ["ai", /\b(ai|llm|prompt|agent|inference|model)\b/],
  ];
  const tags = new Set<string>();
  for (const [tag, rx] of buckets) if (rx.test(lower)) tags.add(tag);
  if (tags.size === 0) tags.add("general");
  return [...tags];
}

/* ---------------------------------------------------------------- public */

export interface DispatchEvent {
  kind: "posted" | "assigned" | "completed" | "failed";
  task: TaskUnit;
  agentName?: string;
  agentId?: string;
}

export interface DispatchResult {
  task: TaskUnit;
  winner: Agent | null;
}

/**
 * Post a task to the Pantheon and wait for the auctioneer to assign a winner.
 * Resolves with the winning agent (or null if no agent bid within timeoutMs).
 *
 * NO LLM work happens here — this only routes. Caller is expected to use the
 * returned agent's soulPrompt as additional system context for its own
 * (single) streamChat invocation.
 */
export function dispatchToPantheon(
  description: string,
  opts: {
    tags?: string[];
    priority?: number;
    timeoutMs?: number;
    onEvent?: (ev: DispatchEvent) => void;
  } = {},
): Promise<DispatchResult> {
  const morpheus = getMorpheus();
  const tags = opts.tags ?? extractTags(description);
  const priority = opts.priority ?? 0.85;
  const timeoutMs = opts.timeoutMs ?? 1500;
  const onEvent = opts.onEvent ?? (() => {});

  return new Promise<DispatchResult>((resolve) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let unsub: () => void = () => {};

    const finish = (winner: Agent | null, task: TaskUnit) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      unsub();
      resolve({ task, winner });
    };

    const task = morpheus.postNewTask(description, {
      tags,
      priority,
      auctionWindowMs: 200,
    });
    onEvent({ kind: "posted", task });

    unsub = morpheus.on({
      onTaskAssigned: (t, bid) => {
        if (t.id !== task.id) return;
        const winner = morpheus.agents.get(bid.agentId) ?? null;
        onEvent({
          kind: "assigned",
          task: t,
          agentName: winner?.name,
          agentId: bid.agentId,
        });
        finish(winner, t);
      },
      onTaskCompleted: (t) => {
        if (t.id !== task.id) return;
        onEvent({ kind: "completed", task: t });
      },
      onTaskFailed: (t) => {
        if (t.id !== task.id) return;
        onEvent({ kind: "failed", task: t });
        finish(null, t);
      },
    });

    timer = setTimeout(() => finish(null, task), timeoutMs);
  });
}

/** Build a system-prompt addition from a winning agent. */
export function pantheonContextFor(agent: Agent | null): string | undefined {
  if (!agent) return undefined;
  const skills = agent.skills.slice(0, 6).join(", ");
  return [
    `# Pantheon Brief — ${agent.name} (${agent.role})`,
    agent.soulPrompt,
    `Special strengths: ${skills}.`,
    `Channel this persona while solving the user's request.`,
  ].join("\n\n");
}
