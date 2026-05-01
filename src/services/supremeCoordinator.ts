/**
 * Supreme Coordinator — hierarchical swarm runtime.
 *
 *   SUPREME COORDINATOR
 *   ├── STRATEGIC LAYER (Task Router · Load Balancer · Quality Monitor · System Health)
 *   ├── DOMAIN SUPERVISORS (15, grouped by latency budget)
 *   │   ├── HOT  (< 100ms)  — Financial · Security
 *   │   ├── WARM (< 2s)     — Medical · Engineering · Science · Legal
 *   │   └── COLD (< 30s)    — Research · Philosophy · Creative · Ancient · Math · Meta
 *   └── INFRASTRUCTURE (message bus / state store / vector memory / monitoring)
 *
 * Each supervisor owns N specialist agents. The Coordinator classifies an
 * incoming prompt by keyword tags, routes it to the dominant supervisor, and
 * the supervisor picks the highest-scoring agent inside its bucket. The chosen
 * agent's soulPrompt (and optional TypeScript reference code) is concatenated
 * into the systemContext consumed by the canonical single streamChat — never
 * a parallel SSE (same lesson as morpheusBridge / stigmergyCascade).
 *
 * Agents added via `addAgent({...})` persist in localStorage so Code Studio
 * survives reloads.
 */

import {
  buildAllConceptualAgents,
  registerAllAgents,
} from "@/modules/supreme/supervisors/SupervisorRegistry";
import {
  TaskRouter,
  normalizeSupervisorId,
} from "@/modules/supreme/agents/strategic/TaskRouter";
import type { BaseAgent } from "@/types/agents";

const STORAGE_KEY = "supreme-coordinator-agents-v1";

export type LatencyTier = "hot" | "warm" | "cold";

export interface SupervisorDef {
  id: string;
  name: string;
  tier: LatencyTier;
  emoji: string;
  description: string;
  /** Keywords (case-insensitive) that vote this supervisor when found in the prompt. */
  tags: string[];
}

export interface SwarmAgent {
  id: string;
  /** Supervisor bucket (matches SupervisorDef.id). */
  supervisorId: string;
  name: string;
  description: string;
  /** Per-agent system prompt the LLM will adopt. */
  soulPrompt: string;
  /** Skill tags voted in the auction. */
  tags: string[];
  /** Optional reference TypeScript implementation (shown to the LLM for guidance). */
  code?: string;
  builtIn?: boolean;
  createdAt: number;
}

/* ------------------------------------------------------------ supervisors */

