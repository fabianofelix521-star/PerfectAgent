import type { ConceptNode, MemoryHyperedge } from "@/runtimes/transcendent/HyperdimensionalMemoryGraph";

export const MnemosyneMemorySeeds: { nodes: ConceptNode[]; edges: MemoryHyperedge[] } = {
  nodes: [
    { id: "mnemosyne:concept:psychedelics-mechanism", label: "Psychedelic Mechanisms", at: 0, domain: "mnemosyne", confidence: 0.86, tags: ["frontier", "neuroplasticity"] },
    { id: "mnemosyne:concept:dream-engineering", label: "Dream Engineering", at: 0, domain: "mnemosyne", confidence: 0.80, tags: ["frontier", "consciousness"] },
    { id: "mnemosyne:concept:trauma-reconsolidation", label: "Trauma Reconsolidation", at: 0, domain: "mnemosyne", confidence: 0.85, tags: ["validated", "therapy"] },
    { id: "mnemosyne:concept:bdnf", label: "BDNF Neuroplasticity Protocols", at: 0, domain: "mnemosyne", confidence: 0.84, tags: ["validated", "neuroplasticity"] },
    { id: "mnemosyne:concept:predictive-coding", label: "Predictive Coding Theory", at: 0, domain: "mnemosyne", confidence: 0.83, tags: ["validated", "cognition"] },
  ],
  edges: [
    { id: "mnemosyne:edge:0", nodes: ["mnemosyne:concept:psychedelics-mechanism", "mnemosyne:concept:dream-engineering"], relation: "co-domain", weight: 0.7, at: 0 },
    { id: "mnemosyne:edge:1", nodes: ["mnemosyne:concept:dream-engineering", "mnemosyne:concept:trauma-reconsolidation"], relation: "co-domain", weight: 0.65, at: 0 },
    { id: "mnemosyne:edge:2", nodes: ["mnemosyne:concept:bdnf", "mnemosyne:concept:psychedelics-mechanism"], relation: "mechanism", weight: 0.8, at: 0 },
    { id: "mnemosyne:edge:3", nodes: ["mnemosyne:concept:predictive-coding", "mnemosyne:concept:trauma-reconsolidation"], relation: "theoretical-basis", weight: 0.75, at: 0 },
  ],
};