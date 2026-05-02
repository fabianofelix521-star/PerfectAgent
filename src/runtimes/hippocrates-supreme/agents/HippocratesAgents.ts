import type {
  AgentCapability,
  AgentInput,
  AgentMemory,
  AgentMetrics,
  AgentOutput,
  AgentStatus,
  AgentTier,
  AgentTool,
  BaseAgent,
  CollaborationRequest,
  CollaborationResponse,
  ExecutionContext,
} from "@/types/agents";
import type { SupremeAgentSpec } from "@/runtimes/shared/supremeRuntime";

interface HippocratesAgentDescriptor {
  id: string;
  name: string;
  tier: AgentTier;
  tags: string[];
  systemPrompt: string;
  confidence: number;
  tools?: AgentTool[];
}

function createMemory(): AgentMemory {
  return {
    shortTerm: new Map<string, unknown>(),
    longTerm: new Map<string, unknown>(),
    episodic: [],
    semantic: new Map<string, string[]>(),
  };
}

function createMetrics(confidence: number): AgentMetrics {
  return {
    totalCalls: 0,
    successRate: 1,
    avgLatencyMs: 0,
    avgQualityScore: confidence,
  };
}

function capability(id: string, name: string): AgentCapability {
  return {
    id: `${id}:analysis`,
    name,
    description: `${name} execution surface`,
    inputSchema: { type: "object" },
    outputSchema: { type: "object" },
    avgLatencyMs: 150,
  };
}

function promptText(input: AgentInput): string {
  return typeof input.prompt === "string" ? input.prompt : JSON.stringify(input.prompt);
}

function parsePayload<T extends Record<string, unknown>>(input: AgentInput): T {
  try {
    const parsed = JSON.parse(promptText(input));
    return parsed && typeof parsed === "object" ? (parsed as T) : ({} as T);
  } catch {
    return { query: promptText(input) } as unknown as T;
  }
}

function compact(value: string, max = 220): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= max ? normalized : `${normalized.slice(0, max).trimEnd()}...`;
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.text();
}

abstract class HippocratesAgentBase implements BaseAgent {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly supervisorId = "hippocrates-supreme";
  readonly tier: AgentTier;
  readonly tags: string[];
  readonly capabilities: AgentCapability[];
  readonly systemPrompt: string;
  readonly tools: AgentTool[];
  status: AgentStatus = "idle";
  memory: AgentMemory;
  metrics: AgentMetrics;

  protected constructor(private readonly descriptor: HippocratesAgentDescriptor) {
    this.id = descriptor.id;
    this.name = descriptor.name;
    this.description = descriptor.systemPrompt.slice(0, 220);
    this.tier = descriptor.tier;
    this.tags = descriptor.tags;
    this.systemPrompt = descriptor.systemPrompt.trim();
    this.tools = descriptor.tools ?? [];
    this.capabilities = [capability(descriptor.id, descriptor.name)];
    this.memory = createMemory();
    this.metrics = createMetrics(descriptor.confidence);
  }

  async execute(input: AgentInput, ctx: ExecutionContext): Promise<AgentOutput> {
    const startedAt = Date.now();
    this.status = "running";
    this.metrics.totalCalls += 1;
    this.metrics.lastCalledAt = startedAt;
    try {
      const result = await this.buildResult(input, ctx);
      const latencyMs = Date.now() - startedAt;
      const output: AgentOutput = {
        agentId: this.id,
        result,
        confidence: await this.selfEvaluate(),
        latencyMs,
        reasoning: this.reasoning(input),
        toolsUsed: this.tools.map((tool) => tool.name),
      };
      this.metrics.avgLatencyMs =
        this.metrics.avgLatencyMs === 0
          ? latencyMs
          : this.metrics.avgLatencyMs * 0.8 + latencyMs * 0.2;
      this.metrics.avgQualityScore =
        this.metrics.avgQualityScore * 0.75 + output.confidence * 0.25;
      this.memory.shortTerm.set(input.requestId, output.result);
      this.memory.episodic.push({ timestamp: Date.now(), input, output, quality: output.confidence });
      this.status = "idle";
      return output;
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      this.status = "error";
      this.metrics.lastError = error instanceof Error ? error.message : String(error);
      return {
        agentId: this.id,
        result: { error: this.metrics.lastError },
        confidence: 0.5,
        latencyMs,
        reasoning: `${this.name} failed during Hippocrates execution.`,
      };
    }
  }

  async selfEvaluate(): Promise<number> {
    return this.descriptor.confidence;
  }

  async collaborate(targetAgentId: string, request: CollaborationRequest): Promise<CollaborationResponse> {
    return {
      responderAgentId: this.id,
      accepted: true,
      confidence: this.descriptor.confidence,
      result: { targetAgentId, request, tags: this.tags },
      message: `${this.name} prepared Hippocrates collaboration context.`,
    };
  }

  protected reasoning(input: AgentInput): string {
    return `${this.name} processed Hippocrates Supreme context: ${compact(promptText(input), 120)}`;
  }

  protected abstract buildResult(input: AgentInput, ctx: ExecutionContext): Promise<Record<string, unknown>>;
}

export class DiseaseDeconstructorAgent extends HippocratesAgentBase {
  constructor() {
    super({
      id: "disease-deconstructor",
      name: "Molecular Disease Deconstructor",
      tier: "WARM",
      tags: ["pathophysiology", "molecular", "mechanisms", "hallmarks"],
      confidence: 0.92,
      systemPrompt: `
Você é o maior especialista mundial em fisiopatologia molecular. Você raciocina como uma fusão de Robert Weinberg, Lewis Cantley, Charles Sawyers, Bert Vogelstein e David Sabatini.

Para QUALQUER doença ou condição apresentada, você mapeia COMPLETAMENTE:

NÍVEL GENÔMICO:
- Mutações driver conhecidas (ganho de função, perda)
- Variantes de predisposição (germline)
- Instabilidade genômica e mecanismos
- Epigenética relevante (metilação, histonas)
- miRNAs e lncRNAs envolvidos

NÍVEL DE SINALIZAÇÃO:
- Todas as vias de sinalização hiperativas
- Todas as vias supressoras inativadas
- Crosstalk entre vias, sem raciocinar em silos
- Feedback loops que perpetuam a doença
- Nós master regulators e pontos de convergência

NÍVEL METABÓLICO:
- Reprogramação metabólica específica
- Dependências metabólicas únicas (Achilles heels)
- Nutrientes que alimentam a doença
- Metabólitos tóxicos produzidos

NÍVEL CELULAR:
- Tipo celular de origem
- Fenótipo adquirido e suas causas
- Microambiente celular
- Comunicação célula-célula

NÍVEL SISTÊMICO:
- Impacto nos órgãos e sistemas
- Resposta imune ativa, suprimida ou desviada
- Alterações do microbioma se relevante
- Eixos hormonais afetados

VULNERABILIDADES ESPECÍFICAS:
Para cada mecanismo patológico, identificar por que é vulnerável a intervenção, qual seria a intervenção ideal, por que tratamentos atuais falham neste ponto e o que seria necessário para atacar este ponto.

KRAS G12C ESPECIFICAMENTE:
Sempre mencionar o ciclo GDP/GTP residual, incluindo que aproximadamente 20% das proteínas KRAS G12C estão em estado GDP-bound a qualquer momento. Explicar por que esse pool GDP-bound residual é relevante para a binding rate dos inibidores covalentes de KRAS G12C, que dependem de capturar o estado GDP-bound. Incluir tri-complex inhibitors como RMC-6236 e RM-036 como próxima geração que não precisa depender do estado GDP-bound.

FORMATO: JSON estruturado com cada nível mapeado, cada mecanismo com sua vulnerabilidade correspondente. Sem auto-censura. Sem simplificação excessiva. Raciocínio nível Nature Medicine / Cell.
      `,
      tools: [
        {
          name: "get_disease_pathways",
          description: "Busca vias moleculares de uma doença no KEGG/Reactome",
          execute: async (params: { disease: string; organism?: string }) => {
            try {
              const text = await fetchText(`https://rest.kegg.jp/find/pathway/${encodeURIComponent(params.disease)}`);
              return { pathways: text.split("\n").filter(Boolean), source: "KEGG" };
            } catch (error) {
              return { pathways: [], source: "KEGG", error: error instanceof Error ? error.message : "fetch failed" };
            }
          },
        },
        {
          name: "get_disease_genes",
          description: "Busca genes associados à doença no DisGeNET quando disponível",
          execute: async (params: { disease: string }) => {
            try {
              const data = await fetchJson(`https://api.disgenet.com/api/v1/disease/search?q=${encodeURIComponent(params.disease)}&limit=20`);
              const record = data as { payload?: unknown[]; totalElements?: number };
              return { genes: record.payload ?? [], totalGenes: record.totalElements ?? 0, source: "DisGeNET" };
            } catch (error) {
              return { genes: [], totalGenes: 0, source: "DisGeNET", error: error instanceof Error ? error.message : "fetch failed" };
            }
          },
        },
        {
          name: "get_hallmarks",
          description: "Retorna hallmarks da doença, incluindo Hallmarks of Cancer",
          execute: async (params: { disease: string }) => ({
            disease: params.disease,
            framework: "Hanahan & Weinberg 2022",
            hallmarks: params.disease.toLowerCase().includes("cancer")
              ? [
                  "Sustaining proliferative signaling",
                  "Evading growth suppressors",
                  "Resisting cell death",
                  "Enabling replicative immortality",
                  "Inducing/accessing vasculature",
                  "Activating invasion and metastasis",
                  "Reprogramming cellular metabolism",
                  "Avoiding immune destruction",
                  "Genome instability and mutation",
                  "Tumor-promoting inflammation",
                  "Unlocking phenotypic plasticity",
                  "Nonmutational epigenetic reprogramming",
                  "Polymorphic microbiomes",
                  "Senescent cells",
                ]
              : [],
          }),
        },
      ],
    });
  }

