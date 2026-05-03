import type { ConceptNode, MemoryHyperedge } from "@/runtimes/transcendent/HyperdimensionalMemoryGraph";

const now = Date.now();

const nodes: ConceptNode[] = Array.from({ length: 50 }, (_, i) => ({
  id: "helios-genesis:node:" + (i + 1),
  label: "Helios Genesis Runtime concept " + (i + 1),
  at: now + i,
  domain: "Biotechnology, Genetic Engineering & Synthetic Biology",
  confidence: 0.62 + ((i % 7) * 0.04),
  tags: ["apex", "helios-genesis", i % 2 === 0 ? "frontier" : "validated"],
  sourceRuntime: "helios-genesis",
}));

const edges: MemoryHyperedge[] = Array.from({ length: 60 }, (_, i) => ({
  id: "helios-genesis:edge:" + (i + 1),
  nodes: [nodes[i % nodes.length].id, nodes[(i + 3) % nodes.length].id, nodes[(i + 11) % nodes.length].id],
  relation: i % 3 === 0 ? "causal" : i % 3 === 1 ? "resonant" : "compositional",
  weight: 0.45 + ((i % 10) * 0.05),
  at: now + i,
}));

export const HeliosGenesisMemorySeeds: { nodes: ConceptNode[]; edges: MemoryHyperedge[] } = {
  nodes,
  edges,
};
