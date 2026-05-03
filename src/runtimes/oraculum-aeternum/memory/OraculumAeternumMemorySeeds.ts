import type { ConceptNode, MemoryHyperedge } from "@/runtimes/transcendent/HyperdimensionalMemoryGraph";

const now = Date.now();

const nodes: ConceptNode[] = Array.from({ length: 50 }, (_, i) => ({
  id: "oraculum-aeternum:node:" + (i + 1),
  label: "Oraculum Aeternum Runtime concept " + (i + 1),
  at: now + i,
  domain: "Geopolitical Intelligence, Macro Strategy & Civilizational Forecasting",
  confidence: 0.62 + ((i % 7) * 0.04),
  tags: ["apex", "oraculum-aeternum", i % 2 === 0 ? "frontier" : "validated"],
  sourceRuntime: "oraculum-aeternum",
}));

const edges: MemoryHyperedge[] = Array.from({ length: 60 }, (_, i) => ({
  id: "oraculum-aeternum:edge:" + (i + 1),
  nodes: [nodes[i % nodes.length].id, nodes[(i + 3) % nodes.length].id, nodes[(i + 11) % nodes.length].id],
  relation: i % 3 === 0 ? "causal" : i % 3 === 1 ? "resonant" : "compositional",
  weight: 0.45 + ((i % 10) * 0.05),
  at: now + i,
}));

export const OraculumAeternumMemorySeeds: { nodes: ConceptNode[]; edges: MemoryHyperedge[] } = {
  nodes,
  edges,
};