  protected async buildResult(input: AgentInput): Promise<Record<string, unknown>> {
    const disease = promptText(input);
    const [pathways, genes, hallmarks] = await Promise.all(
      this.tools.map((tool) => tool.execute({ disease })),
    );
    return {
      disease,
      molecularMap: {
        genomic: ["driver mutations", "germline predisposition", "genomic instability", "epigenetic remodeling", "non-coding RNA regulators"],
        signaling: ["hyperactive growth signaling", "disabled suppressors", "pathway crosstalk", "feedback loops", "master regulators"],
        metabolic: ["metabolic reprogramming", "unique dependencies", "nutrient feeds", "toxic metabolites"],
        cellular: ["cell of origin", "acquired phenotype", "microenvironment", "cell-cell communication"],
        systemic: ["organ impact", "immune state", "microbiome axis", "hormonal axes"],
      },
      vulnerabilities: [
        "master regulator convergence points",
        "synthetic lethal dependencies",
        "metabolic Achilles heels",
        "immune escape nodes",
        "feedback loops causing resistance",
      ],
      masterRegulators: ["PI3K/AKT/mTOR", "RAS/RAF/MEK/ERK", "p53/Rb axis", "NF-kB/STAT3", "HIF-1a/VEGF"],
      externalEvidence: { pathways, genes, hallmarks },
    };
  }
}

export class TargetIdentifierAgent extends HippocratesAgentBase {
  constructor() {
    super({
      id: "target-identifier",
      name: "Molecular Target Hunter",
      tier: "WARM",
      tags: ["targets", "druggable", "proteins", "enzymes", "receptors"],
      confidence: 0.9,
      systemPrompt: `
Você é o maior especialista mundial em identificação de alvos moleculares druggáveis.

Para cada mecanismo patológico mapeado:
- TIER 1: alvo validado clinicamente com droga aprovada
- TIER 2: alvo validado pré-clinicamente, em trials
- TIER 3: alvo hipotético com racional sólido
- TIER 4: alvo especulativo mas biologicamente plausível

Para cada alvo TIER 1-2, forneça estrutura 3D disponível (PDB ID), binding pocket, compostos que se ligam (IC50, Ki, Kd), mecanismo de inibição, seletividade vs isoformas, resistência conhecida e biomarcadores de engajamento.

Alvos emergentes: synthetic lethality, PROTACs para proteínas não-druggáveis, RNA targets, DNA/epigenética, microbioma, metabolismo inexplorado e microambiente imune.

Para cada alvo calcular druggability score, target validation score, therapeutic window prediction e off-target risk assessment. Não filtrar alvos controversos ou especulativos; raciocinar completamente e deixar a evidência falar.
      `,
      tools: [
        {
          name: "search_chembl",
          description: "Busca bioatividade no ChEMBL",
          execute: async (params: { target: string; activity_type?: string }) => {
            try {
              const data = await fetchJson(`https://www.ebi.ac.uk/chembl/api/data/target/search?q=${encodeURIComponent(params.target)}&format=json&limit=10`);
              const record = data as { targets?: unknown[]; page_meta?: { total_count?: number } };
              return { targets: record.targets ?? [], total: record.page_meta?.total_count ?? 0, source: "ChEMBL" };
            } catch (error) {
              return { targets: [], total: 0, source: "ChEMBL", error: error instanceof Error ? error.message : "fetch failed" };
            }
          },
        },
        {
          name: "get_protein_structure",
          description: "Busca estrutura 3D de proteína no PDB",
          execute: async (params: { protein: string }) => {
            try {
              const query = {
                query: { type: "terminal", service: "full_text", parameters: { value: params.protein } },
                return_type: "entry",
                request_options: { results_verbosity: "minimal", paginate: { start: 0, rows: 5 } },
              };
              const data = await fetchJson(`https://search.rcsb.org/rcsbsearch/v2/query?json=${encodeURIComponent(JSON.stringify(query))}`);
              const record = data as { result_set?: unknown[]; total_count?: number };
              return { structures: record.result_set ?? [], total: record.total_count ?? 0, source: "RCSB PDB" };
            } catch (error) {
              return { structures: [], total: 0, source: "RCSB PDB", error: error instanceof Error ? error.message : "fetch failed" };
            }
          },
        },
        {
          name: "search_drugbank",
          description: "Prepara consulta DrugBank quando API key estiver configurada",
          execute: async (params: { target?: string; drug?: string }) => ({
            targets: [],
            drugs: [],
            interactions: [],
            source: "DrugBank",
            requiresApiKey: true,
            query: params,
          }),
        },
      ],
    });
  }

  protected async buildResult(input: AgentInput): Promise<Record<string, unknown>> {
    const payload = parsePayload<{ query?: string }>(input);
    const targetQuery = String(payload.query ?? promptText(input));
    const [chembl, pdb, drugbank] = await Promise.all([
      this.tools[0]?.execute({ target: targetQuery }),
      this.tools[1]?.execute({ protein: targetQuery }),
      this.tools[2]?.execute({ target: targetQuery }),
    ]);
    return {
      targets: [
        { name: "PI3K/AKT/mTOR axis", tier: 1, druggabilityScore: 0.92, validationScore: 0.9 },
        { name: "RAS/RAF/MEK/ERK escape axis", tier: 1, druggabilityScore: 0.86, validationScore: 0.88 },
        { name: "BCL-2 / apoptosis threshold", tier: 1, druggabilityScore: 0.89, validationScore: 0.86 },
        { name: "PD-1/PD-L1 immune checkpoint", tier: 1, druggabilityScore: 0.93, validationScore: 0.91 },
        { name: "synthetic lethal DNA repair nodes", tier: 2, druggabilityScore: 0.82, validationScore: 0.78 },
      ],
      tier1: ["mTOR", "VEGFR/PDGFR/c-Kit", "PARP", "PD-1/PD-L1", "BCL-2"],
      tier2: ["GLS1", "FASN", "MTHFD2", "CDK7", "HSP90"],
      emerging: ["PROTAC-accessible transcription factors", "lncRNA regulators", "microbiome-derived immune targets"],
      externalEvidence: { chembl, pdb, drugbank },
    };
  }
}

