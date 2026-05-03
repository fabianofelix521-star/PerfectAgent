import type { ConceptNode, MemoryHyperedge } from "@/runtimes/transcendent/HyperdimensionalMemoryGraph";

export const AkashaMemorySeeds: { nodes: ConceptNode[]; edges: MemoryHyperedge[] } = {
  nodes: [
    { id: "akasha:concept:enochian", label: "Enochian System", at: 0, domain: "akasha", confidence: 0.85, tags: ["esoteric", "operative"] },
    { id: "akasha:concept:kabbalah", label: "Kabbalistic Tree of Life", at: 0, domain: "akasha", confidence: 0.88, tags: ["esoteric", "hermetic"] },
    { id: "akasha:concept:trance-states", label: "Deep Trance Cartography", at: 0, domain: "akasha", confidence: 0.82, tags: ["frontier", "consciousness"] },
    { id: "akasha:concept:chaos-magick", label: "Chaos Magick Framework", at: 0, domain: "akasha", confidence: 0.80, tags: ["esoteric", "operative"] },
    { id: "akasha:concept:hermetic-alchemy", label: "Hermetic Alchemy", at: 0, domain: "akasha", confidence: 0.84, tags: ["esoteric", "hermetic"] },
  ],
  edges: [
    { id: "akasha:edge:0", nodes: ["akasha:concept:enochian", "akasha:concept:kabbalah"], relation: "co-tradition", weight: 0.75, at: 0 },
    { id: "akasha:edge:1", nodes: ["akasha:concept:kabbalah", "akasha:concept:trance-states"], relation: "co-domain", weight: 0.6, at: 0 },
    { id: "akasha:edge:2", nodes: ["akasha:concept:chaos-magick", "akasha:concept:enochian"], relation: "operative-basis", weight: 0.7, at: 0 },
    { id: "akasha:edge:3", nodes: ["akasha:concept:hermetic-alchemy", "akasha:concept:kabbalah"], relation: "syncretic", weight: 0.8, at: 0 },
  ],
};