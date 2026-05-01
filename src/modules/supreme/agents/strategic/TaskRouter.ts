import { ConceptualAgentBase } from "@/modules/supreme/agents/ConceptualAgentBase";
import type {
  AgentInput,
  AgentOutput,
  ExecutionContext,
} from "@/types/agents";

const SUPERVISOR_ALIAS: Record<string, string> = {
  "financial-supervisor": "financial",
  "security-supervisor": "security",
  "medical-supervisor": "medical",
  "engineering-supervisor": "engineering",
  "science-supervisor": "science",
  "legal-supervisor": "legal",
  "research-supervisor": "research",
  "philosophy-supervisor": "philosophy",
  "creative-supervisor": "creative",
  "ancient-knowledge-supervisor": "ancient",
  "mathematics-supervisor": "math",
  "meta-supervisor": "meta",
};

export function normalizeSupervisorId(supervisorId: string): string {
  return SUPERVISOR_ALIAS[supervisorId] ?? supervisorId;
}

export class TaskRouter extends ConceptualAgentBase {
  private readonly intentMap: Array<[string[], string]> = [
    [["trade", "buy", "sell", "crypto", "defi", "token", "wallet", "yield", "stake", "liquidity", "swap", "portfolio", "risk", "funding", "perp", "futures", "whale", "memecoin", "solana", "bitcoin", "ethereum"], "financial-supervisor"],
    [["hack", "vulnerability", "exploit", "pentest", "malware", "firewall", "auth", "encryption", "threat", "attack", "defense", "forensics", "incident", "zero-day", "cve", "injection", "xss", "csrf", "ransomware", "phishing"], "security-supervisor"],
    [["diagnosis", "symptom", "treatment", "drug", "disease", "anatomy", "physiology", "surgery", "clinical", "patient", "medicine", "health", "dosage", "pathology", "genetics", "healing", "longevity", "herb", "inflammation", "metabolic", "remedy"], "medical-supervisor"],
    [["code", "bug", "architecture", "system", "algorithm", "database", "api", "deploy", "devops", "cloud", "docker", "kubernetes", "performance", "scale", "microservice"], "engineering-supervisor"],
    [["physics", "chemistry", "biology", "quantum", "relativity", "experiment", "hypothesis", "molecule", "atom", "evolution", "neuroscience", "cosmology", "thermodynamics", "genetics", "brain", "attention", "memory", "neuroplasticity", "cognition", "sleep"], "science-supervisor"],
    [["law", "legal", "contract", "regulation", "compliance", "court", "rights", "intellectual property", "patent", "liability", "jurisdiction", "statute", "precedent"], "legal-supervisor"],
    [["research", "paper", "study", "analysis", "literature", "systematic review", "meta-analysis", "methodology", "citation", "academic", "peer review", "dataset"], "research-supervisor"],
    [["philosophy", "ethics", "consciousness", "existence", "epistemology", "metaphysics", "logic", "morality", "free will", "perception", "reality", "meaning", "logos", "ontology", "hermetic", "initiation", "virtue", "self-mastery"], "philosophy-supervisor"],
    [["write", "story", "poem", "art", "music", "design", "creative", "narrative", "character", "plot", "style", "genre", "screenplay", "lyrics", "composition"], "creative-supervisor"],
    [["ancient", "history", "civilization", "mythology", "archaeology", "artifact", "empire", "religion", "hieroglyph", "scroll", "tradition", "ritual", "occult", "hebrew", "kabbalah", "enoch", "geez", "sumerian", "mesopotamia", "gospel", "tao", "veda", "indigenous", "shaman"], "ancient-knowledge-supervisor"],
    [["math", "equation", "proof", "theorem", "calculus", "algebra", "topology", "number theory", "statistics", "probability", "graph theory", "optimization", "matrix"], "mathematics-supervisor"],
    [["agent", "swarm", "orchestrate", "coordinate", "system", "optimize", "self-improve", "meta", "reasoning", "cognitive", "emergent", "intelligence", "strategy"], "meta-supervisor"],
  ];

  constructor() {
    super({
      id: "task-router",
      name: "Task Router",
      description: "Roteamento semântico multi-label para os supervisores do swarm.",
      supervisorId: "meta",
      tier: "HOT",
      tags: ["routing", "semantic", "supervisor", "intent"],
      confidence: 0.8,
      systemPrompt:
        "Classifique prompts por intenção semântica e proponha supervisor primário e secundário.",
    });
  }

  async execute(input: AgentInput, ctx: ExecutionContext): Promise<AgentOutput> {
    const startedAt = Date.now();
    const scores = this.rankSupervisors(input.prompt);
    const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    const primaryRaw = ranked[0]?.[0] ?? "research-supervisor";
    const secondaryRaw = ranked[1]?.[0];
    const primary = normalizeSupervisorId(primaryRaw);
    const secondary = secondaryRaw
      ? normalizeSupervisorId(secondaryRaw)
      : undefined;
    const confidence = ranked[0]?.[1]
      ? Math.min(ranked[0][1] / 10, 1)
      : 0.5;

    return {
      agentId: this.id,
      result: {
        primarySupervisor: primary,
        secondarySupervisor: secondary,
        confidence,
        reasoning: `Detectado dominio: ${primary} (score: ${ranked[0]?.[1] ?? 0})`,
        allScores: Object.fromEntries(
          ranked.map(([sup, score]) => [normalizeSupervisorId(sup), score]),
        ),
        previousAgents: ctx.previousAgents,
      },
      confidence,
      latencyMs: Date.now() - startedAt,
    };
  }

  async selfEvaluate(output: AgentOutput): Promise<number> {
    return output.result.confidence ?? 0.7;
  }

  protected async runDomainLogic(input: AgentInput): Promise<{
    result: Record<string, any>;
    reasoning: string;
    confidence?: number;
  }> {
    const ranked = [...this.rankSupervisors(input.prompt).entries()].sort(
      (a, b) => b[1] - a[1],
    );
    const primary = normalizeSupervisorId(ranked[0]?.[0] ?? "research-supervisor");
    return {
      result: {
        primarySupervisor: primary,
        allScores: Object.fromEntries(ranked),
      },
      reasoning: `TaskRouter mapeou intent para ${primary}.`,
      confidence: ranked[0]?.[1] ? Math.min(ranked[0][1] / 10, 1) : 0.5,
    };
  }

  private rankSupervisors(prompt: string): Map<string, number> {
    const scores = new Map<string, number>();
    const promptLower = prompt.toLowerCase();

    for (const [keywords, supervisorId] of this.intentMap) {
      let score = 0;
      for (const kw of keywords) {
        if (promptLower.includes(kw)) {
          score += kw.length > 6 ? 2 : 1;
        }
      }
      if (score > 0) scores.set(supervisorId, score);
    }

    return scores;
  }
}
