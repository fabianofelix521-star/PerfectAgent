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
import {
  CONFIDENCE_CALIBRATION_RULE,
  GLOBAL_CITATION_RULE,
  ORACLE_STRATEGY_RULES,
  withRuntimeInstructions,
} from "@/runtimes/shared/runtimeInstructions";

export interface StrategicScenario {
  name: string;
  probability: number;
  keyAssumptions: string[];
  leadingIndicators: string[];
  strategicImplications: string[];
  recommendedActions: string[];
  contingencyTriggers: string[];
}

export interface WeakSignal {
  signal: string;
  source: string;
  relevance: number;
  timeHorizon: string;
  potentialImpact: string;
  monitoringRecommendation: string;
}

export interface StrategicContext {
  objective: string;
  organization?: string;
  market?: string;
  competitors?: string[];
  constraints?: string[];
  knownSignals?: string[];
  decisionHorizonDays?: number;
}

export interface StrategicIntelligenceReport {
  context: StrategicContext;
  scenarios: StrategicScenario[];
  weakSignals: WeakSignal[];
  redTeamRisks: string[];
  competitiveLandscape: string[];
  recommendedDecision: string;
  confidence: number;
  quality: ReturnType<typeof qualityFromSignals>;
}

export interface OracleMemoryState {
  scenarioHistory: StrategicScenario[];
  weakSignals: WeakSignal[];
  decisionOutcomes: Array<{ at: number; objective: string; confidence: number }>;
}

export class CompetitiveIntelligenceAgent {
  readonly systemPrompt = withRuntimeInstructions(
    "Oracle competitive intelligence agent. Map direct, indirect, substitute, entrant and bundler threats before recommending strategy.",
    GLOBAL_CITATION_RULE,
    CONFIDENCE_CALIBRATION_RULE,
    ORACLE_STRATEGY_RULES,
  );

  analyze(context: StrategicContext): string[] {
    const competitors = context.competitors?.length ? context.competitors : ["incumbentes", "novos entrantes"];
    const mapped = competitors.map((competitor) => {
      const focus = keywordScore(competitor, ["ai", "dev", "cloud", "security"]) > 0.1 ? "produto" : "distribuicao";
      return `${competitor}: monitorar hiring, releases, reviews e narrativa publica; provavel foco em ${focus}`;
    });
    return uniqueMerge(mapped, [
      "competidores diretos: produtos que resolvem o mesmo job-to-be-done",
      "competidores indiretos: serviços adjacentes que capturam orçamento do cliente",
      "substitutos: planilhas, consultorias, automações internas e não-consumo",
      "potenciais entrantes: plataformas com distribuição e capital para copiar a categoria",
      "bundlers: Microsoft Copilot/M365, Google Workspace e suites que podem embutir o valor no pacote",
    ], 12);
  }
}

export class ScenarioPlannerAgent {
  readonly systemPrompt = withRuntimeInstructions(
    "Oracle scenario planner. Build realistic timelines, runway-aware options and reversible/irreversible decision criteria.",
    GLOBAL_CITATION_RULE,
    CONFIDENCE_CALIBRATION_RULE,
    ORACLE_STRATEGY_RULES,
  );

