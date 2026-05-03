// ─── Primitive node types ────────────────────────────────────────────────────

export interface MemoryNode {
  id: string;
  label: string;
  at: number;
  metadata?: Record<string, unknown>;
}

export interface MemoryHyperedge {
  id: string;
  nodes: string[];
  relation: string;
  weight: number;
  at: number;
}

// ─── Extended HDMG types ─────────────────────────────────────────────────────

/** Rich concept node — supports frontier/experimental knowledge without filters */
export interface ConceptNode extends MemoryNode {
  domain: string;
  confidence: number;
  /** Tags: e.g. "frontier", "esoteric", "validated", "experimental" */
  tags: string[];
  embedding?: number[];
  sourceRuntime?: string;
}

/** N-ary hyperedge linking arbitrary numbers of concept nodes */
export interface Hyperedge extends MemoryHyperedge {
  arity: number;
  strength: number;
  temporal: boolean;
  crossRuntime: boolean;
}

/** A named temporal layer bucketing memories by epoch */
export interface TemporalMemoryLayer {
  id: string;
  epoch: number;
  label: string;
  nodes: ConceptNode[];
  edges: Hyperedge[];
}

// ─── Core HDMG class ─────────────────────────────────────────────────────────

export class HyperdimensionalMemoryGraph {
  private readonly nodes = new Map<string, MemoryNode>();
  private readonly edges = new Map<string, MemoryHyperedge>();
  private readonly layers = new Map<string, TemporalMemoryLayer>();

  upsertNode(node: MemoryNode): void {
    this.nodes.set(node.id, node);
  }

  connect(edge: MemoryHyperedge): void {
    this.edges.set(edge.id, edge);
  }

  neighborhood(nodeId: string): MemoryHyperedge[] {
    return Array.from(this.edges.values()).filter((edge) =>
      edge.nodes.includes(nodeId),
    );
  }

  snapshot(): { nodes: MemoryNode[]; edges: MemoryHyperedge[] } {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
    };
  }

  // ─── Extended HDMG API ─────────────────────────────────────────────────────

  /** Add a rich ConceptNode (frontier/esoteric/experimental without filtering) */
  upsertConcept(node: ConceptNode): void {
    this.nodes.set(node.id, node);
  }

  /** Add an N-ary Hyperedge */
  connectHyperedge(edge: Hyperedge): void {
    this.edges.set(edge.id, edge);
  }

  /** Create or update a temporal memory layer */
  addTemporalLayer(layer: TemporalMemoryLayer): void {
    this.layers.set(layer.id, layer);
    for (const node of layer.nodes) this.upsertConcept(node);
    for (const edge of layer.edges) this.connectHyperedge(edge);
  }

  getLayer(id: string): TemporalMemoryLayer | undefined {
    return this.layers.get(id);
  }

  allLayers(): TemporalMemoryLayer[] {
    return Array.from(this.layers.values()).sort((a, b) => a.epoch - b.epoch);
  }

  /** Semantic neighborhood search (cosine-like dot product on embeddings) */
  semanticNeighbors(embedding: number[], topK = 5): ConceptNode[] {
    const candidates = Array.from(this.nodes.values()).filter(
      (n): n is ConceptNode => Array.isArray((n as ConceptNode).embedding),
    );
    const scored = candidates.map((node) => {
      const emb = (node as ConceptNode).embedding!;
      const dot = embedding.reduce((acc, v, i) => acc + v * (emb[i] ?? 0), 0);
      return { node, score: dot };
    });
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(({ node }) => node);
  }
}

// ─── DreamConsolidator ────────────────────────────────────────────────────────

/**
 * Offline consolidation pass — surfaces latent cross-domain connections
 * without censorship or topic filters.
 */
export class DreamConsolidator {
  constructor(private readonly graph: HyperdimensionalMemoryGraph) {}

  /** Run one consolidation cycle; returns new synthetic hyperedges created */
  consolidate(runtimeId: string): Hyperedge[] {
    const snap = this.graph.snapshot();
    const synthetic: Hyperedge[] = [];
    const nodes = snap.nodes;
    for (let i = 0; i < nodes.length - 1; i++) {
      for (let j = i + 1; j < Math.min(i + 6, nodes.length); j++) {
        const a = nodes[i];
        const b = nodes[j];
        const edgeId = `dream:${runtimeId}:${a.id}:${b.id}`;
        if (snap.edges.some((e) => e.id === edgeId)) continue;
        const edge: Hyperedge = {
          id: edgeId,
          nodes: [a.id, b.id],
          relation: "dream-association",
          weight: 0.3 + Math.random() * 0.4,
          at: Date.now(),
          arity: 2,
          strength: 0.4,
          temporal: false,
          crossRuntime: false,
        };
        this.graph.connectHyperedge(edge);
        synthetic.push(edge);
      }
    }
    return synthetic;
  }
}

// ─── InterRuntimeResonanceMemory ──────────────────────────────────────────────

/** Enables cross-runtime insight transfer without barriers */
export class InterRuntimeResonanceMemory {
  private static readonly channels = new Map<string, ConceptNode[]>();

  /** Broadcast a concept node to a resonance channel */
  static broadcast(channel: string, node: ConceptNode): void {
    const existing = this.channels.get(channel) ?? [];
    existing.push(node);
    this.channels.set(channel, existing.slice(-128)); // rolling window
  }

  /** Receive all concept nodes from a channel */
  static receive(channel: string): ConceptNode[] {
    return this.channels.get(channel) ?? [];
  }

  /** Merge insights from another runtime's HDMG snapshot into local graph */
  static merge(
    local: HyperdimensionalMemoryGraph,
    remoteSnap: { nodes: MemoryNode[]; edges: MemoryHyperedge[] },
    sourceRuntime: string,
  ): void {
    for (const node of remoteSnap.nodes) {
      local.upsertConcept({ ...(node as ConceptNode), sourceRuntime, tags: ["cross-runtime"] });
    }
    for (const edge of remoteSnap.edges) {
      local.connectHyperedge({ ...(edge as Hyperedge), crossRuntime: true, arity: edge.nodes.length, strength: 0.5, temporal: false });
    }
  }
}