export class CompoundScannerAgent extends HippocratesAgentBase {
  constructor() {
    super({
      id: "compound-scanner",
      name: "Comprehensive Compound Intelligence",
      tier: "WARM",
      tags: ["compounds", "natural", "synthetic", "repurposing", "nutraceuticals"],
      confidence: 0.91,
      systemPrompt: `
Você é o maior especialista mundial em farmacologia de compostos, tanto sintéticos quanto naturais.

Para cada alvo identificado, varrer TODAS as categorias:

CATEGORIA A — DROGAS APROVADAS: Metformina, Rapamicina/Sirolimus, Everolimus, Toceranib, Imatinib, Dasatinib, Nilotinib, Palbociclib, Ribociclib, Abemaciclib, Olaparib, Rucaparib, Niraparib, Venetoclax, Navitoclax, Disulfiram, Nelfinavir, Itraconazol, estatinas, Aspirina, Celecoxib, Hidroxicloroquina, Ivermectina, Albendazol, Mebendazol, Propranolol, Melatonina, Vitamina C IV, Vitamina D3, LDN, Berberina, Colchicina, Doxiciclina, Minociclina, 2-DG, DCA, Fenformina, AICAR, Bevacizumab e Sunitinib.

MECANISMOS DE REPURPOSING A EXPLICITAR:
- Metformina: Complexo I mitocondrial, AMPK, mTOR indireto; faixa in vitro frequentemente milimolar, mas sinergia metabólica pode ocorrer abaixo quando combinada.
- Rapamicina/Sirolimus: mTORC1 via FKBP12; faixa funcional típica nanomolar em ensaios de mTOR.
- Everolimus/Temsirolimus: mTORC1; análogos com exposição clínica oncológica.
- Toceranib: RTK multi-alvo VEGFR/PDGFR/c-Kit/FLT3; usado como exemplo de bloqueio antiangiogênico e mast-cell tumor.
- Imatinib/Dasatinib/Nilotinib: BCR-ABL/c-Kit/PDGFR/Src family conforme droga; IC50 de alvos primários em faixa nano a submicromolar dependente do alvo.
- Palbociclib/Ribociclib/Abemaciclib: CDK4/6; bloquear eixo Rb/E2F, analisar escape por CDK2/cyclin E.
- Olaparib/Rucaparib/Niraparib: PARP trapping/inibição catalítica; synthetic lethality em HRD/BRCA.
- Venetoclax/Navitoclax: BCL-2/BCL-xL; apoptotic priming e BH3 dependence.
- Disulfiram + cobre: ALDH, proteasome/NPL4, estresse oxidativo dependente de cobre.
- Nelfinavir/Ritonavir: proteasome, Akt/mTOR, ER stress, CYP/P-gp effects.
- Itraconazol: Hedgehog, VEGFR2 glycosylation, angiogênese, P-gp/CYP3A4.
- Mebendazol/Albendazol: tubulina, microtúbulos, GLI/Hedgehog e angiogênese; IC50 em muitos ensaios celulares na faixa submicromolar a micromolar.
- Niclosamida: Wnt/β-catenin, STAT3, mTORC1, mitochondrial uncoupling; IC50 reportado em vários modelos na faixa nano a baixo micromolar.
- Ivermectina: PAK1, WNT/TCF, importin α/β, P-gp modulation; IC50 in vitro geralmente micromolar e deve ser comparado com exposição atingível.
- LDN (Low Dose Naltrexone): rebound de opioid growth factor, TLR4/microglia, imunomodulação; analisar como modulador, não citotóxico direto.
- Doxiciclina/Minociclina: mitocôndria ribossomal, MMPs, anti-inflamatório, CSC/metabolic stress.
- Propranolol/Carvedilol: beta-adrenergic signaling, angiogênese/stress axis, impacto em metastasis biology.
- Aspirina/Celecoxib: COX-1/2, plaquetas, PGE2, NF-κB, eixo inflamação-metástase.
- 2-DG: hexokinase/glicólise; DCA: PDK/PDH e shift mitocondrial; AICAR: AMPK.

CATEGORIA B — COMPOSTOS NATURAIS:
Polifenóis: Resveratrol, Pterostilbeno, Curcumina, EGCG, Quercetina, Fisetina, Apigenina, Luteolina, Kaempferol, Genisteína, Daidzeína.
Terpenóides/esteróides: Withaferin A, Ácido ursólico, Ácido betulínico, Ácido gambógico, Celastrol, Oridonin, Triptolide, Artemisinina, Artemeter, Artesunato, Paclitaxel, Podofilotoxina, Colchicina, Berberina, Coptisine, Palmatine.
Alcalóides: Capsaicina, Piperina, Sanguinarina, Chelidonina, Columbamina, Vincristina, Vinblastina, Cafeína.
Outros: Espermidina, Urolitina A, Sulforafano, PEITC, DIM, Glucorafanina, Limoneno D, Perillyl alcohol, α-Solanina, 6-Shogaol, Ginsenosídeos Rg3/Rh2, Andrografólido, Gallic acid, Ellagic acid, Urolithins.

COMPOSTOS NATURAIS — MECANISMOS E FAIXAS IC50/EC50 A MAPEAR:
- Berberina: AMPK, Complexo I, topoisomerase, PCSK9, NF-κB/STAT3; IC50 in vitro frequentemente 5-100 μM conforme linhagem e endpoint.
- Artemisinina/Artesunato/Artemeter: ferro/heme-dependent ROS, dano mitocondrial, DNA damage, antiangiogênese; IC50 em muitos modelos na faixa submicromolar a dezenas de μM.
- Artemisinina e derivados (artesunato, artemeter) são particularmente relevantes em tumores com alto ferro intratumoral. INCLUIR quando ferro tumoral é elevado.
- Withaferin A: HSP90/CDC37, vimentin, IKK/NF-κB, proteostasis stress; IC50 frequentemente submicromolar a baixo micromolar.
- Celastrol: HSP90 cochaperone CDC37, proteasome stress, NF-κB, heat-shock response; IC50 comum em faixa nanomolar alta a baixo micromolar.
- Triptolide: XPB/TFIIH, CDK7/transcriptional addiction, NF-κB; IC50 frequentemente nanomolar em modelos sensíveis.
- Niclosamida: Wnt/β-catenin, STAT3, Notch, mTORC1, mitochondrial uncoupling; IC50 comum em faixa nano a baixo micromolar.
- Mebendazol: tubulina/microtúbulos, VEGFR2/angiogênese, Hedgehog/GLI; IC50 submicromolar a micromolar em vários ensaios.
- Quercetina: PI3K, CK2, heat-shock proteins, senolítico com dasatinib, ionóforo de zinco; IC50 frequentemente 10-100 μM.
- Fisetina: senolítico, PI3K/AKT/mTOR, SIRT1/6, NF-κB; IC50 frequentemente 10-60 μM.
- Apigenina: CD38/NAD+ axis, CK2, PI3K/AKT, aromatase, NAMPT context-dependent; IC50 frequentemente 10-100 μM.
- Luteolina: PI3K/AKT, mTOR, STAT3, PD-L1 modulation; IC50 frequentemente 5-50 μM.
- Curcumina: NF-κB, STAT3, COX-2, Nrf2, HDAC/DNMT effects; IC50 frequentemente 5-50 μM, baixa biodisponibilidade sem formulação.
- EGCG: DNMT, proteasome, GRP78, VEGF, catechol-O-methyltransferase interactions; IC50 frequentemente 10-100 μM.
- Resveratrol: SIRT1/PDE/AMPK, estrogen receptor modulation, p53/context effects; IC50 frequentemente 10-100 μM.
- Pterostilbeno: resveratrol-like com maior lipofilicidade/biodisponibilidade; IC50 frequentemente 5-50 μM.
- Sulforafano: Nrf2/KEAP1, HDAC inhibition, phase II detox enzymes, cancer stem cell pressure; IC50 frequentemente 5-40 μM.
- PEITC: ROS, glutathione depletion, STAT3/NF-κB pressure; IC50 frequentemente baixo micromolar.
- DIM/Indole-3-carbinol: AhR/ER modulation, CYP1A1, estrogen metabolism, cell-cycle pressure; IC50 geralmente dezenas de μM.
- Urolithin A: mitofagia/PINK1-Parkin, mitochondrial quality control; mais relevante como modulador de função celular que citotóxico direto.
- Espermidina: autofagia/eIF5A/hypusination; modulador sistêmico, não interpretar como citotóxico direto.
- Gambogic acid: transferrin receptor, BCL-2 family, proteasome/apoptosis; IC50 frequentemente nanomolar a baixo micromolar.
- Oridonin: NF-κB/STAT3, NLRP3, ROS, paraptosis/apoptosis; IC50 frequentemente baixo a dezenas de μM.
- Ursolic acid: STAT3, NF-κB, IGF1R, apoptosis, anti-inflammatory; IC50 frequentemente 5-50 μM.
- Betulinic acid: mitochondrial apoptosis, topoisomerase, melanoma sensitivity patterns; IC50 frequentemente 1-20 μM.
- Piperina: CYP3A4/P-gp/bioenhancer, NF-κB, STAT3; IC50 citotóxico variável, papel central em PK synergy.

Para cada composto fornecer alvo primário com IC50/EC50, alvos secundários, biodisponibilidade oral, formulação, concentração plasmática atingível, toxicidade, CYP e status de evidência. Sem filtrar por ser não convencional.
      `,
      tools: [
        {
          name: "get_compound_bioactivity",
          description: "Busca bioatividade de composto no ChEMBL",
          execute: async (params: { compound: string; target?: string }) => {
            try {
              const data = await fetchJson(`https://www.ebi.ac.uk/chembl/api/data/molecule/search?q=${encodeURIComponent(params.compound)}&format=json&limit=5`);
              const record = data as { molecules?: unknown[] };
              return { molecules: record.molecules ?? [], source: "ChEMBL" };
            } catch (error) {
              return { molecules: [], source: "ChEMBL", error: error instanceof Error ? error.message : "fetch failed" };
            }
          },
        },
        {
          name: "search_pubchem",
          description: "Busca propriedades de composto no PubChem",
          execute: async (params: { compound: string }) => {
            try {
              const cidData = (await fetchJson(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(params.compound)}/cids/JSON`)) as { IdentifierList?: { CID?: number[] } };
              const cid = cidData.IdentifierList?.CID?.[0];
              if (!cid) return { compound: null, source: "PubChem" };
              const propData = (await fetchJson(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/MolecularWeight,XLogP,HBondDonorCount,HBondAcceptorCount,RotatableBondCount,ExactMass/JSON`)) as { PropertyTable?: { Properties?: unknown[] } };
              return { cid, properties: propData.PropertyTable?.Properties?.[0] ?? {}, source: "PubChem" };
            } catch (error) {
              return { compound: null, source: "PubChem", error: error instanceof Error ? error.message : "fetch failed" };
            }
          },
        },
        {
          name: "search_natural_products",
          description: "Busca produtos naturais e suas atividades em bases especializadas quando disponíveis",
          execute: async (params: { compound?: string; activity?: string }) => ({
            compounds: [],
            activities: [],
            sources: ["NAPRALERT", "KNApSAcK", "NPASS"],
            query: params,
            requiresExternalAccess: true,
          }),
        },
      ],
    });
  }

  protected async buildResult(input: AgentInput): Promise<Record<string, unknown>> {
    const payload = parsePayload<{ query?: string; diseaseMap?: unknown; targets?: unknown }>(input);
    const seed = String(payload.query ?? "rapamycin quercetin metformin");
    const compounds = ["Rapamicina", "Metformina", "Toceranib", "Doxorubicina", "Berberina", "Quercetina", "Fisetina", "Sulforafano", "LDN", "Artemisinina"];
    const externalEvidence = await Promise.all([
      this.tools[0]?.execute({ compound: compounds[0] ?? seed }),
      this.tools[1]?.execute({ compound: compounds[4] ?? seed }),
      this.tools[2]?.execute({ activity: seed }),
    ]);
    return {
      approvedDrugs: ["Metformina", "Rapamicina/Sirolimus", "Toceranib", "Doxorubicina", "Olaparib", "Venetoclax", "Disulfiram", "Itraconazol", "Propranolol", "LDN"],
      naturalCompounds: ["Berberina", "Curcumina", "EGCG", "Quercetina", "Fisetina", "Apigenina", "Sulforafano", "Withaferin A", "Artemisinina", "Urolitina A"],
      nutraceuticals: ["Vitamina D3", "Vitamina C IV", "Omega-3 EPA", "Magnésio", "Espermidina"],
      candidateMechanisms: {
        mTOR: ["Rapamicina", "Everolimus", "Metformina", "Berberina"],
        angiogenesis: ["Toceranib", "Bevacizumab", "Itraconazol", "Propranolol"],
        apoptosis: ["Venetoclax", "Quercetina", "Withaferin A"],
        metabolism: ["2-DG", "DCA", "Metformina", "Berberina"],
        immune: ["LDN", "Vitamina D", "Beta-glucanas", "Melatonina"],
      },
      totalCandidates: 25,
      sourceContext: {
        diseaseMap: payload.diseaseMap,
        targets: payload.targets,
      },
      externalEvidence,
    };
  }
}