  plan(context: StrategicContext): StrategicScenario[] {
    const horizon = context.decisionHorizonDays ?? 90;
    const objectiveTokens = tokenize(context.objective);
    const constraintPressure = clamp01((context.constraints?.length ?? 0) / 8);
    const baseAssumptions = [
      `horizonte de decisao ${horizon} dias`,
      `mercado=${context.market ?? "nao especificado"}`,
      `objetivo contem ${objectiveTokens.slice(0, 5).join(", ")}`,
    ];
    return [
      {
        name: "Base case",
        probability: clamp01(0.42 - constraintPressure * 0.08),
        keyAssumptions: baseAssumptions,
        leadingIndicators: ["pipeline cresce de forma linear", "concorrentes nao reprecificam agressivamente"],
        strategicImplications: ["executar plano incremental", "preservar opcionalidade"],
        recommendedActions: ["rodar pilotos curtos", "medir CAC/payback e risco operacional", "calcular burn rate, runway e necessidade de raise"],
        contingencyTriggers: ["queda de conversao >20%", "novo concorrente captura narrativa"],
      },
      {
        name: "Upside acceleration",
        probability: clamp01(0.24 + keywordScore(context.objective, ["growth", "scale", "viral", "expansao"]) * 0.16),
        keyAssumptions: [...baseAssumptions, "sinal de demanda reprimida aparece cedo"],
        leadingIndicators: ["aumento de inbound", "clientes pedem expansao", "baixo churn inicial"],
        strategicImplications: ["antecipar infraestrutura e suporte", "defender posicionamento"],
        recommendedActions: ["preparar playbook de escala", "criar fila de experimentos ICE", "avaliar parceria/reseller com player maior"],
        contingencyTriggers: ["SLA degrada", "suporte vira gargalo"],
      },
      {
        name: "Adversarial failure",
        probability: clamp01(0.2 + constraintPressure * 0.22),
        keyAssumptions: [...baseAssumptions, "restricoes viram bloqueios reais"],
        leadingIndicators: ["ciclo de venda alonga", "resistencia regulatoria", "incidentes de confianca"],
        strategicImplications: ["reduzir escopo", "blindar reputacao", "conservar caixa"],
        recommendedActions: ["definir kill criteria", "criar plano de mitigacao por risco"],
        contingencyTriggers: ["payback dobra", "risco juridico alto", "falha de seguranca"],
      },
      {
        name: "Wildcard shift",
        probability: 0.14,
        keyAssumptions: ["evento externo altera premissas centrais", ...baseAssumptions],
        leadingIndicators: ["mudanca regulatoria", "tecnologia substituta", "canal dominante muda"],
        strategicImplications: ["reformular tese", "usar opcionalidade acumulada"],
        recommendedActions: ["monitorar sinais fracos semanalmente", "manter plano B operacional"],
        contingencyTriggers: ["noticias regulatórias", "queda brusca no canal principal"],
      },
    ];
  }
}

export class RedTeamAgent {
  readonly systemPrompt = withRuntimeInstructions(
    "Oracle red team agent. Stress-test strategy through finance, competition, regulation, partnership alternatives and exit valuation.",
    GLOBAL_CITATION_RULE,
    CONFIDENCE_CALIBRATION_RULE,
    ORACLE_STRATEGY_RULES,
  );

  attack(context: StrategicContext): string[] {
    return [
      `concorrente pode copiar ${context.objective.slice(0, 60)} e competir por preco`,
      "regulador ou plataforma pode restringir distribuicao",
      "cliente pode rejeitar por falta de confianca ou custo de troca",
      "assuncao oculta: demanda observada pode nao escalar para mercado amplo",
      "runway insuficiente pode tornar a decisao urgente antes de haver dados suficientes",
      "opcao ignorada: aliar-se ao gigante como implementation partner, reseller ou white-label",
      "valuation de saida precisa considerar 3-8x ARR no SaaS Brasil, ajustado por growth e churn",
      ...(context.constraints ?? []).map((constraint) => `restricao critica: ${constraint}`),
    ];
  }
}

export class WeakSignalDetectorAgent {
  readonly systemPrompt = withRuntimeInstructions(
    "Oracle weak-signal detector. Monitor market, hiring, pricing, regulation, bundling and funding signals with realistic decision horizons.",
    GLOBAL_CITATION_RULE,
    CONFIDENCE_CALIBRATION_RULE,
    ORACLE_STRATEGY_RULES,
  );

  detect(context: StrategicContext): WeakSignal[] {
    const provided = context.knownSignals?.length
      ? context.knownSignals
      : [
          "mudancas em vagas dos concorrentes",
          "novas conversas em comunidades de nicho",
          "alteracoes sutis em pricing e packaging",
        ];
    return provided.map((signal) => ({
      signal,
      source: context.organization ?? "contexto local",
      relevance: clamp01(0.45 + keywordScore(signal, tokenize(context.objective)) * 0.4),
      timeHorizon: (context.decisionHorizonDays ?? 90) > 180 ? "12-24 meses" : "30-180 dias",
      potentialImpact: keywordScore(signal, ["regulation", "pricing", "security", "platform"]) > 0.1
        ? "alto impacto se confirmado"
        : "impacto moderado com necessidade de observacao",
      monitoringRecommendation: `acompanhar semanalmente: ${signal}`,
    }));
  }
}

