/**
 * Lightweight in-browser vectorizer.
 *
 * Produces deterministic, unit-normalised embeddings from arbitrary text
 * using the "hashing trick" over n-grams + skill keywords. Good enough as a
 * Confidence Oracle proxy without depending on a remote embedding API.
 */

import type { Vector } from "./types";

/** Embedding dimensionality. Power of two for fast modulo. */
export const VECTOR_DIM = 256;

/** Tokens we consider stop-words and skip. */
const STOP = new Set([
  "a",
  "o",
  "as",
  "os",
  "um",
  "uma",
  "de",
  "do",
  "da",
  "dos",
  "das",
  "e",
  "ou",
  "que",
  "para",
  "com",
  "sem",
  "em",
  "no",
  "na",
  "nos",
  "nas",
  "the",
  "a",
  "an",
  "and",
  "or",
  "of",
  "to",
  "in",
  "on",
  "with",
  "for",
  "is",
  "are",
  "be",
  "as",
  "it",
  "this",
  "that",
]);

/** FNV-1a 32-bit hash. */
function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s+#.-]/gu, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOP.has(t));
}

function bigrams(tokens: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    out.push(`${tokens[i]} ${tokens[i + 1]}`);
  }
  return out;
}

/** Build a unit-normalised embedding for a single piece of text. */
export function vectorize(text: string, extraTokens: string[] = []): Vector {
  const v = new Float32Array(VECTOR_DIM);
  const tokens = tokenize(text);
  const grams = [
    ...tokens,
    ...bigrams(tokens),
    ...extraTokens.map((t) => t.toLowerCase()),
  ];

  for (const g of grams) {
    const h = fnv1a(g);
    const idx = h % VECTOR_DIM;
    // Sign trick — collisions cancel half the time.
    const sign = (h & 0x80000000) === 0 ? 1 : -1;
    v[idx] += sign;
  }

  // L2 normalisation.
  let sumSq = 0;
  for (let i = 0; i < VECTOR_DIM; i++) sumSq += v[i] * v[i];
  if (sumSq === 0) return v;
  const inv = 1 / Math.sqrt(sumSq);
  for (let i = 0; i < VECTOR_DIM; i++) v[i] *= inv;
  return v;
}

/** Cosine similarity. Both vectors are expected unit-normalised. */
export function cosineSimilarity(a: Vector, b: Vector): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  // Map [-1..1] → [0..1] so we can multiply with other [0..1] factors safely.
  return (dot + 1) / 2;
}