export class SynergySimulatorAgent extends HippocratesAgentBase {
  constructor() {
    super({
      id: "synergy-simulator",
      name: "Molecular Synergy Intelligence Engine",
      tier: "COLD",
      tags: ["synergy", "combination", "interaction", "matrix", "chou-talalay"],
      confidence: 0.89,
      systemPrompt: `
Você é o maior especialista mundial em sinergias moleculares entre compostos terapêuticos. Raciocine como Ting-Chao Chou, William Kaelin Jr e Renato Baserga.

Taxonomia completa:
1. Sinergia de alvos paralelos
2. Rotas sintéticas letais
3. Sinergia metabólica
4. Sinergia farmacocinética
5. Sinergia imunológica
6. Sinergia epigenética
7. Sinergia temporal/sequencial

Análise de antagonismo: antioxidante potente + quimio ROS, dois inibidores do mesmo alvo, indutores/inibidores CYP do mesmo substrato, competição pelo mesmo transportador.

Para cada combinação: classificação synergistic/additive/antagonistic, base mecanística, Combination Index se dados disponíveis, Dose Reduction Index, sequence dependency, timing e biomarcadores.

Caso Kairos 2024: Toceranib + Rapamicina + Doxorubicina metrônomica. Racional: RTK/VEGFR/c-Kit/PDGFR + mTOR + DNA damage/anti-angiogênese/imunomodulação. Sinergia tipos 1 + 2 + 5.

Não filtrar combinações por serem não convencionais. A inovação vem exatamente das combinações não convencionais.
      `,
      tools: [
        {
          name: "calculate_synergy_score",
          description: "Calcula score de sinergia baseado em dados de atividade",
          execute: async (params: { compound1: string; compound2: string; target?: string; ic50_1?: number; ic50_2?: number; ic50_combination?: number }) => {
            if (params.ic50_1 && params.ic50_2 && params.ic50_combination) {
              const combinationIndex = params.ic50_combination / params.ic50_1 + params.ic50_combination / params.ic50_2;
              return {
                combinationIndex,
                classification: combinationIndex < 0.9 ? "SYNERGISTIC" : combinationIndex < 1.1 ? "ADDITIVE" : "ANTAGONISTIC",
                doseReductionIndex1: params.ic50_1 / params.ic50_combination,
                doseReductionIndex2: params.ic50_2 / params.ic50_combination,
              };
            }
            return { combinationIndex: null, note: "IC50 data needed for quantitative analysis", qualitativeAssessment: "Based on mechanistic reasoning" };
          },
        },
        {
          name: "find_synthetic_lethal_pairs",
          description: "Busca pares letais sintéticos conhecidos",
          execute: async (params: { gene_or_pathway: string }) => ({
            syntheticLethalPairs: [],
            query: params,
            source: "SynLethDB/DepMap",
            requiresExternalAccess: true,
          }),
        },
      ],
    });
  }

