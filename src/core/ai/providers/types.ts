import type { ChatMessageV2, ProviderSpec } from "@/types";

export type AIProviderId =
  | "anthropic"
  | "openai"
  | "gemini"
  | "groq"
  | "cohere"
  | "mistral"
  | "huggingface"
  | "ollama"
  | "openrouter"
  | "custom";

export interface StreamChunk {
  delta: string;
}

export interface AIRequest {
  messages: ChatMessageV2[];
  model: string;
  providerId?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  preferredModel?: string;
  costOptimize?: boolean;
  metadata?: Record<string, unknown>;
}

export interface AIProviderRequest {
  spec: ProviderSpec;
  model: string;
  messages: ChatMessageV2[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface AIProvider {
  readonly id: AIProviderId;
  readonly label: string;
  supportsModel(model: string): boolean;
  stream(request: AIProviderRequest): AsyncIterable<StreamChunk>;
  complete(request: AIProviderRequest): Promise<string>;
}

export interface RoutingDecision {
  model: string;
  reason:
    | "user_preference"
    | "vision_required"
    | "long_context"
    | "complex_code"
    | "speed_optimized"
    | "reasoning_required"
    | "cost_optimized"
    | "default_best";
  providerId?: string;
}

export interface RequestAnalysis {
  needsVision: boolean;
  hasImages: boolean;
  contextLength: number;
  isCodeGeneration: boolean;
  complexity: "low" | "medium" | "high";
  needsSpeed: boolean;
  needsMath: boolean;
  needsReasoning: boolean;
}
