import { api } from "@/services/api";
import type { AgentInput, AgentOutput, ExecutionContext } from "@/types/agents";
import {
  clamp01,
  keywordScore,
  mean,
  now,
  stableId,
  uniqueMerge,
} from "@/runtimes/shared/cognitiveCore";
import {
  buildTool,
  createExecutionContext,
  inferKeywords,
  RuntimeExpertAgent,
  type RuntimeAgentAnalysis,
} from "@/runtimes/shared/runtimeAgentScaffold";
import {
  ASCLEPIUS_ADVANCED_MEDICINE_RULES,
  withRuntimeInstructions,
} from "@/runtimes/shared/runtimeInstructions";

export interface HealingQuery {
  raw: string;
  symptomDomain: string;
  molecules: string[];
  traditions: string[];
  goals: string[];
  constraints: string[];
}

export interface MechanisticHypothesis {
  mechanism: string;
  pathway: string;
  evidenceStrength: number;
  supportingSignals: string[];
  cautions: string[];
}

export interface AncientHealingLens {
  tradition: string;
  remedyPattern: string;
  rationale: string;
  cautions: string[];
}

export interface IntegrativeHypothesis {
  title: string;
  rationale: string;
  evidenceBasis: string[];
  practicalLevers: string[];
  warnings: string[];
  confidence: number;
}

export interface PubMedEvidenceNote {
  title: string;
  snippet: string;
  score: number;
  publishedAt?: string;
  authors?: string[];
}

export interface AsclepiusSynthesis {
  summary: string;
  mechanisticSynthesis: string;
  molecularHypotheses: MechanisticHypothesis[];
  ancestralPatterns: AncientHealingLens[];
  integrativeHypotheses: IntegrativeHypothesis[];
  pubmedEvidence: PubMedEvidenceNote[];
  disclaimers: string[];
  nextSteps: string[];
}

type PubMedSearchResponse = Awaited<ReturnType<typeof api.searchKnowledge>>;

const PATHWAY_LIBRARY: Array<{
  keywords: string[];
  hypothesis: MechanisticHypothesis;
}> = [
    {
      keywords: ["sleep", "circadian", "melatonin", "insomnia", "recovery"],
      hypothesis: {
        mechanism: "Circadian regulation and sleep-pressure restoration",
        pathway: "SCN-melatonin-cortisol coupling",
        evidenceStrength: 0.78,
        supportingSignals: ["sleep quality", "light exposure timing", "stress load"],
        cautions: ["Do not assume melatonin or supplements are universally appropriate."],
      },
    },
    {
      keywords: ["inflammation", "pain", "autoimmune", "immune", "cytokine"],
      hypothesis: {
        mechanism: "Inflammation modulation and immune-signaling reduction",
        pathway: "NF-kB / cytokine cascade",
        evidenceStrength: 0.72,
        supportingSignals: ["pain flare pattern", "dietary triggers", "sleep debt"],
        cautions: ["Persistent inflammatory symptoms require clinical evaluation."],
      },
    },
    {
      keywords: ["brain", "focus", "attention", "memory", "cognition", "neuro"],
      hypothesis: {
        mechanism: "Neurotransmitter balance and attentional network stabilization",
        pathway: "dopamine-acetylcholine-prefrontal regulation",
        evidenceStrength: 0.75,
        supportingSignals: ["task-switch cost", "fatigue", "sleep regularity"],
        cautions: ["Cognitive complaints can reflect multiple systemic causes."],
      },
    },
    {
      keywords: ["glucose", "metabolic", "weight", "insulin", "energy"],
      hypothesis: {
        mechanism: "Metabolic flexibility and insulin-sensitivity recovery",
        pathway: "AMPK / mitochondrial signaling",
        evidenceStrength: 0.77,
        supportingSignals: ["post-meal energy crashes", "waist trend", "fasting markers"],
        cautions: ["Rapid diet or fasting changes can backfire in some clinical contexts."],
      },
    },
    {
      keywords: ["gut", "microbiome", "digestion", "bloating", "ibs"],
      hypothesis: {
        mechanism: "Gut-barrier repair and microbiome signaling normalization",
        pathway: "microbiome-immune-vagus axis",
        evidenceStrength: 0.71,
        supportingSignals: ["trigger foods", "stress correlation", "stool pattern"],
        cautions: ["Alarm symptoms require standard medical workup."],
      },
    },
  ];

