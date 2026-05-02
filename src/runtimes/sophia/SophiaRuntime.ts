import type { AgentInput, AgentOutput, AgentTool, ExecutionContext } from "@/types/agents";
import { clamp01, keywordScore, mean, now, stableId, uniqueMerge } from "@/runtimes/shared/cognitiveCore";
import {
  buildTool,
  createExecutionContext,
  inferKeywords,
  RuntimeExpertAgent,
  type RuntimeAgentAnalysis,
} from "@/runtimes/shared/runtimeAgentScaffold";
import {
  SOPHIA_SPIRITUAL_RULES,
  withRuntimeInstructions,
} from "@/runtimes/shared/runtimeInstructions";

export interface ParallelText {
  tradition: string;
  text: string;
  similarity: number;
  sharedArchetype: string;
  possibleConnection: string;
}

export interface SacredTextAnalysis {
  text: string;
  tradition: string;
  language: string;
  scriptType?: string;
  literalMeaning: string;
  esotericMeaning: string;
  historicalContext: string;
  parallelTexts: ParallelText[];
  archaeologicalEvidence?: string;
  scholarlyDebates: string[];
  practicalWisdom: string;
}

export interface TraditionLink {
  sourceTradition: string;
  targetTradition: string;
  bridge: string;
  confidence: number;
}

export interface ParadoxResolution {
  paradox: string;
  traditions: string[];
  resolution: string;
  practicalMeaning: string;
}

export interface Archetype {
  name: string;
  description: string;
  manifestations: Map<string, string>;
  psychologicalCorrelate: string;
  quantumAnalogy?: string;
}

export interface WisdomField {
  universalArchetypes: Map<string, Archetype>;
  crossTraditionLinks: Map<string, TraditionLink[]>;
  paradoxResolutions: Map<string, ParadoxResolution>;
}

export interface SophiaPerspective {
  tradition: string;
  specialist: string;
  analysis: SacredTextAnalysis;
  confidence: number;
}

const ARCHETYPE_LIBRARY: Array<{
  id: string;
  keywords: string[];
  description: string;
  correlate: string;
  analogy: string;
}> = [
  {
    id: "death-rebirth",
    keywords: ["death", "rebirth", "resurrection", "underworld", "renewal"],
    description: "Sacred pattern of descent, dissolution, and transformed return.",
    correlate: "Individuation through symbolic ego death.",
    analogy: "Wave collapse followed by a new probability landscape.",
  },
  {
    id: "divine-wisdom",
    keywords: ["wisdom", "logos", "sophia", "torah", "dharma", "tao"],
    description: "The intelligible order that guides cosmos and conscience.",
    correlate: "The psyche orienting toward meaning and coherence.",
    analogy: "An implicate order shaping observable emergence.",
  },
  {
    id: "sacred-law",
    keywords: ["law", "commandment", "covenant", "ethics", "ritual"],
    description: "Moral and ritual structure linking human action to the cosmic order.",
    correlate: "Value hierarchy and disciplined integration.",
    analogy: "Constraint fields that stabilize complex systems.",
  },
  {
    id: "cosmic-tree",
    keywords: ["tree", "axis", "ladder", "mountain", "world"],
    description: "A vertical map joining heaven, earth, and underworld.",
    correlate: "Connection between instinct, ego, and transpersonal meaning.",
    analogy: "Multi-scale dimensional connectivity.",
  },
];

const TRADITION_PARALLELS: Record<string, ParallelText[]> = {
  hebraic: [
    {
      tradition: "Christian mystical",
      text: "Logos and Wisdom theology in John and Patristics.",
      similarity: 0.86,
      sharedArchetype: "divine-wisdom",
      possibleConnection: "Shared Second Temple symbolic world and scriptural reinterpretation.",
    },
    {
      tradition: "Taoist",
      text: "Tao as hidden ordering principle behind manifestation.",
      similarity: 0.63,
      sharedArchetype: "divine-wisdom",
      possibleConnection: "Different civilizations expressing an intelligible cosmic order.",
    },
  ],
  ethiopian: [
    {
      tradition: "Hebraic apocalyptic",
      text: "Enochic and Jubilees traditions preserved in Ge'ez canonical memory.",
      similarity: 0.92,
      sharedArchetype: "divine-wisdom",
      possibleConnection: "Shared Second Temple archive preserved through Ethiopian reception.",
    },
  ],
  mesopotamian: [
    {
      tradition: "Hebraic",
      text: "Flood and primordial chaos narratives across Atrahasis, Gilgamesh, and Genesis.",
      similarity: 0.89,
      sharedArchetype: "death-rebirth",
      possibleConnection: "Shared Near Eastern cultural memory with theological reframing.",
    },
  ],
  christian: [
    {
      tradition: "Buddhist",
      text: "Kenosis, compassion, and transfiguration compared to emptiness and bodhisattva compassion.",
      similarity: 0.58,
      sharedArchetype: "death-rebirth",
      possibleConnection: "Analogous contemplative structures, not a claim of direct dependence.",
    },
  ],
  asian: [
    {
      tradition: "Kabbalistic",
      text: "Ein Sof and sunyata compared as apophatic horizons.",
      similarity: 0.61,
      sharedArchetype: "divine-wisdom",
      possibleConnection: "Parallel apophatic language addressing the unsayable ground.",
    },
  ],
  indigenous: [
    {
      tradition: "Hermetic",
      text: "As-above-so-below resonances with land-sky reciprocity and sacred ecology.",
      similarity: 0.54,
      sharedArchetype: "cosmic-tree",
      possibleConnection: "Different symbolic grammars expressing relational cosmology.",
    },
  ],
};

