import {
  clamp,
  clamp01,
  keywordScore,
  mean,
  now,
  PersistentCognitiveMemory,
  qualityFromSignals,
  stableId,
  uniqueMerge,
  weightedMean,
} from "@/runtimes/shared/cognitiveCore";

export type PrometheusTier = "HOT" | "WARM" | "COLD";

export interface MarketData {
  kind: "market";
  symbol: string;
  priceChangePct: number;
  volumeChangePct: number;
  orderBookImbalance?: number;
  fundingRate?: number;
  timestamp?: number;
}

export interface OnChainData {
  kind: "onchain";
  chain: string;
  token?: string;
  whaleTransfers?: number;
  liquidityDeltaPct?: number;
  mempoolPressure?: number;
  bridgeSpreadPct?: number;
  timestamp?: number;
}

export interface SocialData {
  kind: "social";
  topic: string;
  velocity: number;
  influencerMentions: number;
  sentiment: number;
  channels: string[];
  timestamp?: number;
}

export type PrometheusPerception = MarketData | OnChainData | SocialData;

export interface ProbabilisticBelief {
  event: string;
  probability: number;
  timeHorizonMs: number;
  magnitude: number;
  evidence: string[];
  updatedAt: number;
}

export interface WorldModel {
  agentId: string;
  timestamp: number;
  beliefs: Map<string, ProbabilisticBelief>;
  confidence: number;
  trackRecord: number;
}

export interface SerializedWorldModel {
  agentId: string;
  timestamp: number;
  beliefs: Array<[string, ProbabilisticBelief]>;
  confidence: number;
  trackRecord: number;
}

export interface WorldModelDelta {
  agentId: string;
  changedBeliefs: ProbabilisticBelief[];
  confidence: number;
  trackRecord: number;
  timestamp: number;
}

export interface PredictiveConsensus {
  event: string;
  consensusProbability: number;
  weightedByTrackRecord: number;
  dissent: Map<string, number>;
  actionThreshold: number;
  suggestedAction: string;
  evidence: string[];
}

export interface PrometheusDecision {
  agentId: string;
  action: string;
  confidence: number;
  belief?: ProbabilisticBelief;
  shouldAct: boolean;
}

export interface PrometheusRuntimeState {
  worldModels: SerializedWorldModel[];
  consensusHistory: Array<Omit<PredictiveConsensus, "dissent"> & { dissent: Array<[string, number]> }>;
  executedActions: Array<{ at: number; event: string; action: string; confidence: number }>;
}

export interface PrometheusAgent {
  id: string;
  domain: string;
  worldModel: WorldModel;
  tier: PrometheusTier;
  cognitiveCycle(): Promise<void>;
  perceive(data: PrometheusPerception): Promise<void>;
  shareWorldModelDelta(): WorldModelDelta;
  integrateExternalModels(models: WorldModel[]): Promise<void>;
  decide(): Promise<PrometheusDecision>;
  updateTrackRecord(prediction: ProbabilisticBelief, outcome: unknown): void;
}

const TIER_HORIZON: Record<PrometheusTier, number> = {
  HOT: 1000 * 60 * 15,
  WARM: 1000 * 60 * 60 * 6,
  COLD: 1000 * 60 * 60 * 24,
};

abstract class BasePrometheusAgent implements PrometheusAgent {
  worldModel: WorldModel;
  private lastDelta: ProbabilisticBelief[] = [];
  private readonly memory: PersistentCognitiveMemory<SerializedWorldModel>;

  constructor(
    public readonly id: string,
    public readonly domain: string,
    public readonly tier: PrometheusTier,
    trackRecord = 0.62,
  ) {
    this.memory = new PersistentCognitiveMemory(
      `runtime:prometheus:agent:${id}`,
      () => this.serializeWorldModel(this.createWorldModel(trackRecord)),
    );
    this.worldModel = this.deserializeWorldModel(this.memory.load().state);
  }

  async cognitiveCycle(): Promise<void> {
    const stalePenalty = clamp01((now() - this.worldModel.timestamp) / TIER_HORIZON[this.tier]);
    this.worldModel.confidence = clamp01(this.worldModel.confidence * (1 - stalePenalty * 0.25));
    this.worldModel.timestamp = now();
    this.persist();
  }