export class OracleRuntime {
  private readonly competitive = new CompetitiveIntelligenceAgent();
  private readonly scenarioPlanner = new ScenarioPlannerAgent();
  private readonly redTeam = new RedTeamAgent();
  private readonly weakSignals = new WeakSignalDetectorAgent();
  private readonly memory = new PersistentCognitiveMemory<OracleMemoryState>(
    "runtime:oracle:strategic-intelligence",
    () => ({ scenarioHistory: [], weakSignals: [], decisionOutcomes: [] }),
  );

  async analyzeStrategicSituation(
    context: StrategicContext,
  ): Promise<StrategicIntelligenceReport> {
    const [competitiveLandscape, scenarios, redTeamRisks, weakSignals] = await Promise.all([
      Promise.resolve(this.competitive.analyze(context)),
      Promise.resolve(this.scenarioPlanner.plan(context)),
      Promise.resolve(this.redTeam.attack(context)),
      Promise.resolve(this.weakSignals.detect(context)),
    ]);
    const confidence = clamp01(
      mean(scenarios.map((scenario) => scenario.probability)) * 0.45 +
        mean(weakSignals.map((signal) => signal.relevance)) * 0.35 +
        (context.knownSignals?.length ? 0.15 : 0.05),
    );
    const report: StrategicIntelligenceReport = {
      context,
      scenarios,
      weakSignals,
      redTeamRisks,
      competitiveLandscape,
      recommendedDecision: this.recommendDecision(scenarios, redTeamRisks),
      confidence,
      quality: qualityFromSignals({
        evidenceCount: weakSignals.length + competitiveLandscape.length,
        contradictionCount: redTeamRisks.length,
        confidence,
        uncertaintyCount: scenarios.filter((scenario) => scenario.probability < 0.2).length,
      }),
    };
    this.persist(report);
    return report;
  }

  private recommendDecision(scenarios: StrategicScenario[], risks: string[]): string {
    const weightedUpside = scenarios
      .filter((scenario) => !/failure/i.test(scenario.name))
      .reduce((sum, scenario) => sum + scenario.probability, 0);
    const downside = scenarios.find((scenario) => /failure/i.test(scenario.name))?.probability ?? 0;
    if (downside > 0.34 || risks.length > 6) {
      return "proseguir com fase limitada, kill criteria explicitos e mitigacoes antes de escala";
    }
    if (weightedUpside > 0.62) return "executar agressivamente com monitoramento de sinais lideres";
    return "executar em portfolio de experimentos pequenos preservando opcionalidade";
  }

  private persist(report: StrategicIntelligenceReport): void {
    const previous = this.memory.load();
    this.memory.save({
      ...previous,
      updatedAt: now(),
      state: {
        scenarioHistory: uniqueMerge(previous.state.scenarioHistory, report.scenarios, 100),
        weakSignals: uniqueMerge(previous.state.weakSignals, report.weakSignals, 100),
        decisionOutcomes: [
          { at: now(), objective: report.context.objective, confidence: report.confidence },
          ...previous.state.decisionOutcomes,
        ].slice(0, 100),
      },
    });
    this.memory.recordQuality(report.quality);
  }
}

export function strategicContextFromText(text: string): StrategicContext {
  return {
    objective: text || "strategic decision",
    market: /saas|software|dev|ai/i.test(text) ? "software/AI" : "general market",
    competitors: extractCompetitors(text),
    constraints: text
      .split(/[.;\n]/)
      .filter((part) => /risco|constraint|limit|custo|regula|tempo/i.test(part))
      .slice(0, 5),
    knownSignals: text
      .split(/[.;\n]/)
      .filter((part) => /sinal|trend|vaga|noticia|mudanca|pricing/i.test(part))
      .slice(0, 6),
    decisionHorizonDays: /ano|year/i.test(text) ? 365 : 90,
  };
}

function extractCompetitors(text: string): string[] {
  const matches = text.match(/concorrente[s]?:([^.\n]+)/i)?.[1];
  if (!matches) return [];
  return matches
    .split(/[,/]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => `${item}-${stableId(item).slice(0, 3)}`);
}
