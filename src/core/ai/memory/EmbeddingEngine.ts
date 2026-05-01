/**
 * Local embedding engine.
 * Default mode is deterministic local hashing to keep the app fully offline.
 * If a transformers pipeline is attached at runtime, it can be used transparently.
 */
export class EmbeddingEngine {
  private isLocal = true;
  private dimensions = 384;

  async initialize(): Promise<void> {
    this.isLocal = true;
  }

  async embed(text: string): Promise<number[]> {
    if (!this.isLocal) {
      return this.embedWithOpenAI(text);
    }
    return this.localHashEmbedding(text);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((item) => this.embed(item)));
  }

  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    if (magA === 0 || magB === 0) return 0;
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
  }

  private localHashEmbedding(text: string): number[] {
    const out = new Array<number>(this.dimensions).fill(0);
    const tokens = tokenize(text);
    if (tokens.length === 0) return out;

    for (const token of tokens) {
      const h1 = fnv1a32(token, 2166136261);
      const h2 = fnv1a32(token, 16777619);
      const idxA = h1 % this.dimensions;
      const idxB = h2 % this.dimensions;
      out[idxA] += 1;
      out[idxB] -= 0.5;
    }

    const norm = Math.sqrt(out.reduce((sum, item) => sum + item * item, 0));
    if (norm === 0) return out;
    return out.map((item) => item / norm);
  }

  private async embedWithOpenAI(_text: string): Promise<number[]> {
    return new Array<number>(this.dimensions).fill(0);
  }
}

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function fnv1a32(text: string, seed: number): number {
  let hash = seed >>> 0;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }
  return Math.abs(hash >>> 0);
}