  async perceive(data: PrometheusPerception): Promise<void> {
    const beliefs = this.extractBeliefs(data);
    this.lastDelta = beliefs;
    for (const belief of beliefs) {
      this.upsertBelief(belief);
    }
    const evidenceCount = [...this.worldModel.beliefs.values()].reduce(
      (sum, belief) => sum + belief.evidence.length,
      0,
    );
    this.worldModel.confidence = clamp01(
      mean([...this.worldModel.beliefs.values()].map((belief) => belief.probability)) *
        0.7 +
        clamp01(evidenceCount / 30) * 0.3,
    );
    this.worldModel.timestamp = now();
    this.persist();
  }

  shareWorldModelDelta(): WorldModelDelta {
    return {
      agentId: this.id,
      changedBeliefs: this.lastDelta,
      confidence: this.worldModel.confidence,
      trackRecord: this.worldModel.trackRecord,
      timestamp: now(),
    };
  }

  async integrateExternalModels(models: WorldModel[]): Promise<void> {
    const relevantModels = models.filter((model) => model.agentId !== this.id);
    for (const external of relevantModels) {
      for (const belief of external.beliefs.values()) {
        const relevance = keywordScore(belief.event, this.relevanceKeywords());
        if (relevance < 0.12) continue;
        const adjusted: ProbabilisticBelief = {
          ...belief,
          probability: clamp01(
            belief.probability * (0.6 + external.trackRecord * 0.25 + relevance * 0.15),
          ),
          evidence: uniqueMerge(
            [`external:${external.agentId}:track=${external.trackRecord.toFixed(2)}`],
            belief.evidence,
            8,
          ),
          updatedAt: now(),
        };
        this.upsertBelief(adjusted);
      }
    }
    this.persist();
  }

  async decide(): Promise<PrometheusDecision> {
    const strongest = [...this.worldModel.beliefs.values()].sort(
      (a, b) => b.probability * Math.abs(b.magnitude) - a.probability * Math.abs(a.magnitude),
    )[0];
    if (!strongest) {
      return {
        agentId: this.id,
        action: "hold: sem crenças suficientes",
        confidence: this.worldModel.confidence,
        shouldAct: false,
      };
    }
    const confidence = clamp01(
      strongest.probability * 0.65 +
        this.worldModel.confidence * 0.2 +
        this.worldModel.trackRecord * 0.15,
    );
    return {
      agentId: this.id,
      action:
        confidence > 0.72
          ? `preparar execucao antecipatoria: ${strongest.event}`
          : `monitorar: ${strongest.event}`,
      confidence,
      belief: strongest,
      shouldAct: confidence > 0.72,
    };
  }

  updateTrackRecord(prediction: ProbabilisticBelief, outcome: unknown): void {
    const hit = this.evaluateOutcome(prediction, outcome);
    this.worldModel.trackRecord = clamp01(this.worldModel.trackRecord * 0.92 + hit * 0.08);
    if (hit < 0.35) {
      this.memory.recordFailure(
        this.domain,
        prediction.event,
        "reduzir peso de evidencias fracas e exigir confirmação cruzada do swarm",
      );
    }
    this.persist();
  }

  protected abstract extractBeliefs(data: PrometheusPerception): ProbabilisticBelief[];
  protected abstract relevanceKeywords(): string[];

  protected belief(
    event: string,
    probability: number,
    magnitude: number,
    evidence: string[],
    timeHorizonMs = TIER_HORIZON[this.tier],
  ): ProbabilisticBelief {
    return {
      event,
      probability: clamp01(probability),
      timeHorizonMs,
      magnitude: clamp(magnitude, -1, 1),
      evidence,
      updatedAt: now(),
    };
  }

  private createWorldModel(trackRecord: number): WorldModel {
    return {
      agentId: this.id,
      timestamp: now(),
      beliefs: new Map(),
      confidence: 0.5,
      trackRecord,
    };
  }