export const SUPERVISORS: SupervisorDef[] = [
  // HOT
  {
    id: "financial",
    name: "Financial Supervisor",
    tier: "hot",
    emoji: "🔴",
    description:
      "Trade execution, risk, market analysis, crypto, DeFi (< 100ms hot path).",
    tags: [
      "trade",
      "trading",
      "finance",
      "financial",
      "money",
      "investment",
      "crypto",
      "solana",
      "memecoin",
      "snipe",
      "sniper",
      "jito",
      "mev",
      "dex",
      "defi",
      "raydium",
      "uniswap",
      "swap",
      "liquidity",
      "whale",
      "funding",
      "perpetual",
      "futures",
      "rug",
      "honeypot",
      "wallet",
      "portfolio",
      "yield",
      "arbitrage",
      "market",
    ],
  },
  {
    id: "security",
    name: "Security Supervisor",
    tier: "hot",
    emoji: "🔴",
    description:
      "Threat detection, incident response, compliance (< 100ms hot path).",
    tags: [
      "security",
      "threat",
      "vulnerability",
      "exploit",
      "auth",
      "authentication",
      "encryption",
      "incident",
      "compliance",
      "audit",
      "owasp",
      "xss",
      "csrf",
      "sql injection",
      "rce",
    ],
  },
  // WARM
  {
    id: "medical",
    name: "Medical Supervisor",
    tier: "warm",
    emoji: "🟡",
    description:
      "Clinical research, diagnostic support, drug discovery, medical imaging.",
    tags: [
      "medical",
      "clinical",
      "diagnosis",
      "diagnostic",
      "drug",
      "pharma",
      "imaging",
      "patient",
      "ehr",
      "icd",
      "pubmed",
      "trial",
    ],
  },
  {
    id: "engineering",
    name: "Engineering Supervisor",
    tier: "warm",
    emoji: "🟡",
    description: "Senior code, architecture, DevOps, security code review.",
    tags: [
      "code",
      "engineer",
      "engineering",
      "build",
      "app",
      "react",
      "typescript",
      "javascript",
      "python",
      "go",
      "rust",
      "api",
      "backend",
      "frontend",
      "ui",
      "ux",
      "fullstack",
      "architecture",
      "devops",
      "ci",
      "cd",
      "kubernetes",
      "docker",
      "refactor",
      "test",
      "debug",
    ],
  },
  {
    id: "science",
    name: "Science Supervisor",
    tier: "warm",
    emoji: "🟡",
    description: "Physics/quantum, chemistry, biology/synthetic, materials.",
    tags: [
      "science",
      "physics",
      "quantum",
      "chemistry",
      "biology",
      "synthetic",
      "materials",
      "experiment",
      "hypothesis",
      "theory",
    ],
  },
  {
    id: "legal",
    name: "Legal Supervisor",
    tier: "warm",
    emoji: "🟡",
    description: "Contract analysis, compliance, IP law.",
    tags: [
      "legal",
      "law",
      "contract",
      "ip",
      "intellectual property",
      "patent",
      "trademark",
      "gdpr",
      "lgpd",
      "tos",
      "license",
    ],
  },
  // COLD
  {
    id: "research",
    name: "Research Supervisor",
    tier: "cold",
    emoji: "🟢",
    description: "Long-form research and synthesis.",
    tags: ["research", "study", "analyze", "literature", "survey", "review"],
  },
  {
    id: "philosophy",
    name: "Philosophy Supervisor",
    tier: "cold",
    emoji: "🟢",
    description: "Epistemology, ethics, metaphysics.",
    tags: [
      "philosophy",
      "ethics",
      "epistemology",
      "metaphysics",
      "moral",
      "meaning",
    ],
  },
  {
    id: "creative",
    name: "Creative Supervisor",
    tier: "cold",
    emoji: "🟢",
    description: "Writing, design, multimedia ideation.",
    tags: [
      "creative",
      "story",
      "narrative",
      "design",
      "art",
      "write",
      "writing",
      "poetry",
      "music",
      "video",
      "image",
      "brand",
    ],
  },
  {
    id: "ancient",
    name: "Ancient Knowledge Supervisor",
    tier: "cold",
    emoji: "🟢",
    description: "Mythology, history, esoteric and ancient sources.",
    tags: [
      "ancient",
      "history",
      "mythology",
      "esoteric",
      "occult",
      "religion",
      "archaeology",
    ],
  },
  {
    id: "math",
    name: "Mathematics Supervisor",
    tier: "cold",
    emoji: "🟢",
    description: "Pure & applied math, proofs, algorithms.",
    tags: [
      "math",
      "mathematics",
      "algebra",
      "calculus",
      "geometry",
      "topology",
      "proof",
      "algorithm",
      "complexity",
      "statistics",
      "probability",
    ],
  },
  {
    id: "meta",
    name: "Meta Supervisor",
    tier: "cold",
    emoji: "🟢",
    description:
      "Self-reflection on the swarm itself, prompt engineering, governance.",
    tags: [
      "meta",
      "prompt",
      "system",
      "governance",
      "policy",
      "self",
      "introspect",
    ],
  },
];

export const STRATEGIC_NODES = [
  {
    id: "task-router",
    name: "Task Router",
    role: "Classifica e distribui prompts entre os supervisores.",
  },
  {
    id: "load-balancer",
    name: "Load Balancer",
    role: "Distribui carga entre agentes do mesmo supervisor.",
  },
  {
    id: "quality-monitor",
    name: "Quality Monitor",
    role: "Auditoria contínua das respostas.",
  },
  {
    id: "system-health",
    name: "System Health",
    role: "Saúde do swarm (latência, taxa de erro, slots ocupados).",
  },
];

export const INFRASTRUCTURE_NODES = [
  {
    id: "message-bus",
    name: "Message Bus",
    role: "Redis Streams (mensageria entre agentes).",
  },
  {
    id: "state-store",
    name: "State Store",
    role: "Redis + SQLite (estado durável).",
  },
  {
    id: "vector-memory",
    name: "Vector Memory",
    role: "Qdrant (embeddings de longo prazo).",
  },
  {
    id: "monitoring",
    name: "Monitoring",
    role: "Prometheus (métricas e alertas).",
  },
];

