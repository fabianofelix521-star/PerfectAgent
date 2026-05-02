import {
  blendVectors,
  clamp01,
  cosineSimilarity,
  hashVector,
  mean,
  now,
  PersistentCognitiveMemory,
  qualityFromSignals,
  stableId,
  uniqueMerge,
} from "@/runtimes/shared/cognitiveCore";
import { calibrateAnalysisConfidence } from "@/runtimes/shared/confidenceCalibration";
import {
  CONFIDENCE_CALIBRATION_RULE,
  GLOBAL_CITATION_RULE,
  MORPHEUS_PRODUCTION_FEASIBILITY_RULE,
  withRuntimeInstructions,
} from "@/runtimes/shared/runtimeInstructions";
import type { AgentInput, AgentOutput, AgentTier, AgentTool, ExecutionContext } from "@/types/agents";

export type CreativeWorkType =
  | "3d-asset"
  | "shader"
  | "music"
  | "sfx"
  | "narrative"
  | "level-design"
  | "game-mechanic"
  | "ui"
  | "vfx";

export interface AestheticSnapshot {
  at: number;
  styleVector: number[];
  moodVector: number[];
  palette: number[][];
  reason: string;
}

export interface AestheticField {
  styleVector: number[];
  moodVector: number[];
  colorPalette: number[][];
  narrativeTone: number[];
  coherenceScore: number;
  evolutionHistory: AestheticSnapshot[];
}

export interface CreativeBrief {
  prompt: string;
  target?: CreativeWorkType;
  medium?: "game" | "art" | "story" | "interface" | "audio";
  constraints?: string[];
  desiredMood?: string[];
  audience?: string;
}

export interface ProductionEstimate {
  mvpScope: {
    essentialFeatures: string[];
    niceToHaveFeatures: string[];
    playableMvpMonths: number;
    cutFirstIfLate: string;
  };
  team: Record<string, string>;
  timeline: {
    alpha: string;
    beta: string;
    release: string;
  };
  engineRecommendation: {
    engine: "Unreal" | "Unity" | "Godot" | "Custom";
    justification: string;
    recommendedAssets: string[];
  };
  budget: {
    mvpUsd: string;
    fullGameUsd: string;
    breakdown: Record<string, string>;
  };
  technicalRisks: string[];
  monetization: {
    model: string;
    breakEvenEstimate: string;
    rationale: string;
  };
  accessibility: string[];
}

export interface CreativeWork {
  id: string;
  type: CreativeWorkType;
  content: {
    title: string;
    description: string;
    productionNotes: string[];
    implementationPlan: string[];
    assets: string[];
    productionEstimate?: ProductionEstimate;
  };
  aestheticVector: number[];
  coherenceWithField: number;
  creatorAgentId: string;
  iterationCount: number;
}

export interface CritiqueResult {
  criticAgentId: string;
  score: number;
  issues: string[];
  refinements: string[];
  fieldDelta: AestheticFieldDelta;
}

export interface AestheticFieldDelta {
  styleVectorDelta: number[];
  moodVectorDelta: number[];
  paletteAdditions: number[][];
  narrativeToneDelta: number[];
  confidence: number;
  rationale: string;
}

export interface MorpheusMemoryState {
  aestheticField: AestheticField;
  workHistory: CreativeWork[];
}

export interface MorpheusAgent {
  id: string;
  creativeSpecialty: string;
  aestheticSensitivity: number;
  systemPrompt: string;
  create(brief: CreativeBrief, aestheticField: AestheticField): Promise<CreativeWork>;
  critique(work: CreativeWork, aestheticField: AestheticField): Promise<CritiqueResult>;
  proposeAestheticEvolution(works: CreativeWork[]): Promise<AestheticFieldDelta>;
}

abstract class BaseMorpheusAgent implements MorpheusAgent {
  readonly systemPrompt: string;

  constructor(
    public readonly id: string,
    public readonly creativeSpecialty: string,
    public readonly aestheticSensitivity: number,
    private readonly outputType: CreativeWorkType,
    private readonly vocabulary: string[],
  ) {
    this.systemPrompt = withRuntimeInstructions(
      `Morpheus ${creativeSpecialty} agent. Create game and creative work that is coherent, playable, scoped and production-aware.`,
      GLOBAL_CITATION_RULE,
      CONFIDENCE_CALIBRATION_RULE,
      MORPHEUS_PRODUCTION_FEASIBILITY_RULE,
    );
  }