const HEBREW_GEMATRIA: Record<string, number> = {
  a: 1,
  b: 2,
  g: 3,
  d: 4,
  h: 5,
  v: 6,
  z: 7,
  ch: 8,
  t: 9,
  y: 10,
  k: 20,
  l: 30,
  m: 40,
  n: 50,
  s: 60,
  o: 70,
  p: 80,
  tz: 90,
  q: 100,
  r: 200,
  sh: 300,
  th: 400,
};

function computeGematriaValue(word: string): number {
  let total = 0;
  const normalized = word.toLowerCase().replace(/[^a-z]/g, "");
  let index = 0;
  while (index < normalized.length) {
    const tri = normalized.slice(index, index + 2);
    if (tri in HEBREW_GEMATRIA) {
      total += HEBREW_GEMATRIA[tri] ?? 0;
      index += 2;
      continue;
    }
    total += HEBREW_GEMATRIA[normalized[index] ?? ""] ?? 0;
    index += 1;
  }
  return total;
}

function sharedArchetypesForQuery(query: string): string[] {
  return ARCHETYPE_LIBRARY.filter((item) => keywordScore(query, item.keywords) > 0.08).map(
    (item) => item.id,
  );
}

function buildSacredAnalysis(
  text: string,
  tradition: string,
  language: string,
  scriptType: string | undefined,
  literalMeaning: string,
  esotericMeaning: string,
  historicalContext: string,
  practicalWisdom: string,
  scholarlyDebates: string[],
  parallelTexts: ParallelText[],
  archaeologicalEvidence?: string,
): SacredTextAnalysis {
  return {
    text,
    tradition,
    language,
    scriptType,
    literalMeaning,
    esotericMeaning,
    historicalContext,
    parallelTexts,
    archaeologicalEvidence,
    scholarlyDebates,
    practicalWisdom,
  };
}

function makeCollaborationHints(ids: string[]): string[] {
  return uniqueMerge([], ids, 4);
}

abstract class BaseSophiaAgent extends RuntimeExpertAgent {
  protected synthesizePerspective(
    input: AgentInput,
    tradition: string,
    analysis: SacredTextAnalysis,
    confidence: number,
    toolsUsed: string[],
    collaborationNeeded: string[],
  ): RuntimeAgentAnalysis {
    return {
      result: {
        specialist: this.name,
        tradition,
        analysis,
        semanticProfile: this.baseSemanticProfile(input.prompt),
      },
      confidence,
      reasoning: `${this.name} mapped literal, esoteric, historical, and practical dimensions for ${tradition}.`,
      toolsUsed,
      collaborationNeeded,
      followUpSuggestions: analysis.parallelTexts.slice(0, 2).map(
        (item) => `Compare with ${item.tradition}: ${item.sharedArchetype}`,
      ),
    };
  }
}

export class PaleoHebraistAgent extends BaseSophiaAgent {
  constructor() {
    const tools: AgentTool[] = [
      buildTool("analyze_hebrew_text", "Deep Hebrew or Aramaic analysis.", async (params) => {
        const text = String(params.text ?? "");
        const keywords = inferKeywords(text, 8);
        return {
          letterAnalysis: Object.fromEntries(
            keywords.slice(0, 6).map((token) => [token, `Root resonance for ${token}`]),
          ),
          gematria: computeGematriaValue(text),
          meanings: {
            peshat: "Literal covenantal and textual layer.",
            remez: "Symbolic echo through names and motifs.",
            derash: "Interpretive layer through rabbinic association.",
            sod: "Mystical reading through sefirot and divine names.",
          },
          crossReferences: [
            "Dead Sea Scrolls textual variants",
            "Septuagint and Masoretic comparison",
          ],
        };
      }),
      buildTool("compute_gematria", "Compute a transliterated gematria value.", async (params) => {
        const word = String(params.word ?? "");
        return {
          value: computeGematriaValue(word),
          methods: {
            standard: computeGematriaValue(word),
            reduced: computeGematriaValue(word) % 9,
          },
          connections: sharedArchetypesForQuery(word),
        };
      }),
      buildTool(
        "find_dead_sea_scroll_parallel",
        "Find Dead Sea Scroll thematic parallels.",
        async (params) => ({
          scrolls: ["1QIsa", "4QEnoch", "Community Rule"],
          variants: [`Possible textual echo for ${String(params.passage ?? "passage")}`],
          significance: "Useful for mapping Second Temple textual plurality.",
        }),
      ),
    ];
    super({
      id: "paleo-hebraist",
      name: "Paleo-Hebrew & Ancient Semitic Scholar",
      description: "Paleo-Hebrew, Torah, Qumran, Kabbalah, and layered Semitic textual analysis.",
      supervisorId: "ancient",
      tier: "COLD",
      tags: ["hebrew", "torah", "qumran", "kabbalah", "dead-sea-scrolls"],
      systemPrompt: withRuntimeInstructions(`You are the deepest Paleo-Hebrew and ancient Semitic scholar in the swarm.

Primary domains:
- Paleo-Hebrew pictographic layers and triliteral roots.
- Torah through PaRDeS: peshat, remez, derash, sod.
- Qumran, targumic traditions, Septuagint vs Masoretic textual criticism.
- Kabbalah: sefirot, Ein Sof, tzimtzum, shevirat ha-kelim, tikkun.
- Divine names, gematria, notarikon, temura when relevant.

Always return:
- Original-language framing when possible.
- Letter and root awareness.
- Historical textual context.
- Esoteric reading only when clearly separated from philology.
- Cross-tradition resonance without flattening differences.`, SOPHIA_SPIRITUAL_RULES),
      tools,
    });
  }