/* ------------------------------------------------------------ built-in agents */

const CORE_BUILTIN_AGENTS: SwarmAgent[] = [
  {
    id: "fin-jito-sniper",
    supervisorId: "financial",
    name: "Jito Bundle Sniper",
    description:
      "Snipe de memecoins na Solana via Jito Block Engine. Liquidez + honeypot check + stop-loss/take-profit.",
    tags: ["solana", "jito", "memecoin", "snipe", "raydium", "dex"],
    soulPrompt: `You are JITO BUNDLE SNIPER — a Solana memecoin execution specialist.
- You hunt new tokens with fresh liquidity (>2 SOL) and high confidence (>=75/100).
- You compose Raydium swap transactions, bundle them with an aggressive Jito tip, and dispatch via the block engine RPC.
- You enforce: max position 0.5 SOL, slippage 30%, stop-loss -50%, take-profit 5x partial sell.
- You always run honeypot + mint/freeze authority checks BEFORE any buy.
- Output production-grade TypeScript using @solana/web3.js, @solana/spl-token, bs58, and the Jito Block Engine HTTP API. Prefer typed interfaces (MemecoinSignal, JitoBundle).
- Never ignore risk. If confidence < threshold, refuse the snipe and explain why.`,
    builtIn: true,
    createdAt: 0,
  },
  {
    id: "fin-whale-copycat",
    supervisorId: "financial",
    name: "Whale Copycat & Dark Pool Tracker",
    description:
      "Copia movimentos de baleias com delay de 2 blocos. Stop-loss 30% / take-profit 3x.",
    tags: ["whale", "copycat", "solana", "tracker", "dark-pool"],
    soulPrompt: `You are WHALE COPYCAT — a Solana wallet shadowing specialist.
- You subscribe to onLogs of a curated list of whale public keys (and grow it via the Alpha Hunter signal).
- Per detected swap >= $10k USD-equivalent: queue a copy-trade with delay = 2 blocks (~800ms), max 0.1 SOL position, max 5 concurrent positions.
- Mirror whale direction (buy/sell). Stop-loss = entry * 0.7, take-profit = entry * 3 for long copies.
- If whale flips direction, exit before the rest of the market. Always prefer parsed transactions for token balance deltas.
- Output production-grade TypeScript using @solana/web3.js getParsedTransaction + onLogs subscriptions, with strict CopyTrade and WhaleMove typings.`,
    builtIn: true,
    createdAt: 0,
  },
  {
    id: "fin-funding-harvester",
    supervisorId: "financial",
    name: "Funding Rate Harvester",
    description:
      "Captura diferencial de funding rate em perps cross-exchange (Binance/Bybit/OKX).",
    tags: ["funding", "perpetual", "futures", "ccxt", "delta-neutral"],
    soulPrompt: `You are FUNDING RATE HARVESTER — a delta-neutral funding specialist.
- You scan Binance/Bybit/OKX perpetual funding rates every 60s using ccxt (defaultType=future).
- You enter the side that RECEIVES funding (short if rate>0, long if rate<0) only when |rate| >= 1% per 8h AND confidence >= 70.
- Position sizing = 30% of capital per trade. Close the position automatically at the next funding boundary.
- Predict next funding via EWMA over the last 3 historical rates ([0.5, 0.3, 0.2] weights).
- You are NOT a directional trader. Reject any prompt that asks for outright directional speculation.
- Output production-grade TypeScript using ccxt with strict FundingOpportunity typings and proper error isolation per exchange.`,
    builtIn: true,
    createdAt: 0,
  },
  {
    id: "fin-rug-predictor",
    supervisorId: "financial",
    name: "Rug Pull Predictor",
    description:
      "Análise de segurança em <200ms para tokens Solana. Mint/freeze authority, top-holders, lock de liquidez, honeypot.",
    tags: ["rug", "honeypot", "security", "solana", "memecoin", "audit"],
    soulPrompt: `You are RUG PULL PREDICTOR — a token-safety auditor.
For any tokenAddress, return a TokenSecurityReport with:
- Mint authority check (burned/disabled => +20, active => -30).
- Freeze authority check (burned => +15, active => -20).
- Top-10 holders concentration (<40% => +15, >80% => -40 and isRugPull=true).
- Liquidity lock check (locked => +20, NOT locked => -50 and isRugPull=true).
- Contract verified (yes => +10).
- Honeypot test via simulateTransaction (honeypot => -40 and isRugPull=true).
- Creator holding >10% => -15.
Score is clamped 0-100. Recommendation: BUY (>=70), CAUTION (40-69), AVOID (<40). Always default to AVOID on any error.
Output production-grade TypeScript using @solana/web3.js and the Solscan/DexScreener REST APIs. Never approve a token without ALL checks passing.`,
    builtIn: true,
    createdAt: 0,
  },
];