const TRADITION_LIBRARY: Array<{
  keywords: string[];
  lens: AncientHealingLens;
}> = [
    {
      keywords: ["ayurveda", "agni", "ojas", "dosha", "rasayana"],
      lens: {
        tradition: "Ayurveda",
        remedyPattern: "Restore digestion, rhythm, and tissue resilience before adding stimulatory interventions.",
        rationale: "Ayurvedic repair often sequences elimination of aggravating factors before rejuvenation.",
        cautions: ["Traditional constitutional models are not interchangeable with modern diagnoses."],
      },
    },
    {
      keywords: ["tcm", "qi", "meridian", "jing", "yin", "yang"],
      lens: {
        tradition: "Traditional Chinese Medicine",
        remedyPattern: "Pattern-differentiate deficiency, stagnation, heat, cold, and damp before selecting remedies.",
        rationale: "TCM emphasizes system balance and relational diagnosis rather than isolated symptoms.",
        cautions: ["Herb-drug interactions and practitioner guidance matter."],
      },
    },
    {
      keywords: ["hippocratic", "greek", "humoral", "galen", "asclepius"],
      lens: {
        tradition: "Greco-Hippocratic",
        remedyPattern: "Protect regimen, sleep, digestion, and environmental balance before escalating to stronger measures.",
        rationale: "Classical medicine treated regimen as foundational architecture for recovery.",
        cautions: ["Humoral descriptions are historical frameworks, not modern biochemical maps."],
      },
    },
    {
      keywords: ["monastic", "herbal", "ethnobotany", "indigenous", "ritual"],
      lens: {
        tradition: "Monastic and ethnobotanical healing",
        remedyPattern: "Combine relational care, ritual structure, and gentle botanical support with observation over time.",
        rationale: "Many ancestral systems embed healing inside meaning, community, and repeated observation.",
        cautions: ["Ethnobotanical traditions require community respect and safety checks."],
      },
    },
  ];

export function parseHealingQuery(text: string): HealingQuery {
  const lower = text.toLowerCase();
  const symptomDomain =
    /brain|focus|memory|attention|adhd|neuro|cognition/.test(lower)
      ? "cognitive"
      : /pain|inflammation|joint|immune|autoimmune/.test(lower)
        ? "inflammation"
        : /gut|digestion|bloat|microbiome|ibs/.test(lower)
          ? "gastrointestinal"
          : /sleep|insomnia|circadian|fatigue/.test(lower)
            ? "recovery"
            : /weight|metabolic|glucose|insulin|energy/.test(lower)
              ? "metabolic"
              : "general";
  const molecules = inferKeywords(text, 12).filter((token) =>
    /melatonin|cortisol|dopamine|serotonin|acetylcholine|ampk|cytokine|insulin|glucose|microbiome|mitochondria/.test(
      token,
    ),
  );
  const traditions = uniqueMerge(
    [],
    TRADITION_LIBRARY.flatMap((item) =>
      item.keywords.filter((keyword) => lower.includes(keyword)).map(() => item.lens.tradition),
    ),
    4,
  );
  const goals = text
    .split(/[.;\n]/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => /improve|reduce|support|heal|recover|performance|focus|energy/i.test(chunk))
    .slice(0, 4);
  const constraints = text
    .split(/[.;\n]/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => /budget|contraind|allergy|pregnan|medication|doctor|time|sensitive/i.test(chunk))
    .slice(0, 4);
  return {
    raw: text,
    symptomDomain,
    molecules,
    traditions,
    goals,
    constraints,
  };
}

function inferMechanisticHypotheses(question: HealingQuery): MechanisticHypothesis[] {
  const scored = PATHWAY_LIBRARY.filter(
    (item) => keywordScore(question.raw, item.keywords) > 0.08,
  ).map((item) => item.hypothesis);
  if (scored.length) return scored.slice(0, 3);
  return PATHWAY_LIBRARY.filter((item) => item.hypothesis.pathway.includes("cortisol") || item.hypothesis.pathway.includes("AMPK")).map(
    (item) => item.hypothesis,
  );
}

function inferAncientHealingLenses(question: HealingQuery): AncientHealingLens[] {
  const lower = question.raw.toLowerCase();
  const matches = TRADITION_LIBRARY.filter(
    (item) => question.traditions.includes(item.lens.tradition) || keywordScore(lower, item.keywords) > 0.08,
  ).map((item) => item.lens);
  if (matches.length) return matches.slice(0, 3);
  return [
    TRADITION_LIBRARY[2].lens,
    TRADITION_LIBRARY[0].lens,
  ];
}

