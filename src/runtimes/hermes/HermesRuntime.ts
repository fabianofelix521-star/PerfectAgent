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

export interface AudienceModel {
  segment: string;
  psychographics: {
    coreDesires: string[];
    coreFearsAndPains: string[];
    aspirationalIdentity: string;
    currentFrustrations: string[];
    valueHierarchy: string[];
  };
  linguisticFingerprint: {
    resonantWords: string[];
    avoidWords: string[];
    preferredTone: string;
    analogiesTheyGet: string[];
  };
  behavioralPatterns: {
    bestTimeToReach: string[];
    preferredChannels: string[];
    decisionMakingStyle: string;
    objectionPatterns: string[];
    avgDecisionTime: number;
  };
  campaignMemory: CampaignResult[];
}

export interface CampaignResult {
  campaignId: string;
  copyUsed: string;
  channel: string;
  segment: string;
  metrics: {
    openRate?: number;
    ctr: number;
    conversionRate: number;
    roi: number;
    qualityScore: number;
  };
  timestamp: number;
  whatWorked: string[];
  whatDidntWork: string[];
}

export interface MarketingBrief {
  product: string;
  offer: string;
  targetSegment: string;
  channel?: string;
  goal?: "awareness" | "activation" | "conversion" | "retention" | "referral";
  constraints?: string[];
  sourceInsights?: string[];
}

export interface MarketingContent {
  id: string;
  agentId: string;
  channel: string;
  headline: string;
  body: string;
  callToAction: string;
  angle: string;
  objectionsHandled: string[];
  predictedAudienceFit: number;
}

export interface PerformancePrediction {
  estimatedCTR: number;
  estimatedConversion: number;
  resonanceScore: number;
  topRisks: string[];
  improvements: string[];
}

export interface AudienceModelDelta {
  segment: string;
  resonantWords: string[];
  avoidWords: string[];
  objections: string[];
  channelScores: Record<string, number>;
  confidence: number;
}

export interface Campaign {
  id: string;
  brief: MarketingBrief;
  selectedContent: MarketingContent;
  variations: MarketingContent[];
  prediction: PerformancePrediction;
  audienceModel: AudienceModel;
  rationale: string[];
}

export interface HermesMemoryState {
  audienceModels: AudienceModel[];
}

export interface HermesAgent {
  id: string;
  marketingSpecialty: string;
  create(brief: MarketingBrief, audienceModel: AudienceModel): Promise<MarketingContent>;
  analyzePerformance(results: CampaignResult[]): Promise<AudienceModelDelta>;
  predictPerformance(
    content: MarketingContent,
    audienceModel: AudienceModel,
  ): Promise<PerformancePrediction>;
}

abstract class BaseHermesAgent implements HermesAgent {
  constructor(
    public readonly id: string,
    public readonly marketingSpecialty: string,
    private readonly angleVocabulary: string[],
  ) {}

  async create(brief: MarketingBrief, audienceModel: AudienceModel): Promise<MarketingContent> {
    const desire = audienceModel.psychographics.coreDesires[0] ?? "resultado mensuravel";
    const pain = audienceModel.psychographics.coreFearsAndPains[0] ?? "perder tempo";
    const resonant = audienceModel.linguisticFingerprint.resonantWords.slice(0, 4);
    const angle = this.selectAngle(brief, audienceModel);
    const body = [
      `${brief.product} ajuda ${audienceModel.segment} a conquistar ${desire} sem cair em ${pain}.`,
      `A proposta e ${brief.offer}, com foco em ${angle}.`,
      brief.constraints?.length ? `Limites respeitados: ${brief.constraints.join("; ")}.` : "",
      resonant.length ? `Linguagem calibrada: ${resonant.join(", ")}.` : "",
    ]
      .filter(Boolean)
      .join(" ");
    return {
      id: stableId(`${this.id}:${brief.product}:${brief.offer}:${now()}`),
      agentId: this.id,
      channel: brief.channel ?? audienceModel.behavioralPatterns.preferredChannels[0] ?? "email",
      headline: this.headline(brief, desire, pain),
      body,
      callToAction: this.callToAction(brief),
      angle,
      objectionsHandled: audienceModel.behavioralPatterns.objectionPatterns.slice(0, 4),
      predictedAudienceFit: this.fitScore(body, audienceModel),
    };
  }

