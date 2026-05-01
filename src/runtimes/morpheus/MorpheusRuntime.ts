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

export interface CreativeWork {
  id: string;
  type: CreativeWorkType;
  content: {
    title: string;
    description: string;
    productionNotes: string[];
    implementationPlan: string[];
    assets: string[];
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
  create(brief: CreativeBrief, aestheticField: AestheticField): Promise<CreativeWork>;
  critique(work: CreativeWork, aestheticField: AestheticField): Promise<CritiqueResult>;
  proposeAestheticEvolution(works: CreativeWork[]): Promise<AestheticFieldDelta>;
}

abstract class BaseMorpheusAgent implements MorpheusAgent {
  constructor(
    public readonly id: string,
    public readonly creativeSpecialty: string,
    public readonly aestheticSensitivity: number,
    private readonly outputType: CreativeWorkType,
    private readonly vocabulary: string[],
  ) {}

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
  private readonly coherenceEngine = new AestheticCoherenceEngine();
  private readonly memory = new PersistentCognitiveMemory<MorpheusMemoryState>(
    "runtime:morpheus:creative-consciousness",
    () => ({ aestheticField: createInitialAestheticField(), workHistory: [] }),
  );
  private aestheticField: AestheticField;
  private workHistory: CreativeWork[];

  constructor(agents: MorpheusAgent[] = defaultMorpheusAgents()) {
    this.agents = new Map(agents.map((agent) => [agent.id, agent]));
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
    return works;
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