  private upsertBelief(incoming: ProbabilisticBelief): void {
    const existing = this.worldModel.beliefs.get(incoming.event);
    if (!existing) {
      this.worldModel.beliefs.set(incoming.event, incoming);
      return;
    }
    const recency = clamp01(1 - (now() - existing.updatedAt) / incoming.timeHorizonMs);
    this.worldModel.beliefs.set(incoming.event, {
      ...incoming,
      probability: clamp01(existing.probability * recency * 0.45 + incoming.probability * 0.55),
      magnitude: clamp(existing.magnitude * 0.35 + incoming.magnitude * 0.65, -1, 1),
      evidence: uniqueMerge(existing.evidence, incoming.evidence, 12),
      updatedAt: now(),
    });
  }

  private evaluateOutcome(prediction: ProbabilisticBelief, outcome: unknown): number {
    if (!outcome || typeof outcome !== "object") return prediction.probability > 0.75 ? 0.45 : 0.55;
    const record = outcome as Record<string, unknown>;
    const actualMagnitude = typeof record.magnitude === "number" ? record.magnitude : 0;
    const directionHit =
      Math.sign(actualMagnitude) === Math.sign(prediction.magnitude) ? 1 : 0;
    const magnitudeError = Math.abs(actualMagnitude - prediction.magnitude);
    return clamp01(directionHit * 0.7 + (1 - magnitudeError) * 0.3);
  }

  private persist(): void {
    this.memory.save({
      schemaVersion: 1,
      updatedAt: now(),
      state: this.serializeWorldModel(this.worldModel),
      failures: this.memory.load().failures,
      qualityHistory: this.memory.load().qualityHistory,
    });
  }

  private serializeWorldModel(model: WorldModel): SerializedWorldModel {
    return {
      agentId: model.agentId,
      timestamp: model.timestamp,
      beliefs: [...model.beliefs.entries()],
      confidence: model.confidence,
      trackRecord: model.trackRecord,
    };
  }

  private deserializeWorldModel(model: SerializedWorldModel): WorldModel {
    return {
      agentId: model.agentId,
      timestamp: model.timestamp,
      beliefs: new Map(model.beliefs),
      confidence: model.confidence,
      trackRecord: model.trackRecord,
    };
  }
}

export class NarrativeDetectorAgent extends BasePrometheusAgent {
  constructor() {
    super("narrative-detector", "narrative-detection", "HOT", 0.66);
  }

  protected extractBeliefs(data: PrometheusPerception): ProbabilisticBelief[] {
    if (data.kind !== "social") return [];
    const virality = clamp01(data.velocity * 0.45 + data.influencerMentions / 20 + data.sentiment * 0.2);
    return [
      this.belief(
        `narrativa ${data.topic} acelera em ${data.channels.join("+")}`,
        virality,
        clamp(data.sentiment * virality, -1, 1),
        [
          `velocity=${data.velocity.toFixed(2)}`,
          `kol_mentions=${data.influencerMentions}`,
          `channels=${data.channels.join(",")}`,
        ],
        1000 * 60 * 60 * 4,
      ),
    ];
  }

  protected relevanceKeywords(): string[] {
    return ["narrativa", "meme", "social", "sentiment", "kol", "topic"];
  }
}

export class LiquidityMapperAgent extends BasePrometheusAgent {
  constructor() {
    super("liquidity-mapper", "liquidity-mapping", "HOT", 0.64);
  }

  protected extractBeliefs(data: PrometheusPerception): ProbabilisticBelief[] {
    if (data.kind === "market") {
      const gravity = clamp(data.orderBookImbalance ?? data.volumeChangePct / 100, -1, 1);
      return [
        this.belief(
          `${data.symbol} converge para muro de liquidez ${gravity >= 0 ? "acima" : "abaixo"}`,
          clamp01(Math.abs(gravity) * 0.75 + Math.abs(data.volumeChangePct) / 300),
          gravity,
          [`imbalance=${gravity.toFixed(3)}`, `volume_delta=${data.volumeChangePct.toFixed(2)}%`],
          1000 * 60 * 12,
        ),
      ];
    }
    if (data.kind === "onchain" && data.liquidityDeltaPct !== undefined) {
      return [
        this.belief(
          `${data.token ?? data.chain} liquidez oculta muda regime`,
          clamp01(Math.abs(data.liquidityDeltaPct) / 80),
          clamp(data.liquidityDeltaPct / 60, -1, 1),
          [`liquidity_delta=${data.liquidityDeltaPct.toFixed(2)}%`, `chain=${data.chain}`],
        ),
      ];
    }
    return [];
  }

