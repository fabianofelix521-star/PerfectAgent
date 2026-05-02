import type { AgentInput, AgentOutput, ExecutionContext } from "@/types/agents";
import { clamp01, mean, now, stableId, uniqueMerge } from "@/runtimes/shared/cognitiveCore";
import {
  buildTool,
  createExecutionContext,
  inferKeywords,
  RuntimeExpertAgent,
  type RuntimeAgentAnalysis,
} from "@/runtimes/shared/runtimeAgentScaffold";
import {
  LOGOS_PHILOSOPHY_RULES,
  withRuntimeInstructions,
} from "@/runtimes/shared/runtimeInstructions";

export interface LogosQuestion {
  raw: string;
  focus: string;
  domains: string[];
  constraints: string[];
  aspiration: string;
}

export interface MetaphysicalBlueprint {
  thesis: string;
  ontologicalAxes: string[];
  epistemicMethod: string;
  tensions: string[];
  bridges: string[];
}

export interface SocietySignal {
  society: string;
  evidenceStatus: "documented" | "mixed" | "speculative";
  contribution: string;
  caution: string;
}

export interface DevelopmentProtocol {
  title: string;
  practices: string[];
  metrics: string[];
  shadows: string[];
}

export interface LogosSynthesis {
  summary: string;
  architecture: MetaphysicalBlueprint;
  societySignals: SocietySignal[];
  developmentProtocol: DevelopmentProtocol;
  unresolvedTensions: string[];
  principles: string[];
}

function parseLogosQuestion(text: string): LogosQuestion {
  const lower = text.toLowerCase();
  const focus =
    /metaphys|ontology|logos|epistem|being|reality/.test(lower)
      ? "metaphysics"
      : /society|masonry|hermetic|initiat|esoteric|order|secret/.test(lower)
        ? "initiatory-history"
        : /self|discipline|mastery|habit|character|purpose|meaning/.test(lower)
          ? "self-mastery"
          : "integrative-philosophy";
  const domains = uniqueMerge(
    [],
    [
      ...(focus === "metaphysics" ? ["ontology", "epistemology"] : []),
      ...(focus === "initiatory-history" ? ["historical networks", "symbolic transmission"] : []),
      ...(focus === "self-mastery" ? ["practice", "ethics", "discipline"] : []),
    ],
    5,
  );
  const constraints = text
    .split(/[.;\n]/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => /avoid|constraint|limit|skeptic|evidence|practical|grounded/i.test(chunk))
    .slice(0, 4);
  return {
    raw: text,
    focus,
    domains,
    constraints,
    aspiration: /purpose|meaning|direction|mission|calling/i.test(lower)
      ? "coherent life direction"
      : "clear conceptual architecture",
  };
}

function inferBlueprint(question: LogosQuestion): MetaphysicalBlueprint {
  const keywords = inferKeywords(question.raw, 10);
  const ontologicalAxes = uniqueMerge(
    [],
    [
      /consciousness|mind|awareness/.test(question.raw.toLowerCase()) ? "mind-world relation" : "form-matter relation",
      /ethic|good|virtue|character/.test(question.raw.toLowerCase()) ? "virtue-order relation" : "causation and order",
      /freedom|destiny|will/.test(question.raw.toLowerCase()) ? "freedom and necessity" : "appearance and essence",
    ],
    4,
  );
  return {
    thesis: `A sound logos for this query starts by ordering ${keywords.slice(0, 3).join(", ") || "its main concepts"} into one coherent worldview rather than chasing isolated fragments.`,
    ontologicalAxes,
    epistemicMethod: "Combine textual precision, historical context, and practical transformation before making totalizing claims.",
    tensions: [
      "Symbolic depth can become empty abstraction if detached from practice.",
      "Historical initiatory traditions are often romanticized beyond the evidence.",
    ],
    bridges: [
      "Move from ontology to ethics, then from ethics to disciplined action.",
      "Use history to clarify transmission, not to fuel conspiratorial inflation.",
    ],
  };
}

function inferSocietySignals(question: LogosQuestion): SocietySignal[] {
  const lower = question.raw.toLowerCase();
  const signals: SocietySignal[] = [];
  if (/hermetic|alchemy|hermes|thoth/.test(lower)) {
    signals.push({
      society: "Hermetic and alchemical circles",
      evidenceStatus: "mixed",
      contribution: "Preserved symbolic cosmology, transformation models, and analogical reasoning about nature and self.",
      caution: "Historical lineages are fragmented; later occult systems often back-project coherence onto sparse evidence.",
    });
  }
  if (/mason|freemason|rosicruc/.test(lower)) {
    signals.push({
      society: "Rosicrucian and masonic-adjacent print cultures",
      evidenceStatus: "documented",
      contribution: "Helped circulate symbolic, ethical, and civic initiation frameworks in early modern Europe.",
      caution: "Documented civic and symbolic influence should not be inflated into omnipotent conspiracy narratives.",
    });
  }
  if (/sufi|monastic|brotherhood|order|initiat/.test(lower)) {
    signals.push({
      society: "Monastic and initiatory communities",
      evidenceStatus: "documented",
      contribution: "Transmit practices through discipline, commentary, and embodied apprenticeship.",
      caution: "Different communities pursue radically different aims and cannot be flattened into one secret network.",
    });
  }
  if (!signals.length) {
    signals.push({
      society: "Initiatory and philosophical schools",
      evidenceStatus: "documented",
      contribution: "Structured communities often preserve difficult knowledge through practice, repetition, and selective transmission.",
      caution: "Transmission discipline is real; grand unifying hidden-history claims usually outrun the evidence.",
    });
  }
  return signals.slice(0, 3);
}