  async analyzePerformance(results: CampaignResult[]): Promise<AudienceModelDelta> {
    const positive = results.filter((result) => result.metrics.qualityScore >= 0.65);
    const negative = results.filter((result) => result.metrics.qualityScore < 0.65);
    const segment = results[0]?.segment ?? "unknown";
    const channelScores: Record<string, number> = {};
    for (const result of results) {
      channelScores[result.channel] = mean([
        channelScores[result.channel] ?? result.metrics.qualityScore,
        result.metrics.qualityScore,
      ]);
    }
    return {
      segment,
      resonantWords: uniqueMerge(
        positive.flatMap((result) => tokenize(`${result.copyUsed} ${result.whatWorked.join(" ")}`)),
        [],
        16,
      ),
      avoidWords: uniqueMerge(
        negative.flatMap((result) => tokenize(`${result.copyUsed} ${result.whatDidntWork.join(" ")}`)),
        [],
        16,
      ),
      objections: uniqueMerge([], results.flatMap((result) => result.whatDidntWork), 12),
      channelScores,
      confidence: clamp01(mean(results.map((result) => result.metrics.qualityScore))),
    };
  }

  async predictPerformance(
    content: MarketingContent,
    audienceModel: AudienceModel,
  ): Promise<PerformancePrediction> {
    return new ResonanceEngine().predictResonance(content, audienceModel);
  }

  protected selectAngle(brief: MarketingBrief, audienceModel: AudienceModel): string {
    const goal = brief.goal ?? "conversion";
    const identity = audienceModel.psychographics.aspirationalIdentity;
    return `${this.marketingSpecialty}:${goal}:${identity}:${this.angleVocabulary[0]}`;
  }

  protected headline(brief: MarketingBrief, desire: string, pain: string): string {
    return `${brief.offer}: ${desire} sem ${pain}`;
  }

  protected callToAction(brief: MarketingBrief): string {
    if (brief.goal === "retention") return "Reative agora";
    if (brief.goal === "referral") return "Compartilhe com alguem certo";
    return "Comecar agora";
  }

  protected fitScore(text: string, audienceModel: AudienceModel): number {
    const resonant = keywordScore(text, audienceModel.linguisticFingerprint.resonantWords);
    const avoid = keywordScore(text, audienceModel.linguisticFingerprint.avoidWords);
    return clamp01(0.55 + resonant * 0.35 - avoid * 0.3);
  }
}

export class PsychographerAgent extends BaseHermesAgent {
  constructor() {
    super("psychographer", "psychographics", ["jobs-to-be-done", "identity", "desire"]);
  }
}

export class CopyAlchemistAgent extends BaseHermesAgent {
  constructor() {
    super("copy-alchemist", "copywriting", ["aida", "pas", "story", "pattern-interrupt"]);
  }
}

export class ViralEngineerAgent extends BaseHermesAgent {
  constructor() {
    super("viral-engineer", "viral-engineering", ["loop", "fomo", "referral", "demo"]);
  }
}

export class ContentStrategyAgent extends BaseHermesAgent {
  constructor() {
    super("content-strategy", "content-strategy", ["pillar", "seo", "repurpose", "calendar"]);
  }
}

export class PerformanceMediaAgent extends BaseHermesAgent {
  constructor() {
    super("performance-media", "performance-media", ["roas", "retargeting", "lookalike", "creative"]);
  }
}

export class GrowthHackerAgent extends BaseHermesAgent {
  constructor() {
    super("growth-hacker", "growth-hacking", ["ice", "activation", "retention", "experiment"]);
  }
}

export class SocialIntelligenceAgent extends BaseHermesAgent {
  constructor() {
    super("social-intelligence", "social-intelligence", ["culture", "meme", "timing", "conversation"]);
  }
}

export class ResonanceEngine {
  predictResonance(
    content: MarketingContent,
    audienceModel: AudienceModel,
  ): PerformancePrediction {
    const text = `${content.headline} ${content.body} ${content.callToAction}`;
    const languageFit = keywordScore(text, audienceModel.linguisticFingerprint.resonantWords);
    const avoidancePenalty = keywordScore(text, audienceModel.linguisticFingerprint.avoidWords);
    const channelFit = audienceModel.behavioralPatterns.preferredChannels.includes(content.channel) ? 0.18 : 0;
    const objectionFit = clamp01(content.objectionsHandled.length / Math.max(1, audienceModel.behavioralPatterns.objectionPatterns.length));
    const memoryLift = mean(
      audienceModel.campaignMemory
        .filter((result) => result.channel === content.channel)
        .map((result) => result.metrics.qualityScore),
    );
    const resonanceScore = clamp01(
      0.35 +
        languageFit * 0.25 +
        channelFit +
        objectionFit * 0.12 +
        memoryLift * 0.2 -
        avoidancePenalty * 0.25,
    );
    return {
      estimatedCTR: clamp01(0.01 + resonanceScore * 0.18),
      estimatedConversion: clamp01(0.005 + resonanceScore * 0.09),
      resonanceScore,
      topRisks: [
        ...(avoidancePenalty > 0.1 ? ["copy contem palavras que historicamente repelem o segmento"] : []),
        ...(objectionFit < 0.4 ? ["objeções principais nao foram tratadas"] : []),
        ...(channelFit === 0 ? ["canal nao e preferido pelo segmento"] : []),
      ],
      improvements:
        resonanceScore < 0.75
          ? [
              "aumentar especificidade da promessa",
              "usar mais linguagem nativa do segmento",
              "incluir prova social ou mecanismo claro",
            ]
          : ["preservar angulo e testar variacao curta"],
    };
  }

