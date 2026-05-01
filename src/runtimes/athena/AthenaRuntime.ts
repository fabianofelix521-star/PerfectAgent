import {
  clamp01,
  keywordScore,
  mean,
  now,
  PersistentCognitiveMemory,
  qualityFromSignals,
  stableId,
  tokenize,
  uniqueMerge,
} from "@/runtimes/shared/cognitiveCore";

export interface Source {
  type: "paper" | "book" | "expert" | "data" | "report" | "news";
  citation: string;
  credibilityScore: number;
  bias?: string;
  methodology?: string;
  sampleSize?: number;
  peerReviewed: boolean;
}

export interface EpistemicNode {
  id: string;
  claim: string;
  confidence: number;
  sources: Source[];
  supportedBy: string[];
  contradictedBy: string[];
  qualifiedBy: string[];
  domain: string;
  lastUpdated: number;
}

export interface KnowledgeGap {
  topic: string;
  existingKnowledge: string[];
  missingPiece: string;
  importanceScore: number;
  researchHypothesis: string;
}

export interface ResearchQuery {
  topic: string;
  domain?: string;
  sources?: Source[];
  seedClaims?: string[];
  depth?: "quick" | "standard" | "deep";
}

export interface ResearchReport {
  query: ResearchQuery;
  synthesis: string;
  claims: EpistemicNode[];
  contradictions: Array<{ a: EpistemicNode; b: EpistemicNode; resolution: string }>;
  gaps: KnowledgeGap[];
  confidence: number;
  quality: ReturnType<typeof qualityFromSignals>;
}

export interface AthenaMemoryState {
  epistemicWeb: EpistemicNode[];
  reports: Array<{ at: number; topic: string; confidence: number }>;
}

export class LiteratureMapperAgent {
  map(query: ResearchQuery): EpistemicNode[] {
    const sources = query.sources?.length ? query.sources : [defaultSource(query.topic)];
    const claims = query.seedClaims?.length
      ? query.seedClaims
      : [
          `${query.topic} possui consenso parcial, mas dependente de contexto`,
          `${query.topic} exige avaliacao metodologica das fontes antes da sintese`,
          `ha lacunas operacionais em ${query.topic} que pedem pesquisa adicional`,
        ];
    return claims.map((claim, index) => ({
      id: stableId(`${query.topic}:${claim}:${index}`),
      claim,
      confidence: sourceConfidence(sources),
      sources,
      supportedBy: [],
      contradictedBy: [],
      qualifiedBy: [],
      domain: query.domain ?? "general",
      lastUpdated: now(),
    }));
  }
}

export class ContradictionResolverAgent {
  findAndResolve(nodes: EpistemicNode[]): Array<{ a: EpistemicNode; b: EpistemicNode; resolution: string }> {
    const contradictions: Array<{ a: EpistemicNode; b: EpistemicNode; resolution: string }> = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        if (!a || !b) continue;
        if (!this.contradicts(a.claim, b.claim)) continue;
        contradictions.push({
          a,
          b,
          resolution: this.resolve(a, b),
        });
      }
    }
    return contradictions;
  }

  linkContradictions(nodes: EpistemicNode[]): EpistemicNode[] {
    const contradictions = this.findAndResolve(nodes);
    return nodes.map((node) => {
      const contradictedBy = contradictions
        .filter((item) => item.a.id === node.id || item.b.id === node.id)
        .map((item) => (item.a.id === node.id ? item.b.id : item.a.id));
      return {
        ...node,
        contradictedBy: uniqueMerge(node.contradictedBy, contradictedBy, 20),
        confidence: clamp01(node.confidence - contradictedBy.length * 0.08),
      };
    });
  }

  private contradicts(a: string, b: string): boolean {
    const negations = ["not", "nao", "never", "sem", "contra", "false", "falso"];
    const tokensA = tokenize(a);
    const tokensB = tokenize(b);
    const overlap = tokensA.filter((token) => tokensB.includes(token)).length;
    const negA = negations.some((word) => tokensA.includes(word));
    const negB = negations.some((word) => tokensB.includes(word));
    return overlap >= 2 && negA !== negB;
  }

  private resolve(a: EpistemicNode, b: EpistemicNode): string {
    const qualityA = sourceConfidence(a.sources);
    const qualityB = sourceConfidence(b.sources);
    if (Math.abs(qualityA - qualityB) > 0.15) {
      return qualityA > qualityB
        ? `priorizar "${a.claim}" por maior qualidade de fonte`
        : `priorizar "${b.claim}" por maior qualidade de fonte`;
    }
    return "tratar como dependente de contexto; preservar ambas as qualificacoes ate nova evidencia";
  }
}

export class HypothesisGeneratorAgent {
  generateGaps(topic: string, nodes: EpistemicNode[]): KnowledgeGap[] {
    const lowConfidence = nodes.filter((node) => node.confidence < 0.65);
    const contradictionTopics = nodes.filter((node) => node.contradictedBy.length > 0);
    return uniqueMerge(lowConfidence, contradictionTopics, 8).map((node, index) => ({
      topic,
      existingKnowledge: nodes.slice(0, 4).map((item) => item.claim),
      missingPiece: `evidencia independente para ${node.claim}`,
      importanceScore: clamp01(0.45 + (1 - node.confidence) * 0.35 + node.contradictedBy.length * 0.1),
      researchHypothesis: `Se ${node.claim} for verdadeiro, entao novas fontes de alta credibilidade devem suportar o claim em contextos similares (${index + 1}).`,
    }));
  }
}