async function fetchPubMedEvidence(query: string): Promise<PubMedEvidenceNote[]> {
  try {
    const data: PubMedSearchResponse = await api.searchKnowledge({
      query,
      limit: 4,
      sources: ["pubmed"],
    });
    return data.results.map((item) => ({
      title: item.title,
      snippet: item.snippet,
      score: item.score,
      publishedAt: item.publishedAt,
      authors: item.authors,
    }));
  } catch {
    return [];
  }
}

function buildIntegrativeHypotheses(
  question: HealingQuery,
  mechanisms: MechanisticHypothesis[],
  traditions: AncientHealingLens[],
  evidence: PubMedEvidenceNote[],
): IntegrativeHypothesis[] {
  const evidenceTitles = evidence.slice(0, 3).map((item) => item.title);
  const primary = mechanisms[0];
  const ancestral = traditions[0];
  const base: IntegrativeHypothesis[] = [];
  if (primary) {
    base.push({
      title: `Target ${primary.pathway} before chasing isolated hacks`,
      rationale: `${primary.mechanism} appears central for the ${question.symptomDomain} pattern in this query.`,
      evidenceBasis: uniqueMerge(primary.supportingSignals, evidenceTitles, 6),
      practicalLevers: [
        "tighten sleep and light timing",
        "remove the strongest aggravators first",
        "measure one or two leading indicators weekly",
      ],
      warnings: primary.cautions,
      confidence: clamp01(primary.evidenceStrength * 0.78 + Math.min(evidence.length, 3) * 0.06),
    });
  }
  if (ancestral) {
    base.push({
      title: `Use ${ancestral.tradition} as a systems lens, not as a shortcut diagnosis`,
      rationale: ancestral.rationale,
      evidenceBasis: uniqueMerge([], [ancestral.remedyPattern, ...evidenceTitles], 5),
      practicalLevers: [
        "stabilize rhythm before stacking interventions",
        "sequence diet, stress, and movement changes",
        "document response before adding complexity",
      ],
      warnings: ancestral.cautions,
      confidence: 0.67,
    });
  }
  base.push({
    title: "Escalate uncertainty instead of forcing certainty",
    rationale: "When symptoms are persistent, multimodal, or fast-changing, the safest next move is structured evaluation.",
    evidenceBasis: [question.symptomDomain, ...(question.constraints.length ? question.constraints : ["clinical uncertainty present"])],
    practicalLevers: [
      "track symptom timing and triggers",
      "seek clinician review for red flags or persistent symptoms",
      "avoid combining multiple unvalidated interventions at once",
    ],
    warnings: [],
    confidence: 0.71,
  });
  return base.slice(0, 3);
}

export function mechanisticSynthesis(
  question: HealingQuery,
  mechanisms: MechanisticHypothesis[],
  traditions: AncientHealingLens[],
  hypotheses: IntegrativeHypothesis[],
  pubmedEvidence: PubMedEvidenceNote[],
): AsclepiusSynthesis {
  return {
    summary: [
      `Asclepius mapped a ${question.symptomDomain} healing problem through molecular mechanisms, ancestral systems, and PubMed evidence.`,
      hypotheses[0]?.title ?? "No dominant integrative hypothesis emerged.",
    ].join(" "),
    mechanisticSynthesis: mechanisms.length
      ? `Primary biological levers: ${mechanisms.map((item) => item.pathway).join(", ")}.`
      : "Mechanistic evidence is too thin; use broader clinical evaluation and better input data.",
    molecularHypotheses: mechanisms,
    ancestralPatterns: traditions,
    integrativeHypotheses: hypotheses,
    pubmedEvidence,
    disclaimers: [],
    nextSteps: uniqueMerge(
      [],
      [
        "Reduce intervention stacking and track one variable at a time.",
        "Use PubMed titles as prompts for deeper reading.",
        "Prioritize monitoring for severe, worsening, or unclear symptoms.",
      ],
      4,
    ),
  };
}