function buildDevelopmentProtocol(question: LogosQuestion): DevelopmentProtocol {
  const practices = uniqueMerge(
    [],
    [
      "daily reflective writing on first principles and contradictions noticed during the day",
      "one focused contemplative practice that reduces impulsive reactivity",
      "weekly dialogue between theory and action: what belief changed behavior this week?",
      question.focus === "self-mastery"
        ? "design one constraint-driven habit loop instead of many motivational promises"
        : "translate one metaphysical claim into one ethical commitment",
    ],
    5,
  );
  return {
    title: "Logos discipline protocol",
    practices,
    metrics: [
      "clarity of worldview in one page",
      "consistency between stated values and actual behavior",
      "frequency of confusion loops or reactive decision-making",
    ],
    shadows: [
      "mistaking symbolic language for evidence of literal hidden control",
      "using philosophy as identity performance instead of transformation",
      "building complexity faster than embodiment",
    ],
  };
}

class MetaphysicsArchitectAgent extends RuntimeExpertAgent {
  constructor() {
    super({
      id: "metaphysics-architect",
      name: "Metaphysics Architect",
      description: "Builds coherent ontological and epistemic architectures from philosophical prompts.",
      supervisorId: "philosophy",
      tier: "COLD",
      tags: ["logos", "metaphysics", "ontology", "epistemology", "meaning"],
      systemPrompt: withRuntimeInstructions(`You are the Metaphysics Architect inside Logos.

Responsibilities:
- Build a coherent worldview map from the query.
- Keep ontology, epistemology, and ethics connected.
- Preserve tension instead of collapsing every paradox too early.
    - Prefer conceptual clarity over mystical fog.`, LOGOS_PHILOSOPHY_RULES),
      tools: [
        buildTool("map_metaphysical_positions", "Map the metaphysical positions latent in a prompt."),
        buildTool("compare_worldview_architectures", "Compare competing worldview architectures."),
      ],
    });
  }

  protected async analyze(input: AgentInput): Promise<RuntimeAgentAnalysis> {
    const question = parseLogosQuestion(input.prompt);
    const blueprint = inferBlueprint(question);
    return {
      result: {
        question,
        blueprint,
        semanticProfile: this.baseSemanticProfile(input.prompt),
      },
      confidence: 0.83,
      reasoning: "Built the ontological and epistemic skeleton required to think clearly about the prompt.",
      toolsUsed: ["map_metaphysical_positions"],
      collaborationNeeded: ["secret-knowledge-societies", "personal-development-master"],
    };
  }
}

class SecretKnowledgeSocietiesAgent extends RuntimeExpertAgent {
  constructor() {
    super({
      id: "secret-knowledge-societies",
      name: "Secret Knowledge Societies Analyst",
      description: "Analyzes initiatory, esoteric, and symbolic communities with historical rigor and anti-conspiracy discipline.",
      supervisorId: "ancient",
      tier: "COLD",
      tags: ["hermetic", "initiation", "esoteric", "history", "transmission"],
      systemPrompt: withRuntimeInstructions(`You are the Secret Knowledge Societies Analyst inside Logos.

Responsibilities:
- Separate documented initiatory history from sensational speculation.
- Identify what symbolic communities preserved, practiced, or circulated.
- Explain why secrecy emerges in some traditions without inflating hidden-power myths.
    - Default to textual, historical, and institutional evidence.`, LOGOS_PHILOSOPHY_RULES),
      tools: [
        buildTool("audit_initiatory_networks", "Audit initiatory networks with evidence-status labels."),
        buildTool("separate_documented_from_speculative", "Separate documented signals from speculative claims."),
      ],
    });
  }

  protected async analyze(input: AgentInput): Promise<RuntimeAgentAnalysis> {
    const question = parseLogosQuestion(input.prompt);
    const signals = inferSocietySignals(question);
    return {
      result: {
        question,
        signals,
        semanticProfile: this.baseSemanticProfile(input.prompt),
      },
      confidence: clamp01(0.68 - signals.filter((item) => item.evidenceStatus === "speculative").length * 0.08),
      reasoning: "Classified the initiatory-history layer with explicit evidence-status labels.",
      toolsUsed: ["audit_initiatory_networks", "separate_documented_from_speculative"],
      collaborationNeeded: ["metaphysics-architect"],
    };
  }
}