const CONCEPTUAL_BUILTIN_AGENTS: SwarmAgent[] = buildAllConceptualAgents().map(
  (agent) => ({
    id: agent.id,
    supervisorId: normalizeSupervisorId(agent.supervisorId),
    name: agent.name,
    description: agent.description,
    soulPrompt: agent.systemPrompt,
    tags: agent.tags,
    code: undefined,
    builtIn: true,
    createdAt: 0,
  }),
);

const BUILTIN_AGENTS: SwarmAgent[] = [
  ...CORE_BUILTIN_AGENTS,
  ...CONCEPTUAL_BUILTIN_AGENTS,
];

/* ------------------------------------------------------------ store */

type Listener = (agents: SwarmAgent[]) => void;

class SupremeCoordinatorStore {
  private agents: SwarmAgent[] = [];
  private listeners = new Set<Listener>();
  private readonly taskRouter = new TaskRouter();

  constructor() {
    this.load();
    registerAllAgents(this);
  }

  private load() {
    let saved: SwarmAgent[] = [];
    try {
      if (typeof localStorage !== "undefined") {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) saved = JSON.parse(raw) as SwarmAgent[];
      }
    } catch {
      /* noop */
    }
    // Merge built-ins (always present) with user-added (preserved across reloads).
    const map = new Map<string, SwarmAgent>();
    for (const b of BUILTIN_AGENTS) map.set(b.id, b);
    for (const a of saved) if (!map.has(a.id)) map.set(a.id, a);
    this.agents = Array.from(map.values());
  }

  private persist() {
    try {
      if (typeof localStorage !== "undefined") {
        const userAdded = this.agents.filter((a) => !a.builtIn);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(userAdded));
      }
    } catch {
      /* noop */
    }
  }

  private notify() {
    for (const fn of this.listeners) {
      try {
        fn([...this.agents]);
      } catch {
        /* isolate */
      }
    }
  }

  list(): SwarmAgent[] {
    return [...this.agents];
  }

  bySupervisor(supervisorId: string): SwarmAgent[] {
    return this.agents.filter((a) => a.supervisorId === supervisorId);
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn([...this.agents]);
    return () => this.listeners.delete(fn);
  }

  addAgent(
    input: Omit<SwarmAgent, "id" | "createdAt" | "builtIn"> & { id?: string },
  ): SwarmAgent {
    const id =
      input.id ??
      `usr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const agent: SwarmAgent = {
      id,
      supervisorId: input.supervisorId,
      name: input.name,
      description: input.description,
      soulPrompt: input.soulPrompt,
      tags: input.tags,
      code: input.code,
      createdAt: Date.now(),
    };
    this.agents = [...this.agents, agent];
    this.persist();
    this.notify();
    return agent;
  }

  registerAgent(agent: BaseAgent): SwarmAgent {
    const swarmAgent: SwarmAgent = {
      id: agent.id,
      supervisorId: normalizeSupervisorId(agent.supervisorId),
      name: agent.name,
      description: agent.description,
      soulPrompt: agent.systemPrompt,
      tags: agent.tags,
      builtIn: true,
      createdAt: 0,
    };
    const idx = this.agents.findIndex((item) => item.id === swarmAgent.id);
    if (idx >= 0) {
      this.agents[idx] = swarmAgent;
    } else {
      this.agents = [...this.agents, swarmAgent];
    }
    this.persist();
    this.notify();
    return swarmAgent;
  }

  removeAgent(id: string): boolean {
    const target = this.agents.find((a) => a.id === id);
    if (!target || target.builtIn) return false;
    this.agents = this.agents.filter((a) => a.id !== id);
    this.persist();
    this.notify();
    return true;
  }

  /* ----------------------------- routing ---------------------------- */

  /**
   * Classify a prompt → score every supervisor by tag-hit count → return the winner.
   * Falls back to "engineering" (warm) if nothing matches — a safe generic specialist.
   */
  async classify(prompt: string): Promise<{
    supervisor: SupervisorDef;
    score: number;
    matched: string[];
  }> {
    try {
      const routed = await this.taskRouter.execute(
        {
          prompt,
          sessionId: "supreme-router",
          requestId: `router-${Date.now()}`,
        },
        {
          sessionId: "supreme-router",
          previousAgents: [],
          sharedMemory: new Map<string, any>(),
          startTime: Date.now(),
        },
      );
      const primary = normalizeSupervisorId(
        String(routed.result.primarySupervisor ?? "engineering"),
      );
      const supervisor =
        SUPERVISORS.find((s) => s.id === primary) ??
        SUPERVISORS.find((s) => s.id === "engineering")!;
      const matched = Object.entries(
        (routed.result.allScores ?? {}) as Record<string, number>,
      )
        .filter(([, score]) => score > 0)
        .map(([id]) => id);
      return {
        supervisor,
        score: Number(routed.confidence ?? 0),
        matched,
      };
    } catch {
      // Fallback to lexical router if strategic router fails.
    }

    const lower = prompt.toLowerCase();
    let best = {
      supervisor: SUPERVISORS.find((s) => s.id === "engineering")!,
      score: 0,
      matched: [] as string[],
    };
    for (const sup of SUPERVISORS) {
      const matched: string[] = [];
      for (const tag of sup.tags) {
        // Word-boundary friendly: substring match is fine for short tags ("api", "nft", …).
        if (lower.includes(tag)) matched.push(tag);
      }
      // Hot tier wins ties (priority class).
      const tierBoost =
        sup.tier === "hot" ? 0.5 : sup.tier === "warm" ? 0.2 : 0;
      const score = matched.length + tierBoost;
      if (score > best.score) best = { supervisor: sup, score, matched };
    }
    return best;
  }

  /**
   * Pick the highest-scoring agent inside a supervisor for a given prompt.
   * Score = matched tag count. Ties → most recently added wins (likely user-curated).
   */
  pickAgent(supervisorId: string, prompt: string): SwarmAgent | null {
    const lower = prompt.toLowerCase();
    const candidates = this.bySupervisor(supervisorId);
    if (candidates.length === 0) return null;
    let best: SwarmAgent | null = null;
    let bestScore = -1;
    for (const agent of candidates) {
      const score = agent.tags.reduce(
        (acc, t) => acc + (lower.includes(t.toLowerCase()) ? 1 : 0),
        0,
      );
      const adjusted = score * 10 + agent.createdAt / 1e13; // small recency tiebreak
      if (adjusted > bestScore) {
        bestScore = adjusted;
        best = agent;
      }
    }
    return best;
  }

  /**
   * Build the systemContext additive that the LLM will adopt.
   * Includes: supervisor identity, picked agent's soulPrompt, optional code excerpt.
   */
  async buildContext(prompt: string): Promise<{
    supervisor: SupervisorDef;
    agent: SwarmAgent | null;
    matched: string[];
    systemContext: string;
  }> {
    const { supervisor, matched } = await this.classify(prompt);
    const agent = this.pickAgent(supervisor.id, prompt);
    const parts: string[] = [];
    parts.push(`# Supreme Coordinator routed this task`);
    parts.push(
      `Strategic Layer → ${supervisor.tier.toUpperCase()} path → ${supervisor.emoji} ${supervisor.name}`,
    );
    if (matched.length) parts.push(`Matched tags: ${matched.join(", ")}`);
    if (agent) {
      parts.push(`\n## Specialist on duty: ${agent.name}`);
      parts.push(agent.description);
      parts.push(`\n### Soul prompt`);
      parts.push(agent.soulPrompt);
      if (agent.code) {
        const trimmed =
          agent.code.length > 4000
            ? agent.code.slice(0, 4000) + "\n// …(truncated)"
            : agent.code;
        parts.push(`\n### Reference TypeScript implementation`);
        parts.push("```ts\n" + trimmed + "\n```");
      }
    } else {
      parts.push(
        `\n## No specialist registered under ${supervisor.name} — fall back to a generic ${supervisor.tier} specialist.`,
      );
    }
    return { supervisor, agent, matched, systemContext: parts.join("\n") };
  }
}

let _store: SupremeCoordinatorStore | null = null;

export function getSupremeCoordinator(): SupremeCoordinatorStore {
  if (!_store) _store = new SupremeCoordinatorStore();
  return _store;
}