class MolecularMechanicsExpertAgent extends RuntimeExpertAgent {
  constructor() {
    super({
      id: "molecular-mechanics-expert",
      name: "Molecular Mechanics Expert",
      description: "Maps symptoms or performance problems to biological pathways, feedback loops, and mechanistic levers.",
      supervisorId: "medical",
      tier: "WARM",
      tags: ["molecular", "pathway", "biochemistry", "mechanism", "neuroimmune"],
      systemPrompt: withRuntimeInstructions(`You are the Molecular Mechanics Expert inside Asclepius.

Responsibilities:
- Translate symptoms and goals into mechanistic pathways with maximum depth.
- Prioritize biology that is actionable, measurable, and evidence-aware.
- Separate plausible mechanisms from narrative overreach.
- Be direct and authoritative. Deliver complete analysis without hedging.`, ASCLEPIUS_ADVANCED_MEDICINE_RULES),
      tools: [
        buildTool("trace_molecular_pathways", "Trace likely biological pathways for a query."),
        buildTool("estimate_interaction_risk", "Estimate whether combined interventions create confounding or safety risk."),
      ],
    });
  }

  protected async analyze(input: AgentInput): Promise<RuntimeAgentAnalysis> {
    const question = parseHealingQuery(input.prompt);
    const hypotheses = inferMechanisticHypotheses(question);
    return {
      result: {
        question,
        hypotheses,
        semanticProfile: this.baseSemanticProfile(input.prompt),
      },
      confidence: clamp01(mean(hypotheses.map((item) => item.evidenceStrength)) || 0.66),
      reasoning: "Mapped the prompt to biological feedback loops and candidate pathways.",
      toolsUsed: ["trace_molecular_pathways"],
      collaborationNeeded: ["ancient-medical-traditions", "cure-hypothesis-engine"],
    };
  }
}

class AncientMedicalTraditionsAgent extends RuntimeExpertAgent {
  constructor() {
    super({
      id: "ancient-medical-traditions",
      name: "Ancient Medical Traditions Scholar",
      description: "Reads healing problems through Ayurveda, TCM, Greco-Hippocratic, and ethnobotanical systems without collapsing them into modern medicine.",
      supervisorId: "medical",
      tier: "COLD",
      tags: ["ayurveda", "tcm", "hippocratic", "tradition", "ethnobotany"],
      systemPrompt: withRuntimeInstructions(`You are the Ancient Medical Traditions Scholar inside Asclepius.

Responsibilities:
- Surface ancestral systems thinking relevant to the problem with full depth.
- Preserve the integrity of traditional frameworks.
- Translate them into useful patterns and practical applications.
- Deliver complete traditional knowledge including formulas, dosages and protocols from each tradition.`, ASCLEPIUS_ADVANCED_MEDICINE_RULES),
      tools: [
        buildTool("compare_ancestral_systems", "Compare how ancestral systems frame the same healing problem."),
        buildTool("map_historical_remedies", "Map historical remedy patterns to modern safety-aware interpretation."),
      ],
    });
  }

  protected async analyze(input: AgentInput): Promise<RuntimeAgentAnalysis> {
    const question = parseHealingQuery(input.prompt);
    const traditions = inferAncientHealingLenses(question);
    return {
      result: {
        question,
        traditions,
        semanticProfile: this.baseSemanticProfile(input.prompt),
      },
      confidence: 0.7,
      reasoning: "Mapped the prompt to coherent ancestral-system lenses and remedy patterns.",
      toolsUsed: ["compare_ancestral_systems"],
      collaborationNeeded: ["molecular-mechanics-expert", "cure-hypothesis-engine"],
    };
  }
}

class CureHypothesisEngineAgent extends RuntimeExpertAgent {
  constructor() {
    super({
      id: "cure-hypothesis-engine",
      name: "Cure Hypothesis Engine",
      description: "Builds bounded, safety-aware integrative hypotheses from mechanisms, traditions, and evidence.",
      supervisorId: "medical",
      tier: "WARM",
      tags: ["integration", "hypothesis", "protocol", "safety", "evidence"],
      systemPrompt: withRuntimeInstructions(`You are the Cure Hypothesis Engine inside Asclepius.

Responsibilities:
- Combine mechanistic and ancestral insight into actionable protocols.
- Produce bounded, testable healing hypotheses with full detail.
- Include stepwise implementation with dosages, timing and monitoring.
- Be direct and complete. Deliver maximum practical value.`, ASCLEPIUS_ADVANCED_MEDICINE_RULES),
      tools: [
        buildTool("generate_integrative_protocol", "Generate bounded integrative hypotheses and implementation order."),
        buildTool("audit_safety_blindspots", "Audit safety blind spots and escalation triggers."),
      ],
    });
  }