class PersonalDevelopmentMasterAgent extends RuntimeExpertAgent {
  constructor() {
    super({
      id: "personal-development-master",
      name: "Personal Development Master",
      description: "Translates worldview and symbolic material into a disciplined life protocol.",
      supervisorId: "philosophy",
      tier: "WARM",
      tags: ["discipline", "purpose", "practice", "character", "self-mastery"],
      systemPrompt: withRuntimeInstructions(`You are the Personal Development Master inside Logos.

Responsibilities:
- Convert symbolic and philosophical insight into practice.
- Prefer repeatable disciplines over motivational excess.
- Keep shadow risks explicit.
    - Make transformation measurable and embodied.`, LOGOS_PHILOSOPHY_RULES),
      tools: [
        buildTool("design_self_mastery_protocol", "Design a self-mastery protocol from a philosophical prompt."),
        buildTool("map_shadow_risks", "Map the shadow risks of the chosen development path."),
      ],
    });
  }

  protected async analyze(input: AgentInput): Promise<RuntimeAgentAnalysis> {
    const question = parseLogosQuestion(input.prompt);
    const protocol = buildDevelopmentProtocol(question);
    return {
      result: {
        question,
        protocol,
        semanticProfile: this.baseSemanticProfile(input.prompt),
      },
      confidence: 0.8,
      reasoning: "Converted abstract inquiry into a disciplined developmental protocol.",
      toolsUsed: ["design_self_mastery_protocol", "map_shadow_risks"],
      collaborationNeeded: ["metaphysics-architect"],
    };
  }
}

export class LogosRuntime {
  private readonly metaphysicsArchitect = new MetaphysicsArchitectAgent();
  private readonly secretKnowledgeSocieties = new SecretKnowledgeSocietiesAgent();
  private readonly personalDevelopmentMaster = new PersonalDevelopmentMasterAgent();

  async process(
    query: string,
    ctx: ExecutionContext = createExecutionContext(query),
  ): Promise<AgentOutput> {
    const startedAt = now();
    const [architectureOutput, societiesOutput, protocolOutput] = await Promise.all([
      this.metaphysicsArchitect.execute(
        {
          prompt: query,
          sessionId: ctx.sessionId,
          requestId: stableId(`logos:architecture:${query}`),
        },
        ctx,
      ),
      this.secretKnowledgeSocieties.execute(
        {
          prompt: query,
          sessionId: ctx.sessionId,
          requestId: stableId(`logos:societies:${query}`),
        },
        ctx,
      ),
      this.personalDevelopmentMaster.execute(
        {
          prompt: query,
          sessionId: ctx.sessionId,
          requestId: stableId(`logos:development:${query}`),
        },
        ctx,
      ),
    ]);

    const architecture = ((architectureOutput.result as Record<string, unknown>).blueprint ?? inferBlueprint(parseLogosQuestion(query))) as MetaphysicalBlueprint;
    const societySignals = ((societiesOutput.result as Record<string, unknown>).signals ?? []) as SocietySignal[];
    const developmentProtocol = ((protocolOutput.result as Record<string, unknown>).protocol ?? buildDevelopmentProtocol(parseLogosQuestion(query))) as DevelopmentProtocol;
    const synthesis: LogosSynthesis = {
      summary: [
        `Logos organized the query into a worldview architecture, a transmission-history filter, and a practical discipline path.`,
        architecture.thesis,
      ].join(" "),
      architecture,
      societySignals,
      developmentProtocol,
      unresolvedTensions: uniqueMerge(
        architecture.tensions,
        societySignals.map((item) => item.caution),
        6,
      ),
      principles: uniqueMerge(
        [],
        [
          ...architecture.bridges,
          "Prefer documented lineage over mythic inflation.",
          "Translate meaning into disciplined behavior.",
        ],
        6,
      ),
    };

    return {
      agentId: "logos-runtime",
      result: {
        synthesis,
      },
      confidence: clamp01(
        mean([
          architectureOutput.confidence,
          societiesOutput.confidence,
          protocolOutput.confidence,
        ]),
      ),
      latencyMs: now() - startedAt,
      reasoning: "Logos combined metaphysical architecture, initiatory-history filtering, and self-mastery practice.",
      toolsUsed: uniqueMerge(
        [],
        [
          ...(architectureOutput.toolsUsed ?? []),
          ...(societiesOutput.toolsUsed ?? []),
          ...(protocolOutput.toolsUsed ?? []),
        ],
        8,
      ),
      followUpSuggestions: developmentProtocol.practices.slice(0, 3),
      collaborationNeeded: ["sophia", "athena", "oracle"],
    };
  }
}