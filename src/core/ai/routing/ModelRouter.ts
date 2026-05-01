import type {
  AIRequest,
  RequestAnalysis,
  RoutingDecision,
} from "@/core/ai/providers/types";

export class ModelRouter {
  async route(request: AIRequest): Promise<RoutingDecision> {
    const analysis = await this.analyzeRequest(request);

    if (request.preferredModel) {
      return {
        model: request.preferredModel,
        providerId: request.providerId,
        reason: "user_preference",
      };
    }

    if (analysis.needsVision && analysis.hasImages) {
      return {
        model: this.getBestVisionModel(),
        reason: "vision_required",
      };
    }

    if (analysis.contextLength > 100000) {
      return {
        model: "claude-3-5-sonnet-20241022",
        reason: "long_context",
      };
    }

    if (analysis.isCodeGeneration && analysis.complexity === "high") {
      return {
        model: this.getBestCodeModel(),
        reason: "complex_code",
      };
    }

    if (analysis.needsSpeed && analysis.complexity === "low") {
      return {
        model: "llama-3.1-70b-versatile",
        reason: "speed_optimized",
      };
    }

    if (analysis.needsMath || analysis.needsReasoning) {
      return {
        model: "o1-preview",
        reason: "reasoning_required",
      };
    }

    if (request.costOptimize) {
      return {
        model: "gpt-4o-mini",
        reason: "cost_optimized",
      };
    }

    return {
      model: this.getBestAvailableModel(),
      reason: "default_best",
    };
  }

  private async analyzeRequest(request: AIRequest): Promise<RequestAnalysis> {
    const joined = request.messages.map((m) => m.content).join("\n").toLowerCase();
    const hasImages = request.messages.some((m) =>
      (m.attachments ?? []).some((a) => a.type.startsWith("image/")),
    );

    return {
      needsVision: /image|screenshot|figma|layout|ui|design|analy[sz]e this/i.test(joined),
      hasImages,
      contextLength: request.messages.reduce((sum, m) => sum + m.content.length, 0),
      isCodeGeneration: /code|refactor|typescript|bug|test|build|compile|lint/i.test(joined),
      complexity: inferComplexity(joined),
      needsSpeed: /quick|fast|rapido|rápido|concise|resumo/i.test(joined),
      needsMath: /math|equation|integral|matrix|calculus|algebra|estatística/i.test(joined),
      needsReasoning: /step by step|passo a passo|reason|tradeoff|analy[sz]e/i.test(joined),
    };
  }

  private getBestVisionModel(): string {
    return "gpt-4o";
  }

  private getBestCodeModel(): string {
    return "claude-3-5-sonnet-20241022";
  }

  private getBestAvailableModel(): string {
    return "gpt-4o";
  }
}

function inferComplexity(text: string): "low" | "medium" | "high" {
  let score = 0;
  if (text.length > 5000) score += 2;
  if (/architecture|distributed|migration|performance|security|multi-agent/i.test(text)) score += 2;
  if (/fix|error|small|simple|quick/i.test(text)) score -= 1;
  if (score >= 3) return "high";
  if (score <= 0) return "low";
  return "medium";
}
