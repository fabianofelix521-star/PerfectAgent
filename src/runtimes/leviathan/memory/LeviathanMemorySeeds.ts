import type { ConceptNode, MemoryHyperedge } from "@/runtimes/transcendent/HyperdimensionalMemoryGraph";

export const LeviathanMemorySeeds: { nodes: ConceptNode[]; edges: MemoryHyperedge[] } = {
  nodes: [
    { id: "leviathan:concept:memecoin-lifecycle", label: "Memecoin Lifecycle", at: 0, domain: "leviathan", confidence: 0.80, tags: ["frontier", "crypto"] },
    { id: "leviathan:concept:mev", label: "MEV Extraction", at: 0, domain: "leviathan", confidence: 0.83, tags: ["frontier", "defi"] },
    { id: "leviathan:concept:onchain-intel", label: "On-Chain Intelligence", at: 0, domain: "leviathan", confidence: 0.86, tags: ["validated", "analytics"] },
    { id: "leviathan:concept:defi-arbitrage", label: "DeFi Arbitrage Patterns", at: 0, domain: "leviathan", confidence: 0.84, tags: ["frontier", "defi"] },
    { id: "leviathan:concept:market-microstructure", label: "Market Microstructure", at: 0, domain: "leviathan", confidence: 0.87, tags: ["validated", "trading"] },
  ],
  edges: [
    { id: "leviathan:edge:0", nodes: ["leviathan:concept:memecoin-lifecycle", "leviathan:concept:mev"], relation: "co-domain", weight: 0.72, at: 0 },
    { id: "leviathan:edge:1", nodes: ["leviathan:concept:mev", "leviathan:concept:onchain-intel"], relation: "co-domain", weight: 0.75, at: 0 },
    { id: "leviathan:edge:2", nodes: ["leviathan:concept:defi-arbitrage", "leviathan:concept:mev"], relation: "strategy-family", weight: 0.82, at: 0 },
    { id: "leviathan:edge:3", nodes: ["leviathan:concept:market-microstructure", "leviathan:concept:defi-arbitrage"], relation: "structural-basis", weight: 0.78, at: 0 },
  ],
};