  protected async analyze(input: AgentInput): Promise<RuntimeAgentAnalysis> {
    const context = (input.context ?? {}) as {
      question?: HealingQuery;
      mechanistic?: MechanisticHypothesis[];
      traditions?: AncientHealingLens[];
      evidence?: PubMedEvidenceNote[];
    };
    const question = context.question ?? parseHealingQuery(input.prompt);
    const hypotheses = buildIntegrativeHypotheses(
      question,
      context.mechanistic ?? inferMechanisticHypotheses(question),
      context.traditions ?? inferAncientHealingLenses(question),
      context.evidence ?? [],
    );
    return {
      result: {
        question,
        hypotheses,
        semanticProfile: this.baseSemanticProfile(input.prompt),
      },
      confidence: clamp01(mean(hypotheses.map((item) => item.confidence)) || 0.68),
      reasoning: "Combined biological pathways, ancestral systems, and available evidence into bounded hypotheses.",
      toolsUsed: ["generate_integrative_protocol", "audit_safety_blindspots"],
      collaborationNeeded: ["apollo", "athena"],
    };
  }
}

export class AsclepiusRuntime {
  private readonly molecularMechanicsExpert = new MolecularMechanicsExpertAgent();
  private readonly ancientMedicalTraditions = new AncientMedicalTraditionsAgent();
  private readonly cureHypothesisEngine = new CureHypothesisEngineAgent();

  async process(
    query: string,
    ctx: ExecutionContext = createExecutionContext(query),
  ): Promise<AgentOutput> {
    const startedAt = now();
    const question = parseHealingQuery(query);
    const [pubmedEvidence, molecularOutput, traditionsOutput] = await Promise.all([
      fetchPubMedEvidence(query),
      this.molecularMechanicsExpert.execute(
        {
          prompt: query,
          sessionId: ctx.sessionId,
          requestId: stableId(`asclepius:molecular:${query}`),
        },
        ctx,
      ),
      this.ancientMedicalTraditions.execute(
        {
          prompt: query,
          sessionId: ctx.sessionId,
          requestId: stableId(`asclepius:traditions:${query}`),
        },
        ctx,
      ),
    ]);

    const molecularHypotheses = ((molecularOutput.result as Record<string, unknown>).hypotheses ?? []) as MechanisticHypothesis[];
    const ancestralPatterns = ((traditionsOutput.result as Record<string, unknown>).traditions ?? []) as AncientHealingLens[];

    const cureOutput = await this.cureHypothesisEngine.execute(
      {
        prompt: query,
        context: {
          question,
          mechanistic: molecularHypotheses,
          traditions: ancestralPatterns,
          evidence: pubmedEvidence,
        },
        previousOutputs: [molecularOutput, traditionsOutput],
        sessionId: ctx.sessionId,
        requestId: stableId(`asclepius:integration:${query}`),
      },
      ctx,
    );

    const integrativeHypotheses = ((cureOutput.result as Record<string, unknown>).hypotheses ?? []) as IntegrativeHypothesis[];
    const synthesis = mechanisticSynthesis(
      question,
      molecularHypotheses,
      ancestralPatterns,
      integrativeHypotheses,
      pubmedEvidence,
    );

    return {
      agentId: "asclepius-runtime",
      result: {
        question,
        synthesis,
        pubmedEvidence,
      },
      confidence: clamp01(
        mean([
          molecularOutput.confidence,
          traditionsOutput.confidence,
          cureOutput.confidence,
          pubmedEvidence.length ? Math.min(pubmedEvidence.length, 4) / 5 : 0.45,
        ]),
      ),
      latencyMs: now() - startedAt,
      reasoning: "Asclepius fused molecular pathways, ancestral medical lenses, and a lightweight PubMed retrieval step.",
      toolsUsed: uniqueMerge(
        [],
        [
          ...(molecularOutput.toolsUsed ?? []),
          ...(traditionsOutput.toolsUsed ?? []),
          ...(cureOutput.toolsUsed ?? []),
          "pubmed-search",
        ],
        8,
      ),
      followUpSuggestions: synthesis.nextSteps,
      collaborationNeeded: ["apollo", "athena"],
    };
  }
}