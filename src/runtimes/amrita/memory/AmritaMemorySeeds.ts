import type { ConceptNode, MemoryHyperedge } from "@/runtimes/transcendent/HyperdimensionalMemoryGraph";

export const AmritaMemorySeeds: { nodes: ConceptNode[]; edges: MemoryHyperedge[] } = {
  nodes: [
    { id: "amrita:concept:mtor", label: "mTOR Longevity Axis", at: 0, domain: "amrita", confidence: 0.88, tags: ["validated", "longevity"] },
    { id: "amrita:concept:nootropics", label: "Nootropic Stacking", at: 0, domain: "amrita", confidence: 0.82, tags: ["frontier", "cognitive"] },
    { id: "amrita:concept:gut-brain", label: "Gut-Brain Axis", at: 0, domain: "amrita", confidence: 0.85, tags: ["validated", "microbiome"] },
    { id: "amrita:concept:nad-plus", label: "NAD+ Metabolism", at: 0, domain: "amrita", confidence: 0.86, tags: ["validated", "longevity"] },
    { id: "amrita:concept:mitophagy", label: "Mitophagy Induction", at: 0, domain: "amrita", confidence: 0.80, tags: ["frontier", "cellular"] },
  ],
  edges: [
    { id: "amrita:edge:0", nodes: ["amrita:concept:mtor", "amrita:concept:nootropics"], relation: "co-domain", weight: 0.65, at: 0 },
    { id: "amrita:edge:1", nodes: ["amrita:concept:nootropics", "amrita:concept:gut-brain"], relation: "co-domain", weight: 0.7, at: 0 },
    { id: "amrita:edge:2", nodes: ["amrita:concept:nad-plus", "amrita:concept:mtor"], relation: "upstream-regulator", weight: 0.82, at: 0 },
    { id: "amrita:edge:3", nodes: ["amrita:concept:mitophagy", "amrita:concept:nad-plus"], relation: "synergy", weight: 0.78, at: 0 },
  ],
};