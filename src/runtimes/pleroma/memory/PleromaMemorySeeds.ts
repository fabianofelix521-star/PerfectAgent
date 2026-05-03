import type { ConceptNode, MemoryHyperedge } from "@/runtimes/transcendent/HyperdimensionalMemoryGraph";

export const PleromaMemorySeeds: { nodes: ConceptNode[]; edges: MemoryHyperedge[] } = {
  nodes: [
    { id: "pleroma:concept:meta-synthesis", label: "Cross-Domain Meta-Synthesis", at: 0, domain: "pleroma", confidence: 0.88, tags: ["frontier", "orchestration"] },
    { id: "pleroma:concept:paradigm-shift", label: "Paradigm Shift Engineering", at: 0, domain: "pleroma", confidence: 0.84, tags: ["frontier", "philosophy"] },
    { id: "pleroma:concept:emergent-patterns", label: "Emergent Cross-Domain Patterns", at: 0, domain: "pleroma", confidence: 0.86, tags: ["frontier", "complexity"] },
    { id: "pleroma:concept:runtime-orchestration", label: "Multi-Runtime Orchestration", at: 0, domain: "pleroma", confidence: 0.90, tags: ["validated", "orchestration"] },
    { id: "pleroma:concept:omni-context", label: "Omni-Context Window Management", at: 0, domain: "pleroma", confidence: 0.85, tags: ["frontier", "memory"] },
  ],
  edges: [
    { id: "pleroma:edge:0", nodes: ["pleroma:concept:meta-synthesis", "pleroma:concept:paradigm-shift"], relation: "co-domain", weight: 0.78, at: 0 },
    { id: "pleroma:edge:1", nodes: ["pleroma:concept:paradigm-shift", "pleroma:concept:emergent-patterns"], relation: "co-domain", weight: 0.75, at: 0 },
    { id: "pleroma:edge:2", nodes: ["pleroma:concept:runtime-orchestration", "pleroma:concept:meta-synthesis"], relation: "enables", weight: 0.88, at: 0 },
    { id: "pleroma:edge:3", nodes: ["pleroma:concept:omni-context", "pleroma:concept:emergent-patterns"], relation: "memory-basis", weight: 0.80, at: 0 },
  ],
};