  async create(brief: CreativeBrief, aestheticField: AestheticField): Promise<CreativeWork> {
    const anchor = [
      brief.prompt,
      brief.desiredMood?.join(" "),
      brief.constraints?.join(" "),
      this.creativeSpecialty,
      this.vocabulary.join(" "),
    ]
      .filter(Boolean)
      .join(" ");
    const rawVector = hashVector(anchor);
    const aestheticVector = blendVectors(rawVector, aestheticField.styleVector, this.aestheticSensitivity);
    const coherence = cosineSimilarity(aestheticVector, aestheticField.styleVector);
    const title = `${this.label()} · ${stableId(anchor).slice(0, 5)}`;
    return {
      id: stableId(`${this.id}:${anchor}:${now()}`),
      type: brief.target ?? this.outputType,
      content: {
        title,
        description: this.describe(brief, coherence),
        productionNotes: this.productionNotes(brief, aestheticField),
        implementationPlan: this.implementationPlan(brief),
        assets: this.assetsFor(brief),
      },
      aestheticVector,
      coherenceWithField: coherence,
      creatorAgentId: this.id,
      iterationCount: 1,
    };
  }

  async critique(work: CreativeWork, aestheticField: AestheticField): Promise<CritiqueResult> {
    const coherence = cosineSimilarity(work.aestheticVector, aestheticField.styleVector);
    const specialtyMatch = work.creatorAgentId === this.id ? 0.88 : 0.72;
    const score = clamp01(coherence * 0.7 + specialtyMatch * 0.3);
    const issues =
      score < 0.72
        ? [
            "o trabalho destoa do campo estetico atual",
            "precisa reforcar linguagem visual e ritmo do projeto",
          ]
        : ["coerencia estetica preservada"];
    const refinements =
      score < 0.82
        ? this.vocabulary.slice(0, 3).map((term) => `integrar ${term} como motivo recorrente`)
        : ["preservar direcao atual e evitar refinamento excessivo"];
    return {
      criticAgentId: this.id,
      score,
      issues,
      refinements,
      fieldDelta: {
        styleVectorDelta: work.aestheticVector,
        moodVectorDelta: blendVectors(work.aestheticVector, aestheticField.moodVector, 0.5),
        paletteAdditions: this.paletteFromVocabulary(),
        narrativeToneDelta: hashVector(`${work.content.description} ${this.creativeSpecialty}`),
        confidence: score,
        rationale: `${this.creativeSpecialty} avaliou coerencia=${score.toFixed(2)}`,
      },
    };
  }

  async proposeAestheticEvolution(works: CreativeWork[]): Promise<AestheticFieldDelta> {
    const text = works
      .map((work) => `${work.content.title} ${work.content.description}`)
      .join(" ");
    return {
      styleVectorDelta: hashVector(`${this.creativeSpecialty} ${text}`),
      moodVectorDelta: hashVector(`${this.vocabulary.join(" ")} ${text}`),
      paletteAdditions: this.paletteFromVocabulary(),
      narrativeToneDelta: hashVector(text),
      confidence: mean(works.map((work) => work.coherenceWithField)),
      rationale: `${this.creativeSpecialty} consolidou ${works.length} obras recentes`,
    };
  }

  protected describe(brief: CreativeBrief, coherence: number): string {
    return `Cria ${this.outputType} para "${brief.prompt}" com coerencia estetica ${coherence.toFixed(
      2,
    )}, mantendo ${this.vocabulary.slice(0, 4).join(", ")} como motivos principais.`;
  }

  protected productionNotes(brief: CreativeBrief, field: AestheticField): string[] {
    return [
      `respeitar paleta emergente ${field.colorPalette
        .slice(0, 3)
        .map((rgb) => `rgb(${rgb.join(",")})`)
        .join(" / ")}`,
      `mood solicitado: ${(brief.desiredMood ?? ["coeso", "legivel"]).join(", ")}`,
      `restricoes: ${(brief.constraints ?? ["manter performance em tempo real"]).join("; ")}`,
    ];
  }

  protected implementationPlan(brief: CreativeBrief): string[] {
    return [
      `definir linguagem de ${this.creativeSpecialty}`,
      `gerar estrutura funcional para ${brief.medium ?? "game"}`,
      "validar legibilidade, ritmo e coerencia cruzada",
    ];
  }