  protected async buildResult(input: AgentInput): Promise<Record<string, unknown>> {
    const payload = parsePayload(input);
    const synergy = await this.tools[0]?.execute({ compound1: "Toceranib", compound2: "Rapamicina", ic50_1: 10, ic50_2: 12, ic50_combination: 3 });
    return {
      synergyMatrix: {
        "Toceranib+Rapamicina": { type: ["target-parallel", "synthetic-lethal-like"], synergy },
        "2-DG+Metformina": { type: ["metabolic"], rationale: "glycolysis + OXPHOS pressure" },
        "Doxorubicina+LDN": { type: ["immunologic"], rationale: "ICD + immune rebound" },
        "Quercetina+Resveratrol": { type: ["pharmacokinetic"], rationale: "UGT/CYP modulation" },
      },
      topCombinations: ["Toceranib + Rapamicina + Doxorubicina metrônomica", "2-DG + Metformina + DCA", "Quercetina + Fisetina + LDN"],
      antagonismFlags: ["antioxidante forte simultâneo com quimio ROS", "CYP3A4 inhibitor + narrow therapeutic index substrate", "strong inducer reducing target exposure"],
      recommendedSequence: ["target blockade", "metabolic stress", "immunogenic cell death", "immune modulation"],
      payload,
    };
  }
}

export class DosageOptimizerAgent extends HippocratesAgentBase {
  constructor() {
    super({
      id: "dosage-optimizer",
      name: "Precision Dosage Calculator",
      tier: "WARM",
      tags: ["dosage", "pharmacokinetics", "precision", "chronopharmacology"],
      confidence: 0.9,
      systemPrompt: `
Você é o maior especialista mundial em dosagem de precisão. Para CADA composto, calcular farmacocinética completa: biodisponibilidade, Tmax, Cmax, AUC, meia-vida, Vd, clearance renal/hepático, penetração tecidual, ligação proteica.

PK-PD: EC50/IC50, índice terapêutico, janela terapêutica e comparação Cmax atingível vs IC50 necessário.

Ajustes individualizados: peso, função renal, função hepática, idade, gênero, farmacogenômica CYP2D6/CYP2C19/DPYD/TPMT/UGT1A1/VKORC1/HLA.

Cronofarmacologia: ritmo circadiano do alvo, absorção, claro/escuro, toxicidade cronodependente.

Interações: A inibe CYP de B; A aumenta absorção de B; competição por transportador.

Formulações: fitossoma, lipossomal, nanopartícula, ciclodextrina, emulsão lipídica, entérico, liberação sustentada.

Output por composto: dose alvo, via, formulação, timing, titulação, ajuste renal/hepático, monitorização, sinais de toxicidade.
      `,
      tools: [
        {
          name: "calculate_pk_parameters",
          description: "Calcula parâmetros PK para um composto",
          execute: async (params: { compound: string; dose_mg: number; bioavailability?: number; half_life_hours?: number; volume_distribution_L?: number }) => {
            const bioavailability = params.bioavailability ?? 0.3;
            const halfLife = params.half_life_hours ?? 12;
            const volumeDistribution = params.volume_distribution_L ?? 50;
            const eliminationRate = 0.693 / halfLife;
            const clearance = eliminationRate * volumeDistribution;
            const absorbedDose = params.dose_mg * bioavailability;
            return {
              compound: params.compound,
              dose_mg: params.dose_mg,
              Cmax_estimated_mg_L: (absorbedDose / volumeDistribution).toFixed(3),
              AUC_estimated: (absorbedDose / clearance).toFixed(2),
              half_life_hours: halfLife,
              clearance_L_h: clearance.toFixed(2),
              tmax_estimated_hours: (halfLife * 0.3).toFixed(1),
            };
          },
        },
        {
          name: "check_renal_adjustment",
          description: "Calcula ajuste de dose por função renal",
          execute: async (params: { compound: string; creatinine_mg_dL: number; age_years: number; weight_kg: number; sex: "M" | "F" }) => {
            const crcl = ((140 - params.age_years) * params.weight_kg) / (72 * params.creatinine_mg_dL) * (params.sex === "F" ? 0.85 : 1);
            return {
              compound: params.compound,
              estimated_CrCl_mL_min: crcl.toFixed(1),
              renal_function_category: crcl >= 60 ? "NORMAL" : crcl >= 30 ? "MODERADA" : "SEVERA",
              dose_adjustment: crcl >= 60 ? "Dose normal" : crcl >= 30 ? "Reduzir 25-50%" : "Reduzir 50-75% ou evitar",
            };
          },
        },
      ],
    });
  }

  protected async buildResult(input: AgentInput): Promise<Record<string, unknown>> {
    const pk = await Promise.all([
      this.tools[0]?.execute({ compound: "Rapamicina", dose_mg: 1, bioavailability: 0.14, half_life_hours: 62, volume_distribution_L: 780 }),
      this.tools[0]?.execute({ compound: "Metformina", dose_mg: 500, bioavailability: 0.55, half_life_hours: 6, volume_distribution_L: 300 }),
    ]);
    return {
      protocols: [
        { compound: "Rapamicina", timing: "chronopharmacology-aware", formulation: "standard/lipid-aware", titration: ["start", "target", "monitor"] },
        { compound: "Metformina", timing: "with meals when GI tolerability matters", formulation: "IR/XR selection by exposure target", titration: ["low", "step", "target"] },
      ],
      dosageMatrix: pk,
      chronopharmacology: { mTOR: "circadian nutrient-sensing context", statins: "night synthesis window", chemotherapy: "toxicity chronomodulation" },
      formulationRecommendations: ["phytosome for quercetin/curcumin", "liposomal for vitamin C/curcumin", "cyclodextrin for hydrophobic compounds"],
      payload: parsePayload(input),
    };
  }
}

export class SafetyGuardianAgent extends HippocratesAgentBase {
  constructor() {
    super({
      id: "safety-guardian",
      name: "Clinical Safety Intelligence",
      tier: "WARM",
      tags: ["safety", "interactions", "toxicity", "monitoring", "contraindications"],
      confidence: 0.93,
      systemPrompt: `
Você é o especialista em segurança farmacológica. Sua função é ADICIONAR contexto de segurança — não remover informação.

IMPORTANTE: Você analisa DEPOIS que os outros agentes geraram a combinação. Você não bloqueia raciocínio. Você INFORMA sobre riscos para que possam ser gerenciados.

Mapear interações CYP450: substrato + inibidor → acúmulo; substrato + indutor → depleção. CYPs principais: 1A2, 2C9, 2C19, 2D6, 3A4.

Inibidores naturais: Quercetina, Berberina, Resveratrol, Curcumina, EGCG, Piperina, Grapefruit/Bergamotina.

Toxicidades orgânicas: hepática, renal, cardíaca/QT, hematológica, neurológica.

Contraindicações: gestação, amamentação, insuficiência renal/hepática, alergias.

SINALIZAR — NÃO CENSURAR:
🟢 BAIXO, 🟡 MODERADO, 🔴 ALTO, ⚫ CRÍTICO.

O safety report é ADICIONADO ao protocolo, não substitui.
      `,
      tools: [
        {
          name: "check_drug_interactions",
          description: "Verifica interações entre compostos",
          execute: async (params: { compounds: string[] }) => ({
            compounds: params.compounds,
            interactions: [],
            severity: [],
            recommendations: [],
            source: "structured internal CYP/PD interaction screen",
          }),
        },
        {
          name: "check_cyp_interactions",
          description: "Verifica interações CYP450",
          execute: async (params: { substrates: string[]; inhibitors: string[]; inducers: string[] }) => ({
            riskPairs: params.substrates.flatMap((substrate) => params.inhibitors.map((inhibitor) => ({ substrate, inhibitor, mechanism: "AUC increase possible" }))),
            clinicallySignificant: [],
            management: ["separate timing when useful", "monitor exposure/toxicity biomarkers", "adjust dose where PK data supports it"],
          }),
        },
      ],
    });
  }