  protected relevanceKeywords(): string[] {
    return ["liquidez", "order", "volume", "dex", "cex", "muro"];
  }
}

export class MEVHunterAgent extends BasePrometheusAgent {
  constructor() {
    super("mev-hunter", "mev-extraction", "HOT", 0.61);
  }

  protected extractBeliefs(data: PrometheusPerception): ProbabilisticBelief[] {
    if (data.kind !== "onchain") return [];
    const pressure = clamp01((data.mempoolPressure ?? 0) * 0.7 + (data.whaleTransfers ?? 0) / 30);
    return [
      this.belief(
        `${data.chain} mempool cria oportunidade MEV pre-bloco`,
        pressure,
        clamp((data.bridgeSpreadPct ?? pressure) / 4, -1, 1),
        [
          `mempool_pressure=${(data.mempoolPressure ?? 0).toFixed(2)}`,
          `whale_transfers=${data.whaleTransfers ?? 0}`,
        ],
        1000 * 30,
      ),
    ];
  }

  protected relevanceKeywords(): string[] {
    return ["mev", "mempool", "arbitrage", "sandwich", "block", "bridge"];
  }
}

export class TokenomicsAnalystAgent extends BasePrometheusAgent {
  constructor() {
    super("tokenomics-analyst", "tokenomics", "WARM", 0.68);
  }

  protected extractBeliefs(data: PrometheusPerception): ProbabilisticBelief[] {
    if (data.kind !== "market") return [];
    const sellPressure = clamp01(Math.max(0, data.volumeChangePct) / 180 + Math.max(0, -data.priceChangePct) / 40);
    return [
      this.belief(
        `${data.symbol} tokenomics sugere pressao de venda`,
        sellPressure,
        -sellPressure,
        [`price_delta=${data.priceChangePct.toFixed(2)}%`, `volume_delta=${data.volumeChangePct.toFixed(2)}%`],
        1000 * 60 * 60 * 6,
      ),
    ];
  }

  protected relevanceKeywords(): string[] {
    return ["tokenomics", "supply", "vesting", "unlock", "inflation", "burn"];
  }
}

export class CrossChainArbitrageAgent extends BasePrometheusAgent {
  constructor() {
    super("cross-chain-arbitrage", "cross-chain-arb", "HOT", 0.6);
  }

  protected extractBeliefs(data: PrometheusPerception): ProbabilisticBelief[] {
    if (data.kind !== "onchain") return [];
    const spread = Math.abs(data.bridgeSpreadPct ?? 0);
    return [
      this.belief(
        `${data.chain} spread cross-chain arbitravel`,
        clamp01(spread / 3),
        clamp((data.bridgeSpreadPct ?? 0) / 3, -1, 1),
        [`bridge_spread=${(data.bridgeSpreadPct ?? 0).toFixed(2)}%`, `chain=${data.chain}`],
        1000 * 60 * 5,
      ),
    ];
  }

  protected relevanceKeywords(): string[] {
    return ["cross", "chain", "bridge", "spread", "arbitravel", "arb"];
  }
}

export class SentimentCrystalBallAgent extends BasePrometheusAgent {
  constructor() {
    super("sentiment-crystal-ball", "sentiment-prediction", "WARM", 0.63);
  }

  protected extractBeliefs(data: PrometheusPerception): ProbabilisticBelief[] {
    if (data.kind !== "social") return [];
    const reversal = clamp01(Math.abs(data.sentiment) * 0.45 + data.velocity * 0.35);
    return [
      this.belief(
        `${data.topic} sentimento vira em 2-6h`,
        reversal,
        clamp(data.sentiment * -0.35 + data.velocity * 0.25, -1, 1),
        [`sentiment=${data.sentiment.toFixed(2)}`, `velocity=${data.velocity.toFixed(2)}`],
        1000 * 60 * 60 * 6,
      ),
    ];
  }

  protected relevanceKeywords(): string[] {
    return ["sentimento", "fear", "greed", "social", "virada", "sentiment"];
  }
}