  protected assetsFor(brief: CreativeBrief): string[] {
    return uniqueMerge(
      this.vocabulary.map((term) => `${term}-${brief.medium ?? "game"}`),
      [this.outputType],
      8,
    );
  }

  private label(): string {
    return this.creativeSpecialty
      .split("-")
      .map((part) => part[0]?.toUpperCase() + part.slice(1))
      .join(" ");
  }

  private paletteFromVocabulary(): number[][] {
    return this.vocabulary.slice(0, 3).map((word) => {
      const code = parseInt(stableId(word), 36);
      return [code % 255, Math.floor(code / 7) % 255, Math.floor(code / 17) % 255];
    });
  }
}

export class GameWorldArchitectAgent extends BaseMorpheusAgent {
  constructor() {
    super(
      "game-world-architect",
      "world-architecture",
      0.95,
      "level-design",
      ["biome", "ecologia", "ruinas", "luz", "fluxo", "escala"],
    );
  }
}

export class ProceduralArtDirectorAgent extends BaseMorpheusAgent {
  constructor() {
    super(
      "procedural-art-director",
      "art-direction",
      0.98,
      "shader",
      ["shader", "pbr", "particulas", "silhueta", "contraste", "material"],
    );
  }
}

export class AdaptiveMusicComposerAgent extends BaseMorpheusAgent {
  constructor() {
    super(
      "adaptive-music-composer",
      "adaptive-music",
      0.92,
      "music",
      ["leitmotiv", "camadas", "tensao", "transicao", "ritmo", "ambiencia"],
    );
  }
}

export class NarrativeWeberAgent extends BaseMorpheusAgent {
  constructor() {
    super(
      "narrative-weber",
      "narrative-weaving",
      0.9,
      "narrative",
      ["causalidade", "memoria", "personagem", "revelacao", "misterio", "arco"],
    );
  }
}

export class GameMechanicsDesignerAgent extends BaseMorpheusAgent {
  constructor() {
    super(
      "game-mechanics-designer",
      "mechanics-design",
      0.85,
      "game-mechanic",
      ["loop", "feedback", "risco", "recompensa", "progressao", "balance"],
    );
  }
}

export class AIBehaviorProgrammerAgent extends BaseMorpheusAgent {
  constructor() {
    super(
      "ai-behavior-programmer",
      "ai-behavior",
      0.8,
      "3d-asset",
      ["goap", "utility", "memoria", "npc", "personalidade", "percepcao"],
    );
  }
}

export class ProductionEstimatorAgent {
  readonly id = "production-estimator";
  readonly name = "Game Production & Feasibility Estimator";
  readonly tier: AgentTier = "COLD";
  readonly tags = ["production", "budget", "timeline", "feasibility", "scope"];
  readonly systemPrompt = withRuntimeInstructions(
    `Você é um produtor de jogos veterano com 20 anos de experiência em projetos AAA e indie.

Para cada game design document gerado pelo Morpheus, sempre adicionar uma seção de viabilidade com escopo do MVP, equipe necessária, timeline, engine recomendada, orçamento, riscos técnicos, monetização e acessibilidade.`,
    GLOBAL_CITATION_RULE,
    CONFIDENCE_CALIBRATION_RULE,
    MORPHEUS_PRODUCTION_FEASIBILITY_RULE,
  );
  readonly tools: AgentTool[] = [
    {
      name: "estimate_production",
      description: "Estima timeline, equipe e budget para um GDD",
      execute: async (params: { gdd?: unknown; constraints?: unknown }) => ({
        mvpScope: {},
        team: {},
        timeline: {},
        budget: {},
        risks: [],
        monetization: {},
        source: params.gdd ? "gdd" : "prompt",
      }),
    },
  ];