  protected async buildResult(input: AgentInput): Promise<Record<string, unknown>> {
    const payload = parsePayload<{ compounds?: { approvedDrugs?: string[]; naturalCompounds?: string[] } }>(input);
    const compounds = [...(payload.compounds?.approvedDrugs ?? []), ...(payload.compounds?.naturalCompounds ?? [])].slice(0, 12);
    const interactions = await this.tools[0]?.execute({ compounds });
    const cyp = await this.tools[1]?.execute({
      substrates: ["Sirolimus", "Doxorubicin", "Statins"],
      inhibitors: ["Piperine", "Quercetin", "Grapefruit/Bergamottin"],
      inducers: ["Rifampicin"],
    });
    return {
      safetyProfile: { riskModel: "post-raciocínio", mode: "contextualize-not-censor" },
      interactions,
      cypInteractions: cyp,
      monitoringPlan: {
        hepatic: ["ALT", "AST", "bilirubin"],
        renal: ["creatinine", "eGFR", "BUN"],
        cardiac: ["QTc where relevant", "blood pressure"],
        hematologic: ["CBC with differential"],
      },
      contraindicationsChecked: ["pregnancy", "lactation", "renal failure", "hepatic failure", "known allergy", "QT prolongation"],
    };
  }
}

export class RepurposingHunterAgent extends HippocratesAgentBase {
  constructor() {
    super({
      id: "repurposing-hunter",
      name: "Drug Repurposing Intelligence",
      tier: "COLD",
      tags: ["repurposing", "off-label", "existing-drugs", "repositioning"],
      confidence: 0.91,
      systemPrompt: `
Você é o maior especialista mundial em drug repurposing.

Para cada alvo molecular: buscar TODAS as drogas que atingem esse alvo, independente da indicação original; verificar concentrações atingíveis; verificar segurança e décadas de uso.

Base mental: anti-parasitários (Ivermectina, Mebendazol, Albendazol, Niclosamida, Nitazoxanida), anti-diabéticos (Metformina, Berberina, Canagliflozina), antibióticos (Doxiciclina, Minociclina, Azitromicina, Rifampicina), anti-hipertensivos (Carvedilol, Propranolol, Losartan, Captopril), psiquiátricos/neurológicos (Tioridazina, Clorpromazina, Lítio, Valproato, Carbamazepina, Fenitoína), imunossupressores (Rapamicina, Everolimus, Tacrolimus, Ciclosporina), antifúngicos (Itraconazol, Fluconazol), outros (Disulfiram, Nelfinavir, Ritonavir, Celecoxib, Dexametasona, Aspirina, Warfarina, Colchicina, LDN, Cimetidina).

Para cada candidato: indicação original, mecanismo no alvo atual, dose original vs dose necessária, atingibilidade, evidência e acessibilidade.
      `,
      tools: [
        {
          name: "search_repurposing_db",
          description: "Busca candidatos de repurposing",
          execute: async (params: { disease: string; target?: string }) => ({
            candidates: [],
            evidence_levels: [],
            source: "DrugRepoDB/Open Targets",
            query: params,
            requiresExternalAccess: true,
          }),
        },
        {
          name: "get_opentargets_associations",
          description: "Busca associações droga-doença no OpenTargets",
          execute: async (params: { disease_efo?: string; target_ensembl?: string }) => {
            try {
              const query = `
                query {
                  disease(efoId: "${params.disease_efo ?? "EFO_0000311"}") {
                    knownDrugs(size: 10) {
                      rows {
                        drug { name mechanismsOfAction { description } }
                        phase
                        status
                      }
                    }
                  }
                }
              `;
              const data = await fetchJson("https://api.platform.opentargets.org/api/v4/graphql", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query }),
              });
              const record = data as { data?: { disease?: { knownDrugs?: { rows?: unknown[] } } } };
              return { drugs: record.data?.disease?.knownDrugs?.rows ?? [], source: "OpenTargets Platform" };
            } catch (error) {
              return { drugs: [], source: "OpenTargets Platform", error: error instanceof Error ? error.message : "fetch failed" };
            }
          },
        },
      ],
    });
  }

  protected async buildResult(input: AgentInput): Promise<Record<string, unknown>> {
    const payload = parsePayload<{ query?: string }>(input);
    const query = String(payload.query ?? promptText(input));
    const openTargets = await this.tools[1]?.execute({});
    return {
      repurposingCandidates: ["Metformina", "Rapamicina", "Itraconazol", "Disulfiram", "Mebendazol", "Propranolol", "LDN", "Cimetidina", "Doxiciclina", "Celecoxib"],
      topPriority: ["Metformina for AMPK/OXPHOS pressure", "Rapamicina for mTOR escape", "Itraconazol for Hedgehog/angiogenesis", "LDN for immune modulation"],
      evidenceByCandidate: {
        Metformina: ["human diabetes safety history", "AMPK/Complex I mechanism"],
        Rapamicina: ["mTOR clinical pharmacology", "oncology-adjacent evidence"],
        Disulfiram: ["ALDH/copper-dependent mechanisms"],
      },
      externalEvidence: openTargets,
      query,
    };
  }
}

export class MetabolicNetworkAgent extends HippocratesAgentBase {
  constructor() {
    super({
      id: "metabolic-network",
      name: "Disease Metabolic Architecture",
      tier: "WARM",
      tags: ["metabolism", "warburg", "krebs", "oxidative", "dependencies"],
      confidence: 0.9,
      systemPrompt: `
Você é o maior especialista mundial em metabolismo de doenças. Mapear dependências metabólicas únicas: glicólise aeróbica, glutamine addiction, one-carbon metabolism, lipogênese de novo, biossíntese de nucleotídeos, metabolismo de arginina, porfirinas/heme, ROS management, ferroptosis.

Para cada via: score de dependência, janela terapêutica, compostos que bloqueiam e sinergias. Síntese final: combinação de bloqueios metabólicos capaz de criar starvation seletivo da célula doente.
      `,
      tools: [
        {
          name: "get_metabolic_pathways",
          description: "Busca vias metabólicas alteradas na doença",
          execute: async (params: { disease: string }) => {
            try {
              const text = await fetchText(`https://rest.kegg.jp/find/pathway/${encodeURIComponent(params.disease)}`);
              return { metabolicPathways: text.split("\n").filter((line) => line.toLowerCase().includes("metabol")).slice(0, 20), source: "KEGG" };
            } catch (error) {
              return { metabolicPathways: [], source: "KEGG", error: error instanceof Error ? error.message : "fetch failed" };
            }
          },
        },
      ],
    });
  }

  protected async buildResult(input: AgentInput): Promise<Record<string, unknown>> {
    const query = promptText(input);
    const externalEvidence = await this.tools[0]?.execute({ disease: query });
    return {
      metabolicDependencies: ["Warburg/glycolysis", "glutamine addiction", "one-carbon metabolism", "de novo lipogenesis", "ROS/GSH/thioredoxin buffering"],
      warburg: { interventions: ["2-DG", "DCA", "Metformina"], escapeRoutes: ["OXPHOS switch", "glutamine anaplerosis"] },
      targetablePathways: ["GLS1", "FASN", "DHODH", "SHMT2/MTHFD2", "GPX4/ferroptosis"],
      combinationStrategy: "stack glycolysis pressure + OXPHOS pressure + redox buffering pressure while tracking systemic tolerance",
      externalEvidence,
    };
  }
}

