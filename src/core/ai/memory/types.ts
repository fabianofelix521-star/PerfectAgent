import type { ChatMessageV2 } from "@/types";

export type MemoryKind =
  | "short-term"
  | "long-term"
  | "episodic"
  | "semantic"
  | "procedural";

export interface Memory {
  id: string;
  kind: MemoryKind;
  type: string;
  content: string;
  timestamp: number;
  score?: number;
  importance?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface MemoryInput {
  agentId: string;
  content: string;
  type: string;
  importance?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface MemoryClassification {
  isShortTerm: boolean;
  isFactual: boolean;
  isEpisodic: boolean;
  isEntity: boolean;
  isSkill: boolean;
}

export interface RecallOptions {
  shortTermLimit?: number;
  longTermLimit?: number;
  episodicLimit?: number;
  semanticLimit?: number;
  proceduralLimit?: number;
}

export interface VectorRecord {
  id: string;
  values: number[];
  metadata: {
    agentId: string;
    content: string;
    type: string;
    importance?: number;
    timestamp: number;
    tags?: string[];
  };
}

export interface VectorQueryResult {
  id: string;
  score: number;
  metadata: VectorRecord["metadata"];
}

export interface VectorStoreAdapter {
  init(agentId: string): Promise<void>;
  upsert(record: VectorRecord): Promise<void>;
  query(params: {
    vector: number[];
    topK: number;
    includeMetadata?: boolean;
    filter?: Record<string, unknown>;
  }): Promise<{ matches: VectorQueryResult[] }>;
  delete(id: string): Promise<void>;
}

export interface MemoryContextMessage extends Pick<ChatMessageV2, "role" | "content"> {}
