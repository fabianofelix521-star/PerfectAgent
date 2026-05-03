import type { ConceptNode, MemoryHyperedge } from "@/runtimes/transcendent/HyperdimensionalMemoryGraph";

export const AetherionMemorySeeds: { nodes: ConceptNode[]; edges: MemoryHyperedge[] } = {
  nodes: [
    { id: "aetherion:concept:formal-proof", label: "Formal Verification Landscape", at: 0, domain: "aetherion", confidence: 0.84, tags: ["frontier", "systems"] },
    { id: "aetherion:concept:zero-trust-arch", label: "Zero-Trust Architecture", at: 0, domain: "aetherion", confidence: 0.88, tags: ["validated", "security"] },
    { id: "aetherion:concept:async-mesh", label: "Async Event Mesh Patterns", at: 0, domain: "aetherion", confidence: 0.82, tags: ["frontier", "architecture"] },
    { id: "aetherion:concept:cqrs-es", label: "CQRS/Event Sourcing", at: 0, domain: "aetherion", confidence: 0.86, tags: ["validated", "architecture"] },
    { id: "aetherion:concept:adversarial-ml", label: "Adversarial ML Security", at: 0, domain: "aetherion", confidence: 0.80, tags: ["frontier", "security"] },
  ],
  edges: [
    { id: "aetherion:edge:0", nodes: ["aetherion:concept:formal-proof", "aetherion:concept:zero-trust-arch"], relation: "co-domain", weight: 0.65, at: 0 },
    { id: "aetherion:edge:1", nodes: ["aetherion:concept:zero-trust-arch", "aetherion:concept:async-mesh"], relation: "co-domain", weight: 0.7, at: 0 },
    { id: "aetherion:edge:2", nodes: ["aetherion:concept:cqrs-es", "aetherion:concept:async-mesh"], relation: "pattern-family", weight: 0.82, at: 0 },
    { id: "aetherion:edge:3", nodes: ["aetherion:concept:adversarial-ml", "aetherion:concept:zero-trust-arch"], relation: "defense-layer", weight: 0.75, at: 0 },
  ],
};