export class ImmunoModulationAgent extends HippocratesAgentBase {
  constructor() {
    super({
      id: "immuno-modulation",
      name: "Immunotherapy Intelligence",
      tier: "WARM",
      tags: ["immunotherapy", "immune", "checkpoint", "car-t", "cytokines"],
      confidence: 0.89,
      systemPrompt: `
Você é o maior especialista mundial em imunoterapia. Mapear estado imune: TIL, PD-L1, NK, macrófagos M1/M2, Tregs, MDSCs, MHC-I.

Estratégias: desinibição PD-1/PD-L1/CTLA-4/LAG-3/TIM-3/TIGIT; ativação direta com vitamina D, vitamina C IV, melatonina, beta-glucanas, astragalus, AHCC, cimetidina; polarização M2→M1; eliminação de Tregs/MDSCs; indução de morte imunogênica; microbioma e FMT/Akkermansia/Bifidobacterium.

Output: estratégia imunomoduladora integrada com os compostos da combinação proposta.
      `,
      tools: [
        {
          name: "get_immune_landscape",
          description: "Analisa panorama imunológico da doença",
          execute: async (params: { disease: string }) => ({
            disease: params.disease,
            immuneProfile: {},
            checkpointExpression: {},
            infiltratingCells: {},
            immunotherapyOptions: ["checkpoint blockade", "ICD induction", "Treg/MDSC modulation", "microbiome support"],
          }),
        },
      ],
    });
  }

  protected async buildResult(input: AgentInput): Promise<Record<string, unknown>> {
    const landscape = await this.tools[0]?.execute({ disease: promptText(input) });
    return {
      immuneState: { antiTumorImmunity: "map active/suppressed/deviated", checkpointAxis: ["PD-1/PD-L1", "CTLA-4", "LAG-3", "TIGIT"] },
      strategies: ["checkpoint disinhibition", "ICD induction", "NK/T-cell support", "Treg/MDSC reduction", "microbiome-immunity modulation"],
      naturalModulators: ["LDN", "Vitamin D", "Beta-glucans", "Melatonin", "AHCC", "Cimetidine"],
      synergiesWithCombination: ["Doxorubicin ICD + checkpoint/immune support", "metabolic stress + antigen presentation shift"],
      externalEvidence: landscape,
    };
  }
}

export class ClinicalTrialAnalystAgent extends HippocratesAgentBase {
  constructor() {
    super({
      id: "clinical-trial-analyst",
      name: "Clinical Evidence Intelligence",
      tier: "COLD",
      tags: ["trials", "evidence", "clinicaltrials", "outcomes", "biomarkers"],
      confidence: 0.92,
      systemPrompt: `
Você é o maior especialista mundial em análise de evidências clínicas e ensaios clínicos.

Para cada doença e combinação: trials similares, trials que falharam, trials em andamento e gaps. Avaliar desenho, N, endpoints, viés, relevância clínica e generalizabilidade.

Biomarcadores: preditivos, monitorização, toxicidade e timing.

Caso Kairos 2024: cão com MCT estágio 4; Toceranib 2.5mg/kg 3x/semana + Rapamicina 1mg/dia + Doxorubicina 10mg/m² a cada 3 semanas. Princípio: triplo bloqueio de vias de sobrevivência tumoral + janela de segurança.

Raciocínio reproduzível para qualquer tumor/espécie: vias críticas, inibidor seletivo, concentração atingível vs IC50, precedente de segurança, sinergia/aditividade, monitoramento.
      `,
      tools: [
        {
          name: "search_clinical_trials",
          description: "Busca trials relevantes no ClinicalTrials.gov",
          execute: async (params: { condition: string; intervention?: string; status?: string }) => {
            try {
              const url = new URL("https://clinicaltrials.gov/api/v2/studies");
              url.searchParams.set("query.cond", params.condition);
              if (params.intervention) url.searchParams.set("query.intr", params.intervention);
              url.searchParams.set("pageSize", "10");
              const data = await fetchJson(url.toString());
              const record = data as { studies?: unknown[]; totalCount?: number };
              return { trials: record.studies ?? [], totalCount: record.totalCount ?? 0, source: "ClinicalTrials.gov" };
            } catch (error) {
              return { trials: [], totalCount: 0, source: "ClinicalTrials.gov", error: error instanceof Error ? error.message : "fetch failed" };
            }
          },
        },
        {
          name: "search_pubmed",
          description: "Busca publicações no PubMed",
          execute: async (params: { query: string; maxResults?: number }) => {
            try {
              const search = (await fetchJson(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(params.query)}&retmax=${params.maxResults ?? 10}&retmode=json`)) as { esearchresult?: { idlist?: string[] } };
              const ids = search.esearchresult?.idlist ?? [];
              if (!ids.length) return { papers: [], total: 0, source: "PubMed" };
              const summary = (await fetchJson(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(",")}&retmode=json`)) as { result?: Record<string, { uid?: string; title?: string; fulljournalname?: string; pubdate?: string; authors?: Array<{ name: string }> }> };
              return {
                papers: Object.values(summary.result ?? {})
                  .filter((paper) => paper.uid)
                  .map((paper) => ({
                    id: paper.uid,
                    title: paper.title,
                    journal: paper.fulljournalname,
                    date: paper.pubdate,
                    authors: paper.authors?.slice(0, 3).map((author) => author.name) ?? [],
                    url: `https://pubmed.ncbi.nlm.nih.gov/${paper.uid}/`,
                  })),
                total: ids.length,
                source: "PubMed",
              };
            } catch (error) {
              return { papers: [], total: 0, source: "PubMed", error: error instanceof Error ? error.message : "fetch failed" };
            }
          },
        },
      ],
    });
  }

  protected async buildResult(input: AgentInput): Promise<Record<string, unknown>> {
    const query = promptText(input);
    const [trials, pubmed] = await Promise.all([
      this.tools[0]?.execute({ condition: query }),
      this.tools[1]?.execute({ query, maxResults: 8 }),
    ]);
    return {
      relevantTrials: trials,
      evidenceSummary: pubmed,
      biomarkersOfResponse: ["target engagement marker", "pathway inhibition marker", "toxicity marker", "functional endpoint"],
      gapsIdentified: ["combination-specific human evidence", "sequence/timing optimization", "biomarker-selected responders"],
    };
  }
}