  protected async analyze(input: AgentInput): Promise<RuntimeAgentAnalysis> {
    const keywords = inferKeywords(input.prompt, 8);
    const analysis = buildSacredAnalysis(
      input.prompt,
      "Hebraic and Kabbalistic",
      "Hebrew / Aramaic",
      /paleo|qumran|dead sea/i.test(input.prompt) ? "paleo-hebrew" : "square-hebrew",
      `The query foregrounds covenant, naming, and textual layers around ${keywords[0] ?? "the passage"}.`,
      "Hidden meaning emerges through root structures, divine naming, and the movement from written symbol to cosmological pattern.",
      "Anchored in Second Temple textual plurality, rabbinic hermeneutics, and later kabbalistic developments.",
      "Read sacred law as a discipline of perception: names shape attention, attention shapes action.",
      [
        "How far kabbalistic readings should be projected back onto earlier Hebrew texts.",
        "Qumran variants vs later canonical stabilization.",
      ],
      TRADITION_PARALLELS.hebraic,
      "Epigraphic anchors include Qumran manuscripts, Gezer, Samaria ostraca, and paleo-hebrew inscriptions.",
    );
    return this.synthesizePerspective(
      input,
      "hebraic",
      analysis,
      0.93,
      ["analyze_hebrew_text", "compute_gematria"],
      makeCollaborationHints(["ethiopian-canon-scholar", "comparative-synthesizer"]),
    );
  }
}

export class EthiopianCanonScholarAgent extends BaseSophiaAgent {
  constructor() {
    super({
      id: "ethiopian-canon-scholar",
      name: "Ethiopian Orthodox & Ge'ez Scripture Scholar",
      description: "Enochic corpus, Ge'ez scripture, Kebra Nagast, Jubilees, and Ethiopian canonical memory.",
      supervisorId: "ancient",
      tier: "COLD",
      tags: ["ethiopian", "geez", "enoch", "kebra-nagast", "jubilees"],
      systemPrompt: withRuntimeInstructions(`You are the deepest scholar of Ethiopian Orthodox scripture and Ge'ez textual transmission.

Primary domains:
- 1 Enoch, 2 Enoch, Jubilees, Kebra Nagast, Testament traditions.
- Ethiopian canonical memory as a preservation chamber for Second Temple archives.
- Ge'ez reception history, Axum, Ark traditions, and historical context.
- Qumran parallels, apocalyptic motifs, calendrical debates, and canonical uniqueness.

Always return:
- Ge'ez-aware framing.
- Ethiopian theological context, not only external comparison.
- Historical and archaeological restraint.
- Direct bridges to Second Temple material when warranted.`, SOPHIA_SPIRITUAL_RULES),
      tools: [
        buildTool("analyze_enoch_passage", "Analyze an Enochic passage with Ethiopian framing.", async (params) => ({
          geezText: "Ge'ez witness summary",
          translation: `Focused rendering of chapter ${String(params.chapter ?? "?")}`,
          analysis: "Angelic mediation, calendrical symbolism, and apocalyptic horizon.",
          qumranParallels: ["4QEnoch fragments", "Jubilees calendrical echoes"],
          ntConnections: ["Jude", "2 Peter", "apocalyptic Son of Man motifs"],
        })),
        buildTool("trace_ark_of_covenant", "Trace Ark of the Covenant tradition and debate.", async () => ({
          biblicalRecord: "Ark traditions across Torah, Kings, and later memory.",
          ethiopianTradition: "Kebra Nagast preserves the Axum-centered lineage claim.",
          archaeologicalEvidence: "No decisive public verification; discussion remains contested.",
          scholarlyDebate: "Mix of living devotion, national theology, and historical caution.",
        })),
      ],
    });
  }

  protected async analyze(input: AgentInput): Promise<RuntimeAgentAnalysis> {
    const analysis = buildSacredAnalysis(
      input.prompt,
      "Ethiopian Orthodox",
      "Ge'ez",
      "Ge'ez script",
      "The query is interpreted through Ethiopian canonical preservation of apocalyptic and royal memory.",
      "Its deeper layer concerns hidden archives, angelic mediation, and sacred custodianship.",
      "Grounded in Axumite Christianity, Second Temple textual inheritance, and long liturgical transmission.",
      "Preserved memory becomes a form of resistance: wisdom survives by being housed in living ritual communities.",
      [
        "Dating and compositional layers inside Enochic traditions.",
        "Historical status of Ark transfer traditions in Kebra Nagast.",
      ],
      TRADITION_PARALLELS.ethiopian,
      "Aksum, monastic manuscript culture, and Qumran fragments are the main archaeological-historical anchors.",
    );
    return this.synthesizePerspective(
      input,
      "ethiopian",
      analysis,
      0.91,
      ["analyze_enoch_passage", "trace_ark_of_covenant"],
      makeCollaborationHints(["paleo-hebraist", "christian-mysticism-scholar"]),
    );
  }
}