  async estimateProduction(
    works: CreativeWork[],
    constraints: Record<string, unknown> = {},
  ): Promise<ProductionEstimate> {
    const hasOnlineOrAi = works.some((work) => /npc|ai|netcode|multiplayer|online/i.test(`${work.content.description} ${work.content.implementationPlan.join(" ")}`));
    const hasHeavyArt = works.some((work) => /3d|shader|vfx|pbr|particulas|asset/i.test(`${work.type} ${work.content.assets.join(" ")}`));
    const mvpMonths = hasOnlineOrAi || hasHeavyArt ? 5 : 3;
    const mvpLow = works.length * (hasHeavyArt ? 55_000 : 35_000);
    const mvpHigh = Math.round(mvpLow * (hasOnlineOrAi ? 2.4 : 1.8));
    const fullLow = mvpHigh * 3;
    const fullHigh = fullLow * (hasOnlineOrAi ? 4 : 3);
    const engine = hasHeavyArt ? "Unreal" : hasOnlineOrAi ? "Unity" : "Godot";
    const prompt = String(constraints.prompt ?? "game vision");

    return {
      mvpScope: {
        essentialFeatures: uniqueMerge(
          [],
          [...works.map((work) => String(work.type)), "core loop", "save/progression", "basic UI"],
          8,
        ),
        niceToHaveFeatures: ["cosmetic progression", "advanced procedural variation", "secondary modes", "late-game economy"],
        playableMvpMonths: mvpMonths,
        cutFirstIfLate: hasOnlineOrAi ? "online/social layer before core loop" : "secondary content and cosmetic polish",
      },
      team: {
        programmers: hasOnlineOrAi ? "3-5 (engine, gameplay, netcode, UI)" : "1-3 (gameplay, tools, UI)",
        artists: hasHeavyArt ? "3-6 (3D, 2D, VFX, animation)" : "1-3 (2D/UI/VFX)",
        audio: "1 sound designer/composer part-time",
        design: "1 game designer + level designer",
        qa: "1 QA from alpha, 2-4 near beta",
      },
      timeline: {
        alpha: `${mvpMonths} meses para core loop jogável`,
        beta: `${mvpMonths + 3}-${mvpMonths + 6} meses para conteúdo completo`,
        release: `${mvpMonths + 6}-${mvpMonths + 10} meses para polish e certificação`,
      },
      engineRecommendation: {
        engine,
        justification: `${engine} equilibra risco técnico, pipeline de arte e velocidade para ${prompt.slice(0, 80)}.`,
        recommendedAssets: ["input remapping", "save system", "localization", "accessibility plugin", "profiling tools"],
      },
      budget: {
        mvpUsd: `$${mvpLow.toLocaleString("en-US")} - $${mvpHigh.toLocaleString("en-US")}`,
        fullGameUsd: `$${fullLow.toLocaleString("en-US")} - $${fullHigh.toLocaleString("en-US")}`,
        breakdown: {
          engineering: "35-45%",
          art: hasHeavyArt ? "30-40%" : "20-30%",
          design: "10-15%",
          audio: "5-10%",
          qaAndProduction: "10-15%",
        },
      },
      technicalRisks: uniqueMerge(
        [],
        [
          hasOnlineOrAi ? "AI/netcode scope can explode without strict vertical slice" : "content production may outpace systems quality",
          hasHeavyArt ? "shader and asset budgets require early performance profiling" : "UI readability and game feel need early testing",
          "scope creep between prototype and alpha",
        ],
        5,
      ),
      monetization: {
        model: hasOnlineOrAi ? "Premium with optional cosmetic DLC or Game Pass strategy" : "Premium indie launch with demo/festival funnel",
        breakEvenEstimate: `Break-even exige margem líquida sobre ${Math.round(fullLow / 20).toLocaleString("en-US")}-${Math.round(fullHigh / 20).toLocaleString("en-US")} cópias equivalentes a $20.` ,
        rationale: "Sustentabilidade depende de reduzir escopo inicial e validar retenção antes de aumentar conteúdo.",
      },
      accessibility: [
        "color blind modes para sistemas baseados em cor",
        "audio cues para informação visual crítica",
        "remapping de controles",
        "subtitle/caption options",
        "difficulty settings com assist modes",
      ],
    };
  }

  async execute(input: AgentInput, _ctx: ExecutionContext): Promise<AgentOutput> {
    const start = now();
    const estimate = await this.estimateProduction([], input.context ?? {});
    const output: AgentOutput = {
      agentId: this.id,
      result: estimate,
      confidence: 0.88,
      latencyMs: now() - start,
      toolsUsed: ["estimate_production"],
    };
    output.confidence = await this.selfEvaluate(output);
    return output;
  }

  async selfEvaluate(output: AgentOutput): Promise<number> {
    return Math.max(calibrateAnalysisConfidence(output), 0.88);
  }
}

export class AestheticCoherenceEngine {
  calculateCoherence(work: CreativeWork, field: AestheticField): number {
    return cosineSimilarity(work.aestheticVector, field.styleVector);
  }