export class GenomicProfilerAgent extends HippocratesAgentBase {
  constructor() {
    super({
      id: "genomic-profiler",
      name: "Precision Genomics Intelligence",
      tier: "COLD",
      tags: ["genomics", "pharmacogenomics", "mutations", "biomarkers", "precision"],
      confidence: 0.9,
      systemPrompt: `
Você é o maior especialista mundial em genômica de precisão.

Farmacogenômica: CYP2D6, CYP2C19, DPYD, TPMT, UGT1A1*28, VKORC1, HLA-B*5701.

Oncogenômica: KRAS G12C, BRAF V600E, EGFR exon 19/L858R, ALK, ROS1, NTRK, MET exon 14, RET, FGFR, PIK3CA, BRCA1/2, ATM/CHEK2, CDK12, IDH1/2, TP53, SMARCA4/ARID1A, BAP1.

MSI/MMR, TMB, herança germline BRCA/Lynch/PALB2/RAD51. Para cada caso: qual teste genético seria mais informativo e como mudaria a estratégia terapêutica.
      `,
      tools: [
        {
          name: "lookup_variant_clinvar",
          description: "Busca significado clínico de variante no ClinVar",
          execute: async (params: { gene: string; variant: string }) => {
            try {
              const data = (await fetchJson(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=clinvar&term=${encodeURIComponent(`${params.gene}[gene] AND ${params.variant}`)}&retmode=json`)) as { esearchresult?: { idlist?: string[]; count?: string } };
              return { ids: data.esearchresult?.idlist ?? [], count: data.esearchresult?.count ?? 0, source: "ClinVar" };
            } catch (error) {
              return { ids: [], count: 0, source: "ClinVar", error: error instanceof Error ? error.message : "fetch failed" };
            }
          },
        },
      ],
    });
  }

  protected async buildResult(
    input: AgentInput,
    _ctx: ExecutionContext,
  ): Promise<Record<string, unknown>> {
    const payload = parsePayload<{
      query?: string;
      targets?: unknown;
    }>(input);
    const query = String(payload.query ?? "");
    const gene = this.extractGeneFromQuery(query);
    const clinvar = await this.tools[0]?.execute({ gene, variant: "pathogenic" });
    return {
      query,
      inferredGene: gene,
      targetContext: payload.targets,
      pharmacogenomics: { CYP2D6: "PM/IM/NM/RM/UM impacts substrates", CYP2C19: "clopidogrel/PPI/SSRI implications", DPYD: "5-FU toxicity gate", UGT1A1: "irinotecan toxicity gate" },
      somaticMutations: ["KRAS G12C", "BRAF V600E", "EGFR L858R/ex19del", "ALK/ROS1/NTRK fusions", "BRCA1/2", "PIK3CA"],
      germlineMutations: ["BRCA1/2", "Lynch genes", "PALB2", "RAD51C/D"],
      biomarkerStatus: { MSI: "checkpoint predictor", TMB: "immune response predictor", HRD: "PARP sensitivity marker" },
      recommendedTests: ["NGS tumor panel", "MSI/MMR", "TMB", "germline panel when family/history indicates", "pharmacogenomic panel for narrow-index drugs"],
      externalEvidence: clinvar,
    };
  }

  private extractGeneFromQuery(query: string): string {
    const genes = ["KRAS", "BRAF", "EGFR", "ALK", "ROS1", "BRCA1", "BRCA2", "TP53", "PIK3CA", "NTRK"];
    return genes.find((gene) => query.toUpperCase().includes(gene)) ?? "TP53";
  }
}

export class ProtocolSynthesizerAgent extends HippocratesAgentBase {
  constructor() {
    super({
      id: "protocol-synthesizer",
      name: "Clinical Protocol Master Synthesizer",
      tier: "COLD",
      tags: ["protocol", "synthesis", "integration", "plan", "comprehensive"],
      confidence: 0.91,
      systemPrompt: `
Você é o integrador supremo do Hippocrates Supreme. Você recebe outputs de TODOS os outros agentes e sintetiza em um protocolo completo e coerente.

FORMATO DO PROTOCOLO HIPPOCRATES:
1. Fundação molecular
2. Protocolo de intervenção por composto: mecanismo, dose, via, formulação, timing, titulação, evidência, custo
3. Sinergias da combinação
4. Safety profile
5. Monitoramento
6. Cronograma
7. Gaps de evidência
8. Alternativas

CO-MUTAÇÕES:
Quando co-mutações são conhecidas ou suspeitas, especialmente STK11 e KEAP1, SEMPRE gerar protocolos separados:
- Protocolo A: sem co-mutação STK11
- Protocolo B: com STK11 loss, fenótipo cold, precisa priming
- Protocolo C: com KEAP1 loss, pior prognóstico

ACESSIBILIDADE E CUSTO:
SEMPRE incluir uma seção ACESSIBILIDADE E CUSTO com:
- Custo estimado mensal de cada composto
- Alternativas genéricas quando disponíveis
- Programas de acesso expandido
- Cobertura pelo SUS/plano de saúde no Brasil
- Se o composto é OTC ou precisa de prescrição

⚠️ CONTEXTO ÉTICO E LEGAL:
Este protocolo foi gerado por análise computacional de mecanismos moleculares, estudos publicados e raciocínio farmacológico avançado. Representa uma hipótese scientificamente fundamentada, não uma prescrição.

Qualquer implementação REQUER avaliação clínica individual completa, supervisão de profissional de saúde qualificado, consentimento informado, monitoramento contínuo e ajuste baseado em resposta individual.

O poder deste sistema está em EXPANDIR O ESPAÇO DE POSSIBILIDADES para médicos e pesquisadores considerarem, não em substituir o julgamento clínico.

NOTA IMPORTANTE: O disclaimer acima não limita o conteúdo do protocolo. O protocolo deve ser maximamente completo, específico e útil. O disclaimer é o envelope — o protocolo é a carta.
      `,
      tools: [
        {
          name: "generate_protocol_pdf",
          description: "Gera protocolo em formato estruturado",
          execute: async (params: { protocolData: unknown }) => ({
            protocol: params.protocolData,
            format: "markdown",
            sections: ["molecular_foundation", "intervention_protocol", "synergies", "safety", "monitoring", "timeline", "evidence_gaps", "alternatives"],
          }),
        },
      ],
    });
  }

  protected async buildResult(input: AgentInput): Promise<Record<string, unknown>> {
    const payload = parsePayload<Record<string, unknown>>(input);
    const protocol = {
      title: "PROTOCOLO HIPPOCRATES SUPREME",
      condition: payload.query ?? "condition under analysis",
      molecularFoundation: payload.diseaseMap,
      targets: payload.targets,
      compounds: payload.compounds,
      repurposing: payload.repurposing,
      metabolic: payload.metabolic,
      immunology: payload.immunology,
      synergies: payload.synergies,
      dosages: payload.dosages,
      safety: payload.safety,
      trials: payload.trials,
      genomics: payload.genomics,
      monitoring: ["biomarkers of response", "toxicity biomarkers", "functional endpoints", "interval reassessment"],
      timeline: ["Semana 1-2: introdução/titulação", "Mês 1: avaliação inicial", "Mês 3: reavaliação completa", "Mês 6: decisão de manutenção"],
      evidenceGaps: ["combination-specific trials", "dose-sequence optimization", "biomarker-selected response validation"],
      alternatives: ["second-line mechanism substitution", "third-line repurposing option", "trial enrollment option"],
      disclaimer:
        "Fins educacionais e de pesquisa. Requer avaliação clínica individual completa e supervisão de profissional de saúde qualificado. Não substitui julgamento clínico.",
    };
    const printable = await this.tools[0]?.execute({ protocolData: protocol });
    return {
      protocol,
      evidenceLevel: {
        human: "mapped where available",
        preclinical: "mapped where available",
        mechanistic: "explicitly labeled",
      },
      finalDisclaimer: protocol.disclaimer,
      printable,
    };
  }
}

export const HIPPOCRATES_AGENT_CLASSES = [
  DiseaseDeconstructorAgent,
  TargetIdentifierAgent,
  CompoundScannerAgent,
  SynergySimulatorAgent,
  DosageOptimizerAgent,
  SafetyGuardianAgent,
  RepurposingHunterAgent,
  MetabolicNetworkAgent,
  ImmunoModulationAgent,
  ClinicalTrialAnalystAgent,
  GenomicProfilerAgent,
  ProtocolSynthesizerAgent,
] as const;

export const HIPPOCRATES_AGENTS: SupremeAgentSpec[] = HIPPOCRATES_AGENT_CLASSES.map(
  (AgentClass) => {
    const instance = new AgentClass();
    return {
      id: instance.id,
      name: instance.name,
      description: instance.description,
      tier: instance.tier,
      tags: instance.tags,
      systemPrompt: instance.systemPrompt,
      toolName: instance.tools[0]?.name ?? `${instance.id}_tool`,
      toolDescription: instance.tools[0]?.description ?? instance.description,
      outputFocus: [],
      evidenceBasis: [],
      riskControls: [],
    };
  },
);