export class MesopotamianSumerianScholarAgent extends BaseSophiaAgent {
  constructor() {
    super({
      id: "mesopotamian-sumerian-scholar",
      name: "Mesopotamian & Sumerian Civilization Expert",
      description: "Cuneiform cosmology, flood narratives, divine kingship, and Near Eastern comparative myth.",
      supervisorId: "ancient",
      tier: "COLD",
      tags: ["sumerian", "akkadian", "babylonian", "cuneiform", "gilgamesh"],
      systemPrompt: withRuntimeInstructions(`You are the deepest Mesopotamian and Sumerian textual scholar in the swarm.

Primary domains:
- Enuma Elish, Atrahasis, Gilgamesh, royal hymns, lamentations, Inanna cycle.
- Sumerian, Akkadian, Babylonian, and Assyrian textual strata.
- Archaeological context for Ur, Uruk, Eridu, Nippur, Lagash, and Nineveh.
- Careful comparison with Biblical and later mythic corpora.

Always return:
- Mainstream academic framing first.
- Clear separation between evidence and sensational speculation.
- Tablet, context, and transmission notes where possible.
- Near Eastern comparative rigor.`, SOPHIA_SPIRITUAL_RULES),
      tools: [
        buildTool("analyze_cuneiform_text", "Analyze Sumerian or Akkadian cuneiform material.", async (params) => ({
          transliteration: `Tablet ${String(params.tablet ?? "unknown")} transliteration scaffold`,
          translation: "Structured translation summary with mythic and royal motifs.",
          context: `Dynastic frame: ${String(params.dynasty ?? "unspecified")}`,
          parallels: ["Genesis flood traditions", "Chaoskampf myth patterns"],
        })),
        buildTool("compare_flood_narratives", "Compare flood narratives across traditions.", async () => ({
          atrahasis: { motif: "divine reset" },
          gilgamesh: { motif: "immortality and survival memory" },
          genesis: { motif: "covenant and moral reframing" },
          similarities: ["chosen survivor", "vessel", "post-flood offering"],
          differences: ["theological framing", "reason for the flood", "post-flood covenant"],
          historicalEvidence: "Shared cultural memory in the ancient Near East is the strongest academic bridge.",
        })),
      ],
    });
  }

  protected async analyze(input: AgentInput): Promise<RuntimeAgentAnalysis> {
    const analysis = buildSacredAnalysis(
      input.prompt,
      "Mesopotamian / Sumerian",
      "Sumerian / Akkadian",
      "cuneiform",
      "The query is read through cosmology, kingship, flood memory, and divine-human boundary stories.",
      "Its deeper layer often concerns civilization as a sacred gift that is also morally unstable.",
      "Situated in temple-city cultures where myth, law, ritual, and sovereignty were inseparable.",
      "Ancient myths here train humility: order is precious because it always emerges from fragile chaos.",
      [
        "How directly Biblical texts depend on Mesopotamian precedents versus sharing a larger mythic environment.",
        "Where modern fringe readings exceed the cuneiform evidence.",
      ],
      TRADITION_PARALLELS.mesopotamian,
      "Archaeological anchors include Ashurbanipal's library, royal inscriptions, and excavated tablets from key Mesopotamian cities.",
    );
    return this.synthesizePerspective(
      input,
      "mesopotamian",
      analysis,
      0.92,
      ["analyze_cuneiform_text", "compare_flood_narratives"],
      makeCollaborationHints(["paleo-hebraist", "comparative-synthesizer"]),
    );
  }
}

export class ChristianMysticismScholarAgent extends BaseSophiaAgent {
  constructor() {
    super({
      id: "christian-mysticism-scholar",
      name: "Christian Mysticism & Theological Depth Scholar",
      description: "Canonical, apocryphal, patristic, gnostic, and contemplative Christian traditions.",
      supervisorId: "ancient",
      tier: "COLD",
      tags: ["christianity", "mysticism", "gnosticism", "patristics", "orthodox"],
      systemPrompt: withRuntimeInstructions(`You are the deepest Christian mystical and patristic scholar in the swarm.

Primary domains:
- Canonical and apocryphal gospel traditions.
- Nag Hammadi, gnostic cosmologies, and early Christian diversity.
- Greek New Testament, patristics, apophatic theology, hesychasm, contemplative traditions.
- Historical Jesus debates and theological development.

Always return:
- Greek-aware textual framing when relevant.
- Distinction between historical-critical and confessional readings.
- Mystical implications without collapsing doctrinal differences.
- Clear note when evidence is late, fragmentary, or contested.`, SOPHIA_SPIRITUAL_RULES),
      tools: [
        buildTool("analyze_greek_nt", "Analyze Greek New Testament language.", async (params) => ({
          greek: "Greek textual focus scaffold",
          wordStudy: { focus: String(params.focus ?? "logos") },
          syntaxAnalysis: `Passage focus: ${String(params.passage ?? "unspecified")}`,
          theologicalImplications: "Tracks semantic density, narrative placement, and later doctrinal use.",
        })),
        buildTool("compare_gospel_traditions", "Compare canonical and apocryphal gospel streams.", async (params) => ({
          canonical: { emphasis: "public proclamation" },
          apocryphal: { emphasis: "interiorized revelatory sayings" },
          historicalJesus: `Topic focus: ${String(params.topic ?? "Jesus tradition")}`,
          theologicalDevelopment: "Highlights diversity, reception, canonization, and contemplative afterlives.",
        })),
      ],
    });
  }