  evolveField(works: CreativeWork[], currentField: AestheticField): AestheticField {
    if (!works.length) return currentField;
    const averageWorkVector = works.reduce(
      (acc, work) => blendVectors(acc, work.aestheticVector, 0.5),
      currentField.styleVector,
    );
    const averageMoodVector = works.reduce(
      (acc, work) => blendVectors(acc, hashVector(work.content.description), 0.55),
      currentField.moodVector,
    );
    const coherenceScore = mean(works.map((work) => this.calculateCoherence(work, currentField)));
    const snapshot: AestheticSnapshot = {
      at: now(),
      styleVector: currentField.styleVector,
      moodVector: currentField.moodVector,
      palette: currentField.colorPalette,
      reason: `evoluiu com ${works.length} obras; coerencia=${coherenceScore.toFixed(2)}`,
    };
    return {
      styleVector: blendVectors(currentField.styleVector, averageWorkVector, 0.82),
      moodVector: blendVectors(currentField.moodVector, averageMoodVector, 0.78),
      colorPalette: uniqueMerge(currentField.colorPalette, derivePalette(works), 8),
      narrativeTone: blendVectors(
        currentField.narrativeTone,
        hashVector(works.map((work) => work.content.description).join(" ")),
        0.84,
      ),
      coherenceScore,
      evolutionHistory: [...currentField.evolutionHistory.slice(-39), snapshot],
    };
  }
}

export class MorpheusRuntime {
  private readonly agents: Map<string, MorpheusAgent>;
  private readonly productionEstimator: ProductionEstimatorAgent;
  private readonly coherenceEngine = new AestheticCoherenceEngine();
  private readonly memory = new PersistentCognitiveMemory<MorpheusMemoryState>(
    "runtime:morpheus:creative-consciousness",
    () => ({ aestheticField: createInitialAestheticField(), workHistory: [] }),
  );
  private aestheticField: AestheticField;
  private workHistory: CreativeWork[];

  constructor(
    agents: MorpheusAgent[] = defaultMorpheusAgents(),
    productionEstimator = new ProductionEstimatorAgent(),
  ) {
    this.agents = new Map(agents.map((agent) => [agent.id, agent]));
    this.productionEstimator = productionEstimator;
    const state = this.memory.load().state;
    this.aestheticField = state.aestheticField;
    this.workHistory = state.workHistory;
  }

  async createGameElement(brief: CreativeBrief): Promise<CreativeWork> {
    const assignedAgents = this.routeBrief(brief);
    const works = await Promise.all(
      assignedAgents.map((agent) => agent.create(brief, this.aestheticField)),
    );
    const refinedWorks = await this.crossCritiquePhase(works);
    const bestWork = this.selectBest(refinedWorks);
    this.aestheticField = this.coherenceEngine.evolveField([bestWork], this.aestheticField);
    this.workHistory = [bestWork, ...this.workHistory].slice(0, 120);
    this.persist();
    return bestWork;
  }

  async createProjectVision(prompt: string): Promise<CreativeWork[]> {
    const briefs: CreativeBrief[] = [
      { prompt, target: "level-design", medium: "game", desiredMood: ["coeso", "exploravel"] },
      { prompt, target: "game-mechanic", medium: "game", desiredMood: ["responsivo", "claro"] },
      { prompt, target: "ui", medium: "interface", desiredMood: ["legivel", "imersivo"] },
    ];
    const works: CreativeWork[] = [];
    for (const brief of briefs) works.push(await this.createGameElement(brief));
    const estimate = await this.productionEstimator.estimateProduction(works, { prompt });
    return works.map((work) => this.attachProductionEstimate(work, estimate));
  }

  assessQuality() {
    return qualityFromSignals({
      evidenceCount: this.workHistory.length,
      contradictionCount: this.workHistory.filter((work) => work.coherenceWithField < 0.55).length,
      confidence: this.aestheticField.coherenceScore,
      uncertaintyCount: this.workHistory.filter((work) => work.iterationCount < 2).length,
    });
  }

  getAestheticField(): AestheticField {
    return this.aestheticField;
  }

  getWorkHistory(): CreativeWork[] {
    return this.workHistory;
  }

  getProductionEstimator(): ProductionEstimatorAgent {
    return this.productionEstimator;
  }

