import type { ConceptNode, MemoryHyperedge } from "@/runtimes/transcendent/HyperdimensionalMemoryGraph";

export const PeithoMemorySeeds: { nodes: ConceptNode[]; edges: MemoryHyperedge[] } = {
  nodes: [
    { id: "peitho:concept:neuromarketing", label: "Neuromarketing Science", at: 0, domain: "peitho", confidence: 0.86, tags: ["validated", "marketing"] },
    { id: "peitho:concept:viral-memetics", label: "Viral Memetic Engineering", at: 0, domain: "peitho", confidence: 0.82, tags: ["frontier", "culture"] },
    { id: "peitho:concept:psychographics", label: "Psychographic Profiling", at: 0, domain: "peitho", confidence: 0.85, tags: ["validated", "audience"] },
    { id: "peitho:concept:emotional-contagion", label: "Emotional Contagion Mechanics", at: 0, domain: "peitho", confidence: 0.80, tags: ["frontier", "social"] },
    { id: "peitho:concept:persuasion-architecture", label: "Persuasion Architecture", at: 0, domain: "peitho", confidence: 0.84, tags: ["validated", "marketing"] },
  ],
  edges: [
    { id: "peitho:edge:0", nodes: ["peitho:concept:neuromarketing", "peitho:concept:viral-memetics"], relation: "co-domain", weight: 0.7, at: 0 },
    { id: "peitho:edge:1", nodes: ["peitho:concept:viral-memetics", "peitho:concept:psychographics"], relation: "co-domain", weight: 0.72, at: 0 },
    { id: "peitho:edge:2", nodes: ["peitho:concept:emotional-contagion", "peitho:concept:viral-memetics"], relation: "mechanism", weight: 0.82, at: 0 },
    { id: "peitho:edge:3", nodes: ["peitho:concept:persuasion-architecture", "peitho:concept:neuromarketing"], relation: "applied-science", weight: 0.78, at: 0 },
  ],
};