import type { ConceptNode, MemoryHyperedge } from "@/runtimes/transcendent/HyperdimensionalMemoryGraph";

export const ElysiumMemorySeeds: { nodes: ConceptNode[]; edges: MemoryHyperedge[] } = {
  nodes: [
    { id: "elysium:concept:emergent-physics", label: "Custom Emergent Physics", at: 0, domain: "elysium", confidence: 0.84, tags: ["frontier", "worlds"] },
    { id: "elysium:concept:cognitive-npc", label: "Cognitive NPC Architecture", at: 0, domain: "elysium", confidence: 0.82, tags: ["frontier", "ai"] },
    { id: "elysium:concept:dreamscape", label: "Dreamscape Design", at: 0, domain: "elysium", confidence: 0.80, tags: ["esoteric", "narrative"] },
    { id: "elysium:concept:procedural-narrative", label: "Procedural Narrative Systems", at: 0, domain: "elysium", confidence: 0.85, tags: ["frontier", "narrative"] },
    { id: "elysium:concept:world-economy", label: "World Economic Simulation", at: 0, domain: "elysium", confidence: 0.83, tags: ["validated", "systems"] },
  ],
  edges: [
    { id: "elysium:edge:0", nodes: ["elysium:concept:emergent-physics", "elysium:concept:cognitive-npc"], relation: "co-domain", weight: 0.7, at: 0 },
    { id: "elysium:edge:1", nodes: ["elysium:concept:cognitive-npc", "elysium:concept:dreamscape"], relation: "co-domain", weight: 0.65, at: 0 },
    { id: "elysium:edge:2", nodes: ["elysium:concept:procedural-narrative", "elysium:concept:cognitive-npc"], relation: "narrative-agent", weight: 0.8, at: 0 },
    { id: "elysium:edge:3", nodes: ["elysium:concept:world-economy", "elysium:concept:emergent-physics"], relation: "world-layer", weight: 0.72, at: 0 },
  ],
};