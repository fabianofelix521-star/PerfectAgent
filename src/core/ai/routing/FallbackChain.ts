import type { AIRequest } from "@/core/ai/providers/types";

export interface FallbackAttempt {
  model: string;
  providerId?: string;
}

export class FallbackChain {
  build(request: AIRequest): FallbackAttempt[] {
    const chain: FallbackAttempt[] = [];

    if (request.preferredModel) {
      chain.push({ model: request.preferredModel, providerId: request.providerId });
    }

    chain.push({ model: request.model, providerId: request.providerId });

    if (/claude/i.test(request.model)) {
      chain.push({ model: "gpt-4o", providerId: "openai" });
      chain.push({ model: "llama-3.1-70b-versatile", providerId: "groq" });
    } else if (/gpt|o1|o3/i.test(request.model)) {
      chain.push({ model: "claude-3-5-sonnet-20241022", providerId: "anthropic" });
      chain.push({ model: "llama-3.1-70b-versatile", providerId: "groq" });
    } else {
      chain.push({ model: "gpt-4o-mini", providerId: "openai" });
      chain.push({ model: "claude-3-5-haiku-20241022", providerId: "anthropic" });
    }

    return dedupe(chain);
  }
}

function dedupe(items: FallbackAttempt[]): FallbackAttempt[] {
  const seen = new Set<string>();
  const next: FallbackAttempt[] = [];
  for (const item of items) {
    const key = `${item.providerId ?? "auto"}:${item.model}`;
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(item);
  }
  return next;
}
