import { SupremeRuntime, type SupremeAgentSpec } from "@/runtimes/shared/supremeRuntime";

function agent(id: string, name: string, tier: SupremeAgentSpec["tier"], tags: string[], focus: string[]): SupremeAgentSpec {
  return {
    id,
    name,
    description: `${name} for trading, crypto and investment analysis.`,
    tier,
    tags,
    systemPrompt: `${name}: analyze markets with risk management first. Any execution requires explicit user-configured exchange/wallet credentials and hard risk limits.`,
    toolName: `${id}_market_tool`,
    toolDescription: `${name} market analysis tool`,
    outputFocus: focus,
    evidenceBasis: ["market microstructure data", "on-chain telemetry", "portfolio risk math"],
    riskControls: ["Not financial advice", "No autonomous trade without configured limits", "Always define stop, invalidation and max loss"],
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
      mission: "Analyze and optionally orchestrate trading workflows with technical, fundamental, on-chain, sentiment, execution and risk agents.",
      safetyNotice: "Financial research only unless the user configures execution credentials and explicit risk limits. No guarantee of profit; losses are possible.",
      agents: WALL_STREET_AGENTS,
    });
  }
}

export { WALL_STREET_AGENTS };
