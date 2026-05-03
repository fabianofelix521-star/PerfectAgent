import type { ConceptNode, MemoryHyperedge } from "@/runtimes/transcendent/HyperdimensionalMemoryGraph";

export const PanaceaMemorySeeds: { nodes: ConceptNode[]; edges: MemoryHyperedge[] } = {
  nodes: [
    { id: "panacea:concept:polypharmacology", label: "Polypharmacology", at: 0, domain: "panacea", confidence: 0.85, tags: ["frontier", "molecular"] },
    { id: "panacea:concept:longevity", label: "Radical Longevity", at: 0, domain: "panacea", confidence: 0.85, tags: ["frontier", "anti-aging"] },
    { id: "panacea:concept:psychedelic-therapy", label: "Psychedelic-Assisted Therapy", at: 0, domain: "panacea", confidence: 0.85, tags: ["frontier", "neuroplasticity"] },
    { id: "panacea:concept:epigenetic-reprogramming", label: "Epigenetic Reprogramming", at: 0, domain: "panacea", confidence: 0.80, tags: ["frontier", "molecular"] },
    { id: "panacea:concept:senolytics", label: "Senolytic Therapy", at: 0, domain: "panacea", confidence: 0.82, tags: ["frontier", "anti-aging"] },
  ],
  edges: [
    { id: "panacea:edge:0", nodes: ["panacea:concept:polypharmacology", "panacea:concept:longevity"], relation: "co-domain", weight: 0.7, at: 0 },
    { id: "panacea:edge:1", nodes: ["panacea:concept:longevity", "panacea:concept:psychedelic-therapy"], relation: "co-domain", weight: 0.6, at: 0 },
    { id: "panacea:edge:2", nodes: ["panacea:concept:longevity", "panacea:concept:epigenetic-reprogramming"], relation: "mechanism", weight: 0.8, at: 0 },
    { id: "panacea:edge:3", nodes: ["panacea:concept:epigenetic-reprogramming", "panacea:concept:senolytics"], relation: "synergy", weight: 0.75, at: 0 },
  ],
};