  updateFromResults(
    content: MarketingContent,
    actualResults: CampaignResult,
    audienceModel: AudienceModel,
  ): AudienceModelDelta {
    const worked = actualResults.metrics.qualityScore >= 0.65;
    return {
      segment: audienceModel.segment,
      resonantWords: worked ? tokenize(`${content.headline} ${actualResults.whatWorked.join(" ")}`) : [],
      avoidWords: worked ? [] : tokenize(`${content.body} ${actualResults.whatDidntWork.join(" ")}`),
      objections: actualResults.whatDidntWork,
      channelScores: { [actualResults.channel]: actualResults.metrics.qualityScore },
      confidence: actualResults.metrics.qualityScore,
    };
  }
}

export class HermesRuntime {
  private readonly agents: Map<string, HermesAgent>;
  private readonly resonanceEngine = new ResonanceEngine();
  private readonly memory = new PersistentCognitiveMemory<HermesMemoryState>(
    "runtime:hermes:audience-memory",
    () => ({ audienceModels: [] }),
  );
  private audienceModels: Map<string, AudienceModel>;

  constructor(agents: HermesAgent[] = defaultHermesAgents()) {
    this.agents = new Map(agents.map((agent) => [agent.id, agent]));
    this.audienceModels = new Map(
      this.memory.load().state.audienceModels.map((model) => [model.segment, model]),
    );
  }

  async createCampaign(brief: MarketingBrief): Promise<Campaign> {
    const audienceModel = await this.getAudienceModel(brief.targetSegment);
    const enrichedModel = await this.enrichAudienceModel(audienceModel, brief);
    const creators = ["copy-alchemist", "viral-engineer", "content-strategy", "performance-media"]
      .map((id) => this.agents.get(id))
      .filter((agent): agent is HermesAgent => Boolean(agent));
    const variations = await Promise.all(
      creators.map((agent) => agent.create(brief, enrichedModel)),
    );
    const predictions = variations.map((content) =>
      this.resonanceEngine.predictResonance(content, enrichedModel),
    );
    const best = this.synthesizeBestCampaign(variations, predictions);
    const campaign: Campaign = {
      id: stableId(`${brief.product}:${brief.offer}:${now()}`),
      brief,
      selectedContent: best.content,
      variations,
      prediction: best.prediction,
      audienceModel: enrichedModel,
      rationale: [
        `selecionado por ressonancia=${best.prediction.resonanceScore.toFixed(2)}`,
        `segmento=${enrichedModel.segment}`,
        `canal=${best.content.channel}`,
      ],
    };
    this.audienceModels.set(enrichedModel.segment, enrichedModel);
    this.persist();
    return campaign;
  }

  async learnFromResults(results: CampaignResult[]): Promise<void> {
    for (const result of results) {
      const model = await this.getAudienceModel(result.segment);
      const insights = await Promise.all(
        [...this.agents.values()].map((agent) => agent.analyzePerformance([result])),
      );
      this.updateAudienceModel(result.segment, insights, model, result);
    }
    this.persist();
  }

  assessQuality(segment?: string) {
    const models = segment
      ? [this.audienceModels.get(segment)].filter((model): model is AudienceModel => Boolean(model))
      : [...this.audienceModels.values()];
    return qualityFromSignals({
      evidenceCount: models.reduce((sum, model) => sum + model.campaignMemory.length, 0),
      contradictionCount: models.reduce(
        (sum, model) => sum + model.linguisticFingerprint.avoidWords.length,
        0,
      ),
      confidence: mean(
        models.flatMap((model) => model.campaignMemory.map((item) => item.metrics.qualityScore)),
      ),
      uncertaintyCount: models.filter((model) => model.campaignMemory.length < 3).length,
    });
  }

  async getAudienceModel(segment: string): Promise<AudienceModel> {
    const existing = this.audienceModels.get(segment);
    if (existing) return existing;
    const model = defaultAudienceModel(segment);
    this.audienceModels.set(segment, model);
    this.persist();
    return model;
  }