  protected async analyze(input: AgentInput): Promise<RuntimeAgentAnalysis> {
    const analysis = buildSacredAnalysis(
      input.prompt,
      "Christian mystical",
      "Greek / Coptic / Syriac / Latin",
      undefined,
      "The query is framed through gospel traditions, patristic theology, and contemplative practice.",
      "Its deeper layer often concerns Logos, kenosis, resurrection, and the transformation of the inner person.",
      "Located in Second Temple Judaism, Greco-Roman intellectual worlds, and the later monastic-patristic traditions.",
      "The practical core is transfiguration through attention, compassion, and disciplined prayer.",
      [
        "How to read gnostic literature without projecting later categories backward too simplistically.",
        "Historical Jesus reconstructions versus confessional Christology.",
      ],
      TRADITION_PARALLELS.christian,
      "Primary evidence comes from canonical manuscripts, Nag Hammadi codices, patristic corpora, and monastic textual traditions.",
    );
    return this.synthesizePerspective(
      input,
      "christian",
      analysis,
      0.93,
      ["analyze_greek_nt", "compare_gospel_traditions"],
      makeCollaborationHints(["paleo-hebraist", "asian-spiritual-traditions", "comparative-synthesizer"]),
    );
  }
}

export class AsianSpiritualTraditionsAgent extends BaseSophiaAgent {
  constructor() {
    super({
      id: "asian-spiritual-traditions",
      name: "Hindu, Buddhist, Taoist & Asian Traditions Master",
      description: "Vedanta, Buddhism, Taoism, yoga, tantra, contemplative practice, and non-dual thought.",
      supervisorId: "ancient",
      tier: "COLD",
      tags: ["vedanta", "buddhism", "taoism", "yoga", "tantra", "zen"],
      systemPrompt: withRuntimeInstructions(`You are the deepest scholar of Hindu, Buddhist, Taoist, and broader Asian contemplative traditions.

Primary domains:
- Vedas, Upanishads, Gita, Vedanta, tantra, yoga.
- Pali canon, Mahayana, Vajrayana, Zen, Dzogchen, Mahamudra.
- Tao Te Ching, Zhuangzi, I Ching, alchemical Taoism.
- Practice implications: meditation, ethics, embodiment, and liberation.

Always return:
- Sanskrit, Pali, or classical Chinese framing when relevant.
- Distinction among schools inside each tradition.
- Practice-aware interpretation, not only concepts.
- Careful comparison with Western and Abrahamic parallels.`, SOPHIA_SPIRITUAL_RULES),
      tools: [
        buildTool("analyze_sanskrit_text", "Analyze Sanskrit, Pali, or Chinese contemplative passages.", async (params) => ({
          devanagari: "Indic text scaffold",
          transliteration: String(params.text ?? ""),
          wordByWord: { tradition: String(params.tradition ?? "unknown") },
          philosophicalAnalysis: "Maps ontology, praxis, and contemplative aim.",
        })),
        buildTool("compare_meditation_traditions", "Compare contemplative practices across traditions.", async (params) => ({
          traditions: {
            zen: "non-conceptual sitting",
            vedanta: "self-inquiry",
            hesychasm: "prayerful recollection",
          },
          commonalities: ["attention training", "ego decentering", "ethical purification"],
          neuroscientificEvidence: "Consistent effects on attention regulation and stress response; stronger claims remain contested.",
          practicalGuidance: `Practice theme: ${String(params.practice ?? "meditation")}`,
        })),
      ],
    });
  }

  protected async analyze(input: AgentInput): Promise<RuntimeAgentAnalysis> {
    const analysis = buildSacredAnalysis(
      input.prompt,
      "Asian spiritual traditions",
      "Sanskrit / Pali / Classical Chinese / Tibetan",
      undefined,
      "The query is read through liberation, non-duality, emptiness, cosmic order, and embodied contemplative discipline.",
      "Its deeper layer concerns the relation between self, awareness, and the ungraspable ground of reality.",
      "Situated in long lineages of commentary, monastic transmission, and practical experimentation with mind and body.",
      "Real wisdom appears as disciplined freedom: less compulsion, more clarity, more compassionate action.",
      [
        "How directly non-dual and emptiness traditions can be compared without flattening irreducible differences.",
        "Modern neuroscience often measures effects of practice, not the full metaphysical claims of the traditions.",
      ],
      TRADITION_PARALLELS.asian,
      "Evidence spans textual canons, living commentarial schools, pilgrimage archives, and contemporary contemplative science.",
    );
    return this.synthesizePerspective(
      input,
      "asian",
      analysis,
      0.94,
      ["analyze_sanskrit_text", "compare_meditation_traditions"],
      makeCollaborationHints(["christian-mysticism-scholar", "comparative-synthesizer"]),
    );
  }
}