export class PrometheusWorldModelMerger {
  mergeModels(models: WorldModel[]): PredictiveConsensus[] {
    const grouped = new Map<string, Array<{ belief: ProbabilisticBelief; model: WorldModel }>>();
    for (const model of models) {
      for (const belief of model.beliefs.values()) {
        const key = this.canonicalEvent(belief.event);
        grouped.set(key, [...(grouped.get(key) ?? []), { belief, model }]);
      }
    }
    return [...grouped.entries()]
      .map(([, items]) => this.mergeGroup(items))
      .sort((a, b) => b.weightedByTrackRecord - a.weightedByTrackRecord);
  }

  private mergeGroup(
    items: Array<{ belief: ProbabilisticBelief; model: WorldModel }>,
  ): PredictiveConsensus {
    const weighted = items.map(({ belief, model }) => {
      const recency = clamp01(1 - (now() - belief.updatedAt) / Math.max(1, belief.timeHorizonMs));
      const domainRelevance = clamp01(0.45 + belief.evidence.length / 12);
      return {
        value: belief.probability,
        weight: model.trackRecord ** 2 * (0.2 + recency * 0.8) * domainRelevance,
      };
    });
    const probability = clamp01(weightedMean(weighted));
    const magnitude = weightedMean(
      items.map(({ belief, model }) => ({
        value: belief.magnitude,
        weight: Math.max(0.05, model.trackRecord),
      })),
    );
    const event = items[0]?.belief.event ?? "unknown event";
    const dissent = new Map(
      items
        .filter(({ belief }) => Math.abs(belief.probability - probability) > 0.22)
        .map(({ model, belief }) => [model.agentId, belief.probability]),
    );
    return {
      event,
      consensusProbability: probability,
      weightedByTrackRecord: clamp01(probability * (1 - dissent.size * 0.05)),
      dissent,
      actionThreshold: magnitude >= 0 ? 0.72 : 0.78,
      suggestedAction:
        magnitude >= 0
          ? "preparar entrada com tamanho proporcional a confianca"
          : "reduzir exposicao e preparar protecao",
      evidence: uniqueMerge([], items.flatMap(({ belief }) => belief.evidence), 16),
    };
  }

  private canonicalEvent(event: string): string {
    return event
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .slice(0, 5)
      .join(" ");
  }
}

export class PrometheusRuntime {
  private readonly agents: Map<string, PrometheusAgent>;
  private readonly merger = new PrometheusWorldModelMerger();
  private readonly memory = new PersistentCognitiveMemory<PrometheusRuntimeState>(
    "runtime:prometheus:state",
    () => ({ worldModels: [], consensusHistory: [], executedActions: [] }),
  );
  private consensusHistory: PredictiveConsensus[] = [];

  constructor(agents: PrometheusAgent[] = defaultPrometheusAgents()) {
    this.agents = new Map(agents.map((agent) => [agent.id, agent]));
    this.consensusHistory = this.memory
      .load()
      .state.consensusHistory.map((item) => ({ ...item, dissent: new Map(item.dissent) }));
  }

  async perceive(data: PrometheusPerception): Promise<void> {
    await Promise.all([...this.agents.values()].map((agent) => agent.perceive(data)));
  }

  async runCognitiveCycle(): Promise<PredictiveConsensus[]> {
    await Promise.all([...this.agents.values()].map((agent) => agent.cognitiveCycle()));
    const models = [...this.agents.values()].map((agent) => agent.worldModel);
    await Promise.all([...this.agents.values()].map((agent) => agent.integrateExternalModels(models)));
    const consensus = this.merger.mergeModels(models);
    this.consensusHistory = [...consensus, ...this.consensusHistory].slice(0, 100);
    for (const item of consensus) {
      if (item.weightedByTrackRecord > item.actionThreshold) {
        await this.executeConsensusAction(item);
      }
    }
    this.persist();
    return consensus;
  }

  async process(data: PrometheusPerception | PrometheusPerception[]): Promise<PredictiveConsensus[]> {
    const batch = Array.isArray(data) ? data : [data];
    for (const item of batch) await this.perceive(item);
    return this.runCognitiveCycle();
  }