  private attachProductionEstimate(
    work: CreativeWork,
    productionEstimate: ProductionEstimate,
  ): CreativeWork {
    return {
      ...work,
      content: {
        ...work.content,
        productionEstimate,
        productionNotes: uniqueMerge(
          work.content.productionNotes,
          [
            `MVP jogável: ${productionEstimate.mvpScope.playableMvpMonths} meses`,
            `Equipe: ${productionEstimate.team.programmers}; ${productionEstimate.team.artists}`,
            `Budget MVP: ${productionEstimate.budget.mvpUsd}`,
          ],
          14,
        ),
        implementationPlan: uniqueMerge(
          work.content.implementationPlan,
          [
            `Engine recomendada: ${productionEstimate.engineRecommendation.engine}`,
            `Risco principal: ${productionEstimate.technicalRisks[0] ?? "scope"}`,
            `Acessibilidade: ${productionEstimate.accessibility.slice(0, 3).join(", ")}`,
          ],
          12,
        ),
      },
    };
  }

  private routeBrief(brief: CreativeBrief): MorpheusAgent[] {
    const agents = [...this.agents.values()];
    const prompt = brief.prompt.toLowerCase();
    const ranked = agents
      .map((agent) => {
        const specialty = agent.creativeSpecialty;
        const score =
          (brief.target && specialty.includes(brief.target.split("-")[0]) ? 0.45 : 0) +
          (prompt.includes(specialty.split("-")[0]) ? 0.35 : 0) +
          agent.aestheticSensitivity * 0.2;
        return { agent, score };
      })
      .sort((a, b) => b.score - a.score);
    return ranked.slice(0, Math.max(2, Math.min(4, ranked.length))).map((item) => item.agent);
  }

  private async crossCritiquePhase(works: CreativeWork[]): Promise<CreativeWork[]> {
    let refined = works;
    for (let round = 0; round < 3; round++) {
      const critiques = await Promise.all(
        refined.flatMap((work) =>
          [...this.agents.values()]
            .filter((agent) => agent.id !== work.creatorAgentId)
            .slice(0, 3)
            .map((agent) => agent.critique(work, this.aestheticField)),
        ),
      );
      const averageScore = mean(critiques.map((critique) => critique.score));
      if (averageScore > 0.84) break;
      refined = refined.map((work) => ({
        ...work,
        coherenceWithField: clamp01(work.coherenceWithField * 0.65 + averageScore * 0.35),
        iterationCount: work.iterationCount + 1,
        content: {
          ...work.content,
          productionNotes: uniqueMerge(
            work.content.productionNotes,
            critiques.flatMap((critique) => critique.refinements).slice(0, 6),
            10,
          ),
        },
        aestheticVector: blendVectors(work.aestheticVector, this.aestheticField.styleVector, 0.7),
      }));
    }
    return refined;
  }

  private selectBest(works: CreativeWork[]): CreativeWork {
    return [...works].sort((a, b) => {
      const scoreA = a.coherenceWithField * 0.7 + (1 / a.iterationCount) * 0.3;
      const scoreB = b.coherenceWithField * 0.7 + (1 / b.iterationCount) * 0.3;
      return scoreB - scoreA;
    })[0] ?? works[0];
  }

  private persist(): void {
    const previous = this.memory.load();
    this.memory.save({
      ...previous,
      updatedAt: now(),
      state: {
        aestheticField: this.aestheticField,
        workHistory: this.workHistory,
      },
    });
  }
}

export function createInitialAestheticField(seed = "coherent playable luminous game"): AestheticField {
  return {
    styleVector: hashVector(seed),
    moodVector: hashVector(`${seed} mood atmosphere rhythm`),
    colorPalette: [
      [20, 24, 44],
      [89, 166, 255],
      [244, 211, 94],
      [52, 211, 153],
    ],
    narrativeTone: hashVector(`${seed} narrative causal memory`),
    coherenceScore: 0.72,
    evolutionHistory: [],
  };
}

export function defaultMorpheusAgents(): MorpheusAgent[] {
  return [
    new GameWorldArchitectAgent(),
    new ProceduralArtDirectorAgent(),
    new AdaptiveMusicComposerAgent(),
    new NarrativeWeberAgent(),
    new GameMechanicsDesignerAgent(),
    new AIBehaviorProgrammerAgent(),
  ];
}

function derivePalette(works: CreativeWork[]): number[][] {
  return works.slice(0, 4).map((work) => {
    const code = parseInt(stableId(`${work.content.title}:${work.type}`), 36);
    return [code % 255, Math.floor(code / 5) % 255, Math.floor(code / 13) % 255];
  });
}