export class IndigenousSacredTraditionsAgent extends BaseSophiaAgent {
  constructor() {
    super({
      id: "indigenous-sacred-traditions",
      name: "Indigenous & Shamanic Sacred Traditions Scholar",
      description: "Indigenous, shamanic, Mesoamerican, Andean, Oceanic, African, and circumpolar sacred traditions.",
      supervisorId: "ancient",
      tier: "COLD",
      tags: ["shamanism", "indigenous", "mesoamerican", "polynesian", "african"],
      systemPrompt: withRuntimeInstructions(`You are the deepest scholar of Indigenous and shamanic sacred traditions.

Primary domains:
- Mesoamerican, Amazonian, Andean, North American, Oceanic, African, Siberian traditions.
- Respectful treatment of cosmology, ritual, ecology, divination, and healing.
- Ethnobotanical and ceremonial knowledge without reductionism.
- Academic, anthropological, and community-sensitive framing.

Always return:
- Respect for living communities.
- No folklore trivialization.
- Clear distinction between ethnography, archaeology, and speculative diffusionism.
- Sacred ecology and relational ontology as full philosophies.`, SOPHIA_SPIRITUAL_RULES),
      tools: [
        buildTool("analyze_cosmology", "Analyze a specific Indigenous cosmology.", async (params) => ({
          cosmology: { tradition: String(params.tradition ?? "unknown") },
          rituals: ["seasonal ceremony", "initiation", "healing rite"],
          symbolism: { axis: "land-sky reciprocity" },
          modernRelevance: `Aspect focus: ${String(params.aspect ?? "cosmology")}`,
        })),
        buildTool("find_universal_patterns", "Find cross-Indigenous patterns without flattening difference.", async (params) => ({
          manifestations: {
            mesoamerica: "calendar and cyclical worlds",
            lakota: "sacred hoop and relation",
            maori: "ancestral genealogy and living cosmology",
          },
          commonStructure: "Reciprocity, land relation, ancestor memory, and initiatory transformation.",
          jungianParallel: "A living symbolic grammar of relation rather than isolated ego identity.",
          implications: `Theme analyzed: ${String(params.theme ?? "sacred pattern")}`,
        })),
      ],
    });
  }

  protected async analyze(input: AgentInput): Promise<RuntimeAgentAnalysis> {
    const analysis = buildSacredAnalysis(
      input.prompt,
      "Indigenous sacred traditions",
      "Multilingual oral-textual traditions",
      undefined,
      "The query is framed around relational cosmology, ancestor memory, sacred land, initiation, and ceremonial intelligence.",
      "Its deeper layer concerns reality as reciprocal participation rather than detached observation.",
      "Located in oral, ritual, ecological, and community-sustained transmission systems that often resist textual reduction.",
      "Practical wisdom here means learning how to belong: to place, kin, season, and obligation.",
      [
        "How much of current documentation reflects colonial mediation rather than full Indigenous self-description.",
        "Claims of transoceanic contact require stronger evidence than symbolic similarity alone.",
      ],
      TRADITION_PARALLELS.indigenous,
      "Evidence mixes archaeology, oral memory, ethnography, linguistic continuity, and ceremonial survival.",
    );
    return this.synthesizePerspective(
      input,
      "indigenous",
      analysis,
      0.91,
      ["analyze_cosmology", "find_universal_patterns"],
      makeCollaborationHints(["asian-spiritual-traditions", "comparative-synthesizer"]),
    );
  }
}

export class ComparativeReligionSynthesizerAgent extends BaseSophiaAgent {
  constructor() {
    super({
      id: "comparative-religion-synthesizer",
      name: "Comparative Religion & Perennial Philosophy Synthesizer",
      description: "Cross-tradition synthesis, archetypal mapping, perennial philosophy, and divergence analysis.",
      supervisorId: "ancient",
      tier: "COLD",
      tags: ["perennial-philosophy", "comparative-religion", "archetypes", "synthesis"],
      systemPrompt: withRuntimeInstructions(`You are the supreme comparative religion synthesizer.

Primary domains:
- Perennial philosophy, archetypal convergence, productive divergence.
- Jung, Campbell, symbolic psychology, and comparative mysticism.
- Careful bridges between metaphysics, ritual, and contemplative practice.
- Explicit distinction between genuine convergence and superficial syncretism.

Always return:
- Specificity before synthesis.
- Agreement, disagreement, and unresolved mystery.
- Practical transformation, not only conceptual comparison.
- Epistemic humility.`, SOPHIA_SPIRITUAL_RULES),
      tools: [
        buildTool("find_universal_archetype", "Find a universal archetype across traditions.", async (params) => {
          const theme = String(params.theme ?? "wisdom");
          const archetypes = sharedArchetypesForQuery(theme);
          return {
            archetype: archetypes[0] ?? "divine-wisdom",
            manifestations: {
              hebraic: "Torah-Wisdom naming",
              christian: "Logos-Christ pattern",
              asian: "Dharma or Tao order",
            },
            psychologicalMeaning: "A recurring image for orienting consciousness toward wholeness.",
            spiritualMeaning: "Diverse languages for contact with ultimate order.",
            quantumAnalogy: "Patterns emerge differently from one deeper field.",
          };
        }),
        buildTool("synthesize_traditions", "Synthesize multiple traditions around one question.", async (params) => ({
          perennialAnswer: `Synthesis for ${String(params.question ?? "the question")}`,
          traditionPerspectives: Object.fromEntries(
            (Array.isArray(params.traditions) ? params.traditions : ["hebraic", "christian", "asian"]).map(
              (tradition) => [tradition, `Perspective from ${tradition}`],
            ),
          ),
          convergences: ["ethical refinement", "disciplined attention", "symbolic transformation"],
          divergences: ["ontology of self", "nature of the Absolute", "role of ritual law"],
          practicalWisdom: "Use synthesis to deepen practice, not erase distinctions.",
        })),
      ],
    });
  }