export class CrossDomainSynthesizerAgent {
  synthesize(nodes: EpistemicNode[], query: ResearchQuery): string {
    const strongest = [...nodes].sort((a, b) => b.confidence - a.confidence).slice(0, 4);
    const domains = uniqueMerge([], nodes.map((node) => node.domain), 8);
    return [
      `Athena sintetizou ${nodes.length} claims sobre ${query.topic}.`,
      `Dominios conectados: ${domains.join(", ")}.`,
      `Claims mais fortes: ${strongest.map((node) => node.claim).join(" | ")}.`,
      "Conclusao: aceitar apenas afirmacoes com fonte rastreavel, preservar incerteza onde houver contradicao e transformar gaps em hipoteses testaveis.",
    ].join(" ");
  }
}

export class AthenaRuntime {
  private readonly literatureMapper = new LiteratureMapperAgent();
  private readonly contradictionResolver = new ContradictionResolverAgent();
  private readonly hypothesisGenerator = new HypothesisGeneratorAgent();
  private readonly synthesizer = new CrossDomainSynthesizerAgent();
  private readonly memory = new PersistentCognitiveMemory<AthenaMemoryState>(
    "runtime:athena:epistemic-web",
    () => ({ epistemicWeb: [], reports: [] }),
  );
  private epistemicWeb: Map<string, EpistemicNode>;

  constructor() {
    this.epistemicWeb = new Map(
      this.memory.load().state.epistemicWeb.map((node) => [node.id, node]),
    );
  }

  async research(query: ResearchQuery): Promise<ResearchReport> {
    const mapped = this.literatureMapper.map(query);
    const linked = this.linkSupport(this.contradictionResolver.linkContradictions(mapped));
    for (const node of linked) this.epistemicWeb.set(node.id, node);
    const claims = [...this.epistemicWeb.values()].filter((node) =>
      keywordScore(node.claim, tokenize(query.topic)) > 0.05 || node.domain === query.domain,
    );
    const contradictions = this.contradictionResolver.findAndResolve(claims);
    const gaps = this.hypothesisGenerator.generateGaps(query.topic, claims);
    const confidence = mean(claims.map((node) => node.confidence));
    const report: ResearchReport = {
      query,
      synthesis: this.synthesizer.synthesize(claims, query),
      claims,
      contradictions,
      gaps,
      confidence,
      quality: qualityFromSignals({
        evidenceCount: claims.reduce((sum, node) => sum + node.sources.length, 0),
        contradictionCount: contradictions.length,
        confidence,
        uncertaintyCount: gaps.length,
      }),
    };
    this.persist(report);
    return report;
  }

  getEpistemicWeb(): EpistemicNode[] {
    return [...this.epistemicWeb.values()];
  }

  private linkSupport(nodes: EpistemicNode[]): EpistemicNode[] {
    return nodes.map((node) => {
      const supportedBy = nodes
        .filter((other) => other.id !== node.id && keywordScore(node.claim, tokenize(other.claim)) > 0.25)
        .map((other) => other.id);
      return {
        ...node,
        supportedBy,
        confidence: clamp01(node.confidence + supportedBy.length * 0.04),
      };
    });
  }

  private persist(report: ResearchReport): void {
    const previous = this.memory.load();
    this.memory.save({
      ...previous,
      updatedAt: now(),
      state: {
        epistemicWeb: [...this.epistemicWeb.values()].slice(-500),
        reports: [
          { at: now(), topic: report.query.topic, confidence: report.confidence },
          ...previous.state.reports,
        ].slice(0, 100),
      },
    });
    this.memory.recordQuality(report.quality);
  }
}

export function researchQueryFromText(text: string): ResearchQuery {
  return {
    topic: text.slice(0, 120) || "general research",
    domain: /medicine|clinical|bio|medico/i.test(text)
      ? "medical"
      : /code|software|engineering/i.test(text)
        ? "engineering"
        : /market|business|strategy/i.test(text)
          ? "strategy"
          : "general",
    seedClaims: text
      .split(/[.;\n]/)
      .map((part) => part.trim())
      .filter((part) => part.length > 12)
      .slice(0, 6),
    depth: text.length > 600 ? "deep" : "standard",
  };
}

function defaultSource(topic: string): Source {
  return {
    type: "report",
    citation: `Local synthesis seed for ${topic}`,
    credibilityScore: 0.55,
    methodology: "user-provided context",
    peerReviewed: false,
  };
}

function sourceConfidence(sources: Source[]): number {
  if (!sources.length) return 0.35;
  return clamp01(
    mean(
      sources.map((source) =>
        source.credibilityScore * 0.7 +
        (source.peerReviewed ? 0.2 : 0) +
        (source.sampleSize && source.sampleSize > 100 ? 0.1 : 0),
      ),
    ),
  );
}
