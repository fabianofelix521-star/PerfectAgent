import { ConceptualAgentBase } from "@/modules/supreme/agents/ConceptualAgentBase";
import type { AgentInput, ExecutionContext } from "@/types/agents";

const makeTool = (name: string, description: string, result: any) => ({
  name,
  description,
  execute: async () => result,
});

abstract class FinancialAgentBase extends ConceptualAgentBase {
  protected async runDomainLogic(input: AgentInput, _context: ExecutionContext) {
    return {
      result: {
        signal: "neutral",
        timeframe: "swing",
        prompt: input.prompt,
      },
      reasoning: "Analise financeira especializada concluida.",
      confidence: 0.8,
      toolsUsed: this.tools.map((tool) => tool.name),
    };
  }
}

export class OnChainIntelligenceAgent extends FinancialAgentBase {
  constructor() {
    super({
      id: "onchain-intelligence",
      name: "On-Chain Intelligence",
      description: "Analisa sinais on-chain e fluxo de smart money.",
      supervisorId: "financial",
      tier: "HOT",
      tags: ["onchain", "analytics", "blockchain", "metrics"],
      confidence: 0.85,
      systemPrompt:
        "Analista on-chain de elite para detectar acumulacao, distribuicao e anomalias em tempo real.",
      tools: [
        makeTool("analyze_wallet_flow", "Analisa fluxo de carteiras", { flows: [], netFlow: 0, classification: "smart-money" }),
        makeTool("get_protocol_metrics", "TVL e volume DeFi", { tvl: 0, volume24h: 0, users: 0 }),
        makeTool("detect_smart_money", "Detecta carteira smart money", { smartMoneyBuying: false, volume: 0, wallets: [] }),
      ],
    });
  }
}

export class MacroEconomistAgent extends FinancialAgentBase {
  constructor() {
    super({
      id: "macro-economist",
      name: "Macro Economist",
      description: "Leitura de ciclo macro e risco global.",
      supervisorId: "financial",
      tier: "HOT",
      tags: ["macro", "fed", "rates", "inflation", "gdp", "cycles"],
      confidence: 0.72,
      systemPrompt:
        "Economista macro para ciclo de liquidez global, curva de juros e impacto em ativos de risco.",
      tools: [
        makeTool("get_macro_indicators", "Coleta CPI, GDP e NFP", { cpi: 0, gdp: 0, unemployment: 0 }),
        makeTool("analyze_yield_curve", "Analisa spread 2y-10y", { spread: 0, inverted: false, signal: "neutral" }),
        makeTool("global_liquidity_index", "Indice de liquidez global", { index: 0, trend: "expanding", yoy: 0 }),
      ],
    });
  }
}

export class SentimentOracleAgent extends FinancialAgentBase {
  constructor() {
    super({
      id: "sentiment-oracle",
      name: "Sentiment Oracle",
      description: "Agrega sentimento social e indicadores de posicionamento.",
      supervisorId: "financial",
      tier: "HOT",
      tags: ["sentiment", "social", "fear-greed", "nlp", "twitter"],
      confidence: 0.78,
      systemPrompt:
        "Oraculo de sentimento para detectar euforia, capitulacao, FOMO e distribuicao top.",
      tools: [
        makeTool("get_fear_greed", "Fear & Greed index", { value: 65, classification: "greed" }),
        makeTool("social_sentiment_score", "Score social agregado", { score: 0, volume: 0, trending: false }),
      ],
    });
  }
}

export class PortfolioOptimizerAgent extends FinancialAgentBase {
  constructor() {
    super({
      id: "portfolio-optimizer",
      name: "Portfolio Optimizer",
      description: "Otimizacao quantitativa de alocacao e risco.",
      supervisorId: "financial",
      tier: "HOT",
      tags: ["portfolio", "allocation", "sharpe", "risk", "rebalance"],
      confidence: 0.88,
      systemPrompt:
        "Gestor quantitativo para alocacao, VaR, CVaR, Sharpe e rebalanceamento.",
      tools: [
        makeTool("optimize_portfolio", "Otimiza pesos de portifolio", { weights: {}, sharpe: 0, volatility: 0 }),
        makeTool("calculate_var", "Calcula VaR e CVaR", { var95: 0, var99: 0, cvar95: 0 }),
      ],
    });
  }
}

export function createFinancialAgents() {
  return [
    new OnChainIntelligenceAgent(),
    new MacroEconomistAgent(),
    new SentimentOracleAgent(),
    new PortfolioOptimizerAgent(),
  ];
}