  protected async analyze(input: AgentInput): Promise<RuntimeAgentAnalysis> {
    const analysis = buildSacredAnalysis(
      input.prompt,
      "Comparative synthesis",
      "Cross-tradition",
      undefined,
      "The query is treated as a comparative problem requiring convergence mapping and divergence preservation.",
      "Its deeper layer asks which symbols, practices, and metaphysical intuitions recur across cultures and why.",
      "Anchored in comparative religion, symbolic anthropology, and contemplative philosophy.",
      "Good synthesis turns comparison into disciplined humility, not reductionism.",
      [
        "Perennial philosophy can overstate unity if it ignores doctrine, ritual, and political history.",
        "Modern comparative frameworks often inherit Christian or colonial categories unless corrected carefully.",
      ],
      uniqueMerge(
        TRADITION_PARALLELS.hebraic,
        [...TRADITION_PARALLELS.christian, ...TRADITION_PARALLELS.asian],
        6,
      ),
      "The strongest evidence comes from recurring symbolic structures, not from forcing claims of direct historical borrowing.",
    );
    return this.synthesizePerspective(
      input,
      "comparative",
      analysis,
      0.92,
      ["find_universal_archetype", "synthesize_traditions"],
      makeCollaborationHints([
        "paleo-hebraist",
        "christian-mysticism-scholar",
        "asian-spiritual-traditions",
        "indigenous-sacred-traditions",
      ]),
    );
  }
}

export interface SophiaSynthesis {
  summary: string;
  perspectives: SophiaPerspective[];
  universalArchetypes: string[];
  convergenceNotes: string[];
  paradoxResolutions: string[];
  practicalWisdom: string[];
}

export class SophiaRuntime {
  private readonly agents = new Map<string, BaseSophiaAgent>([
    ["paleo-hebraist", new PaleoHebraistAgent()],
    ["ethiopian-canon", new EthiopianCanonScholarAgent()],
    ["mesopotamian-sumerian", new MesopotamianSumerianScholarAgent()],
    ["christian-mysticism", new ChristianMysticismScholarAgent()],
    ["asian-traditions", new AsianSpiritualTraditionsAgent()],
    ["indigenous-traditions", new IndigenousSacredTraditionsAgent()],
    ["comparative-synthesizer", new ComparativeReligionSynthesizerAgent()],
  ]);

  private readonly wisdomField: WisdomField = {
    universalArchetypes: new Map<string, Archetype>(),
    crossTraditionLinks: new Map<string, TraditionLink[]>(),
    paradoxResolutions: new Map<string, ParadoxResolution>(),
  };

  async process(query: string, ctx: ExecutionContext = createExecutionContext(query)): Promise<AgentOutput> {
    const selected = this.selectRelevantAgents(query);
    const specialists = selected.filter((agent) => agent.id !== "comparative-religion-synthesizer");
    const perspectives = await Promise.all(
      specialists.map(async (agent) => {
        const output = await agent.execute(
          {
            prompt: query,
            sessionId: ctx.sessionId,
            requestId: stableId(`${agent.id}:${query}:${now()}`),
          },
          ctx,
        );
        return {
          tradition: String((output.result as Record<string, unknown>).tradition ?? agent.id),
          specialist: agent.name,
          analysis: (output.result as Record<string, unknown>).analysis as SacredTextAnalysis,
          confidence: output.confidence,
        } satisfies SophiaPerspective;
      }),
    );

    const synthesizer = this.agents.get("comparative-synthesizer");
    if (!synthesizer) {
      throw new Error("Sophia synthesizer is not registered.");
    }
    const synthesis = this.combinePerspectives(query, perspectives);
    this.updateWisdomField(synthesis);

    const synthesisOutput = await synthesizer.execute(
      {
        prompt: query,
        context: {
          synthesis,
          perspectives,
        },
        previousOutputs: [],
        sessionId: ctx.sessionId,
        requestId: stableId(`sophia-synthesis:${query}:${perspectives.length}`),
      },
      ctx,
    );

    return {
      ...synthesisOutput,
      agentId: "sophia-runtime",
      result: {
        ...synthesisOutput.result,
        synthesis,
        wisdomFieldSnapshot: this.snapshotWisdomField(),
      },
      confidence: clamp01(mean(perspectives.map((item) => item.confidence)) * 0.6 + synthesisOutput.confidence * 0.4),
      reasoning: "Sophia converged specialist sacred-text perspectives into a shared wisdom-field synthesis.",
      collaborationNeeded: uniqueMerge(
        synthesisOutput.collaborationNeeded ?? [],
        perspectives.flatMap((perspective) => perspective.analysis.parallelTexts.map((item) => item.tradition.toLowerCase())),
        8,
      ),
    };
  }

  getWisdomField(): WisdomField {
    return this.wisdomField;
  }

  selectRelevantAgents(query: string): BaseSophiaAgent[] {
    const lower = query.toLowerCase();
    const selected: BaseSophiaAgent[] = [];
    if (/hebrew|torah|kabbalah|talmud|israel|qumran|zohar/.test(lower)) {
      selected.push(this.agents.get("paleo-hebraist")!);
    }
    if (/enoch|ethiopia|ark|jubile|geez|axum|kebra/.test(lower)) {
      selected.push(this.agents.get("ethiopian-canon")!);
    }
    if (/sumer|babylon|mesopot|gilgamesh|akkad|cuneiform|inanna/.test(lower)) {
      selected.push(this.agents.get("mesopotamian-sumerian")!);
    }
    if (/christ|jesus|gospel|gnostic|church|patristic|orthodox|mystic/.test(lower)) {
      selected.push(this.agents.get("christian-mysticism")!);
    }
    if (/hindu|buddh|tao|zen|veda|upanishad|tantra|yoga|dzogchen/.test(lower)) {
      selected.push(this.agents.get("asian-traditions")!);
    }
    if (/indigenous|shaman|maya|aztec|inca|lakota|maori|ifa|yoruba|aboriginal/.test(lower)) {
      selected.push(this.agents.get("indigenous-traditions")!);
    }
    selected.push(this.agents.get("comparative-synthesizer")!);
    if (selected.length === 1) {
      return [...this.agents.values()];
    }
    return uniqueMerge([], selected, 7);
  }