  assessQuality(): ReturnType<typeof qualityFromSignals> {
    const recent = this.consensusHistory.slice(0, 12);
    return qualityFromSignals({
      evidenceCount: recent.reduce((sum, item) => sum + item.evidence.length, 0),
      contradictionCount: recent.reduce((sum, item) => sum + item.dissent.size, 0),
      confidence: mean(recent.map((item) => item.weightedByTrackRecord)),
      uncertaintyCount: recent.filter((item) => item.weightedByTrackRecord < item.actionThreshold).length,
    });
  }

  getAgents(): PrometheusAgent[] {
    return [...this.agents.values()];
  }

  getConsensusHistory(): PredictiveConsensus[] {
    return this.consensusHistory;
  }

  private async executeConsensusAction(consensus: PredictiveConsensus): Promise<void> {
    const state = this.memory.load().state;
    state.executedActions = [
      {
        at: now(),
        event: consensus.event,
        action: consensus.suggestedAction,
        confidence: consensus.weightedByTrackRecord,
      },
      ...state.executedActions,
    ].slice(0, 100);
    this.memory.update(() => state);
  }

  private persist(): void {
    const serializedModels = [...this.agents.values()].map((agent) => ({
      agentId: agent.worldModel.agentId,
      timestamp: agent.worldModel.timestamp,
      beliefs: [...agent.worldModel.beliefs.entries()],
      confidence: agent.worldModel.confidence,
      trackRecord: agent.worldModel.trackRecord,
    }));
    const current = this.memory.load().state;
    this.memory.save({
      schemaVersion: 1,
      updatedAt: now(),
      state: {
        ...current,
        worldModels: serializedModels,
        consensusHistory: this.consensusHistory.map((item) => ({
          ...item,
          dissent: [...item.dissent.entries()],
        })),
      },
      failures: this.memory.load().failures,
      qualityHistory: this.memory.load().qualityHistory,
    });
  }
}

export function defaultPrometheusAgents(): PrometheusAgent[] {
  return [
    new NarrativeDetectorAgent(),
    new LiquidityMapperAgent(),
    new MEVHunterAgent(),
    new TokenomicsAnalystAgent(),
    new CrossChainArbitrageAgent(),
    new SentimentCrystalBallAgent(),
  ];
}

export function marketTextToPrometheusData(text: string): PrometheusPerception {
  const id = stableId(text);
  const lower = text.toLowerCase();
  if (/twitter|x |telegram|discord|reddit|narrativa|sentimento|meme/.test(lower)) {
    return {
      kind: "social",
      topic: lower.includes("solana") ? "solana" : `topic-${id}`,
      velocity: keywordScore(text, ["viral", "trend", "narrativa", "meme", "pump"]) + 0.25,
      influencerMentions: Math.round(keywordScore(text, ["kol", "influencer", "whale", "founder"]) * 10),
      sentiment: keywordScore(text, ["bull", "alta", "pump", "positivo"]) -
        keywordScore(text, ["bear", "queda", "rug", "medo"]),
      channels: ["chat"],
    };
  }
  if (/chain|dex|liquidez|mempool|bridge|whale|baleia|solana/.test(lower)) {
    return {
      kind: "onchain",
      chain: lower.includes("solana") ? "solana" : "multi-chain",
      token: lower.includes("memecoin") ? "memecoin" : undefined,
      whaleTransfers: Math.round(keywordScore(text, ["whale", "baleia", "transfer"]) * 12),
      liquidityDeltaPct: keywordScore(text, ["liquidez", "pool", "raydium"]) * 35,
      mempoolPressure: keywordScore(text, ["mempool", "mev", "sandwich"]),
      bridgeSpreadPct: keywordScore(text, ["bridge", "arbitrage", "spread"]) * 2.5,
    };
  }
  return {
    kind: "market",
    symbol: lower.includes("btc") ? "BTC" : lower.includes("eth") ? "ETH" : "MARKET",
    priceChangePct: (keywordScore(text, ["alta", "pump", "bull"]) - keywordScore(text, ["queda", "bear"])) * 12,
    volumeChangePct: keywordScore(text, ["volume", "liquidez", "volatil"]) * 80,
    orderBookImbalance: keywordScore(text, ["buy", "bid", "compra"]) - keywordScore(text, ["sell", "ask", "venda"]),
    fundingRate: keywordScore(text, ["funding", "perp"]) * 0.02,
  };
}
