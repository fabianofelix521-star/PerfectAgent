import type { ConceptNode, MemoryHyperedge } from "@/runtimes/transcendent/HyperdimensionalMemoryGraph";

export const NoumenonMemorySeeds: { nodes: ConceptNode[]; edges: MemoryHyperedge[] } = {
  nodes: [
    { id: "noumenon:concept:loop-qg", label: "Loop Quantum Gravity", at: 0, domain: "noumenon", confidence: 0.84, tags: ["frontier", "physics"] },
    { id: "noumenon:concept:iit", label: "Integrated Information Theory", at: 0, domain: "noumenon", confidence: 0.80, tags: ["frontier", "consciousness"] },
    { id: "noumenon:concept:fringe-physics", label: "Fringe Physics Landscape", at: 0, domain: "noumenon", confidence: 0.72, tags: ["experimental"] },
    { id: "noumenon:concept:m-theory", label: "M-Theory / String Theory", at: 0, domain: "noumenon", confidence: 0.82, tags: ["frontier", "physics"] },
    { id: "noumenon:concept:mathematical-universe", label: "Mathematical Universe Hypothesis", at: 0, domain: "noumenon", confidence: 0.75, tags: ["frontier", "philosophy"] },
  ],
  edges: [
    { id: "noumenon:edge:0", nodes: ["noumenon:concept:loop-qg", "noumenon:concept:iit"], relation: "co-domain", weight: 0.6, at: 0 },
    { id: "noumenon:edge:1", nodes: ["noumenon:concept:iit", "noumenon:concept:fringe-physics"], relation: "co-domain", weight: 0.55, at: 0 },
    { id: "noumenon:edge:2", nodes: ["noumenon:concept:loop-qg", "noumenon:concept:m-theory"], relation: "competing-theory", weight: 0.8, at: 0 },
    { id: "noumenon:edge:3", nodes: ["noumenon:concept:mathematical-universe", "noumenon:concept:iit"], relation: "ontological-bridge", weight: 0.7, at: 0 },
  ],
};