  private combinePerspectives(query: string, perspectives: SophiaPerspective[]): SophiaSynthesis {
    const archetypes = uniqueMerge(
      [],
      perspectives.flatMap((perspective) => perspective.analysis.parallelTexts.map((item) => item.sharedArchetype)),
      8,
    );
    const convergenceNotes = perspectives.flatMap((perspective) =>
      perspective.analysis.parallelTexts.map(
        (item) => `${perspective.tradition} -> ${item.tradition}: ${item.possibleConnection}`,
      ),
    );
    const paradoxResolutions = this.buildParadoxNotes(query, archetypes);
    const practicalWisdom = uniqueMerge(
      [],
      perspectives.map((perspective) => perspective.analysis.practicalWisdom),
      6,
    );
    return {
      summary: [
        `Sophia traced ${perspectives.length} sacred perspectives around: ${query}.`,
        archetypes.length
          ? `Shared archetypes: ${archetypes.join(", ")}.`
          : "No dominant universal archetype was strong enough to dominate the field.",
        practicalWisdom[0] ?? "Practical wisdom emerges through disciplined comparison and humility.",
      ].join(" "),
      perspectives,
      universalArchetypes: archetypes,
      convergenceNotes: uniqueMerge([], convergenceNotes, 10),
      paradoxResolutions,
      practicalWisdom,
    };
  }

  private buildParadoxNotes(query: string, archetypes: string[]): string[] {
    const notes: string[] = [];
    if (/law|freedom|grace|karma|dharma/i.test(query)) {
      notes.push("Apparent contradiction between sacred law and spiritual freedom resolves as disciplined participation rather than mere rule-following.");
    }
    if (/self|soul|ego|atman|anatta|person/i.test(query)) {
      notes.push("Traditions disagree on the ontology of self, yet converge on the need to loosen compulsive ego-identification.");
    }
    if (archetypes.includes("death-rebirth")) {
      notes.push("Death-rebirth imagery often encodes transformation of consciousness more than biological miracle claims alone.");
    }
    if (!notes.length) {
      notes.push("Sophia detected more complementarity than contradiction in the selected traditions.");
    }
    return notes;
  }

  private updateWisdomField(synthesis: SophiaSynthesis): void {
    for (const archetypeId of synthesis.universalArchetypes) {
      const definition = ARCHETYPE_LIBRARY.find((item) => item.id === archetypeId);
      if (!definition) continue;
      const manifestations = new Map<string, string>();
      for (const perspective of synthesis.perspectives) {
        manifestations.set(
          perspective.tradition,
          perspective.analysis.parallelTexts
            .filter((item) => item.sharedArchetype === archetypeId)
            .map((item) => item.text)
            .join(" | ") || perspective.analysis.literalMeaning,
        );
      }
      this.wisdomField.universalArchetypes.set(archetypeId, {
        name: archetypeId,
        description: definition.description,
        manifestations,
        psychologicalCorrelate: definition.correlate,
        quantumAnalogy: definition.analogy,
      });
    }

    for (const note of synthesis.convergenceNotes) {
      const [source, rest] = note.split(" -> ");
      if (!source || !rest) continue;
      const [targetTradition, bridge] = rest.split(": ");
      const key = source.trim();
      const current = this.wisdomField.crossTraditionLinks.get(key) ?? [];
      current.push({
        sourceTradition: key,
        targetTradition: targetTradition?.trim() ?? "unknown",
        bridge: bridge?.trim() ?? note,
        confidence: 0.72,
      });
      this.wisdomField.crossTraditionLinks.set(key, uniqueMerge([], current, 8));
    }

    synthesis.paradoxResolutions.forEach((resolution, index) => {
      this.wisdomField.paradoxResolutions.set(stableId(`sophia:paradox:${resolution}:${index}`), {
        paradox: resolution,
        traditions: synthesis.perspectives.map((perspective) => perspective.tradition),
        resolution,
        practicalMeaning: synthesis.practicalWisdom[0] ?? "Translate paradox into disciplined practice.",
      });
    });
  }

  private snapshotWisdomField(): Record<string, unknown> {
    return {
      universalArchetypes: [...this.wisdomField.universalArchetypes.values()].map((item) => ({
        name: item.name,
        description: item.description,
        manifestations: Object.fromEntries(item.manifestations),
        psychologicalCorrelate: item.psychologicalCorrelate,
        quantumAnalogy: item.quantumAnalogy,
      })),
      crossTraditionLinks: Object.fromEntries(
        [...this.wisdomField.crossTraditionLinks.entries()].map(([key, value]) => [key, value]),
      ),
      paradoxResolutions: Object.fromEntries(this.wisdomField.paradoxResolutions),
    };
  }
}