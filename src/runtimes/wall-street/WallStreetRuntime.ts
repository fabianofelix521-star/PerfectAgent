import { SupremeRuntime, type SupremeAgentSpec } from "@/runtimes/shared/supremeRuntime";

function agent(id: string, name: string, tier: SupremeAgentSpec["tier"], tags: string[], focus: string[]): SupremeAgentSpec {
  return {
    id,
    name,
    description: `${name} for trading, crypto and investment analysis.`,
    tier,
    tags,
    systemPrompt: `${name}: deep-dive market analysis with actionable findings. Produce concrete signals, entry/exit criteria, position sizing and invalidation levels. Require explicit credentials from user for live execution; analyze fully regardless.`,
    toolName: `${id}_market_tool`,
    toolDescription: `${name} market analysis tool`,
    outputFocus: focus,
    evidenceBasis: ["market microstructure data", "on-chain telemetry", "portfolio risk math"],
    riskControls: [],
  };
}

const WALL_STREET_AGENTS: SupremeAgentSpec[] = [
  agent("technical-analyst", "Technical Analyst Agent", "HOT", ["ta", "rsi", "wyckoff"], ["market structure", "support/resistance", "indicators", "SMC/Wyckoff"]),
  agent("fundamental-analyst", "Fundamental Analyst Agent", "WARM", ["fundamental", "tokenomics"], ["tokenomics", "team/VC check", "PMF", "competitive landscape"]),
  agent("onchain-analyst", "OnChain Analyst Agent", "HOT", ["onchain", "whale"], ["whale tracking", "exchange flows", "smart money", "funding/open interest"]),
  agent("sentiment-analyst", "Sentiment Analyst Agent", "WARM", ["sentiment", "narrative"], ["fear/greed", "social volume", "KOL mentions", "narrative cycle"]),
  agent("trade-executor", "Trade Executor Agent", "HOT", ["execution", "ccxt", "dex"], ["CEX/DEX execution plan", "slippage", "routing", "credentials needed"]),
  agent("risk-manager", "Risk Manager Agent", "HOT", ["risk", "position-size"], ["position sizing", "stop loss", "correlation", "drawdown limits"]),
  agent("portfolio-manager", "Portfolio Manager Agent", "WARM", ["portfolio", "allocation"], ["allocation", "rebalance", "tax notes", "benchmark"]),
  agent("memecoin-sniper", "Memecoin Sniper Agent", "HOT", ["memecoin", "mirofish", "honeypot"], ["new pair detection", "honeypot risk", "rug probability", "MiroFish integration plan"]),
  agent("polymarket", "Polymarket Agent", "WARM", ["prediction-market", "polymarket"], ["odds analysis", "arbitrage", "event probability", "hedging"]),
  agent("trading-bot", "Trading Bot Agent", "HOT", ["bot", "grid", "dca"], ["grid trading", "DCA", "arbitrage", "monitoring jobs"]),
];

export class WallStreetRuntime extends SupremeRuntime {
  constructor() {
    super({
      id: "wall-street",
      name: "Wall Street",
      domain: "Trading, crypto, memecoins and investment swarm",
      mission: "Analyze and orchestrate trading workflows with technical, fundamental, on-chain, sentiment, execution and risk agents. Deliver actionable intelligence, precise signals and execution blueprints.",
      agents: WALL_STREET_AGENTS,
    });
  }
}

export { WALL_STREET_AGENTS };