  private async enrichAudienceModel(
    audienceModel: AudienceModel,
    brief: MarketingBrief,
  ): Promise<AudienceModel> {
    const sourceText = `${brief.product} ${brief.offer} ${(brief.sourceInsights ?? []).join(" ")}`;
    const words = tokenize(sourceText).filter((word) => word.length > 4).slice(0, 10);
    return {
      ...audienceModel,
      psychographics: {
        ...audienceModel.psychographics,
        coreDesires: uniqueMerge(audienceModel.psychographics.coreDesires, [brief.goal ?? "crescimento"], 8),
        currentFrustrations: uniqueMerge(
          audienceModel.psychographics.currentFrustrations,
          brief.constraints ?? [],
          8,
        ),
      },
      linguisticFingerprint: {
        ...audienceModel.linguisticFingerprint,
        resonantWords: uniqueMerge(audienceModel.linguisticFingerprint.resonantWords, words, 18),
      },
      behavioralPatterns: {
        ...audienceModel.behavioralPatterns,
        preferredChannels: uniqueMerge(
          audienceModel.behavioralPatterns.preferredChannels,
          brief.channel ? [brief.channel] : [],
          8,
        ),
      },
    };
  }

  private synthesizeBestCampaign(
    contentVariations: MarketingContent[],
    predictions: PerformancePrediction[],
  ): { content: MarketingContent; prediction: PerformancePrediction } {
    const ranked = contentVariations
      .map((content, index) => ({ content, prediction: predictions[index] }))
      .sort((a, b) => b.prediction.resonanceScore - a.prediction.resonanceScore);
    return ranked[0] ?? {
      content: contentVariations[0],
      prediction: predictions[0],
    };
  }

  private updateAudienceModel(
    segment: string,
    insights: AudienceModelDelta[],
    model: AudienceModel,
    result: CampaignResult,
  ): void {
    const resonantWords = insights.flatMap((insight) => insight.resonantWords);
    const avoidWords = insights.flatMap((insight) => insight.avoidWords);
    const objections = insights.flatMap((insight) => insight.objections);
    this.audienceModels.set(segment, {
      ...model,
      linguisticFingerprint: {
        ...model.linguisticFingerprint,
        resonantWords: uniqueMerge(model.linguisticFingerprint.resonantWords, resonantWords, 30),
        avoidWords: uniqueMerge(model.linguisticFingerprint.avoidWords, avoidWords, 30),
      },
      behavioralPatterns: {
        ...model.behavioralPatterns,
        objectionPatterns: uniqueMerge(model.behavioralPatterns.objectionPatterns, objections, 20),
      },
      campaignMemory: [result, ...model.campaignMemory].slice(0, 100),
    });
  }

  private persist(): void {
    const previous = this.memory.load();
    this.memory.save({
      ...previous,
      updatedAt: now(),
      state: { audienceModels: [...this.audienceModels.values()] },
    });
  }
}

export function defaultHermesAgents(): HermesAgent[] {
  return [
    new PsychographerAgent(),
    new CopyAlchemistAgent(),
    new ViralEngineerAgent(),
    new ContentStrategyAgent(),
    new PerformanceMediaAgent(),
    new GrowthHackerAgent(),
    new SocialIntelligenceAgent(),
  ];
}

export function defaultAudienceModel(segment: string): AudienceModel {
  return {
    segment,
    psychographics: {
      coreDesires: ["resultado mensuravel", "controle", "status profissional"],
      coreFearsAndPains: ["desperdicar tempo", "parecer amador", "perder oportunidade"],
      aspirationalIdentity: "operador excelente e bem informado",
      currentFrustrations: ["ferramentas fragmentadas", "baixa previsibilidade"],
      valueHierarchy: ["confianca", "velocidade", "clareza", "retorno"],
    },
    linguisticFingerprint: {
      resonantWords: ["claro", "rapido", "confiavel", "mensuravel", "pratico"],
      avoidWords: ["milagre", "garantido", "segredo"],
      preferredTone: "direto, tecnico e pragmatico",
      analogiesTheyGet: ["sistema operacional", "painel de controle", "pipeline"],
    },
    behavioralPatterns: {
      bestTimeToReach: ["09:00", "14:00", "20:00"],
      preferredChannels: ["email", "linkedin", "x"],
      decisionMakingStyle: "analitico com prova social",
      objectionPatterns: ["preco", "tempo de setup", "risco de troca"],
      avgDecisionTime: 7,
    },
    campaignMemory: [],
  };
}

export function marketingBriefFromText(text: string): MarketingBrief {
  return {
    product: text.slice(0, 60) || "produto",
    offer: /trial|teste|gratis|free/i.test(text) ? "teste gratuito" : "oferta principal",
    targetSegment: /dev|engineer|codigo|software/i.test(text) ? "engenharia" : "mercado geral",
    channel: /linkedin/i.test(text) ? "linkedin" : /email/i.test(text) ? "email" : "x",
    goal: /retention|reter|churn/i.test(text)
      ? "retention"
      : /viral|share|referral/i.test(text)
        ? "referral"
        : "conversion",
    sourceInsights: [text],
  };
}
