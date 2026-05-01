import type { Agent, AgentTask, LLMToolResponse, ToolCall } from "@/modules/agents/engine/types";

export class AgentReflector {
  async reflectOnError(
    _agent: Agent,
    _messages: Array<{ role: string; content: unknown }>,
    toolCall: ToolCall,
    error: Error,
  ): Promise<string> {
    return [
      `Tool falhou: ${toolCall.function.name}`,
      `Erro: ${error.message}`,
      "Acao sugerida: validar argumentos, reduzir escopo e reexecutar com fallback.",
    ].join("\n");
  }

  async assessQuality(
    task: AgentTask,
    answer: string,
    _agent: Agent,
  ): Promise<{ score: number; feedback: string }> {
    const target = normalize(task.prompt);
    const out = normalize(answer);
    const overlap = target.filter((token) => out.includes(token)).length;
    const score = target.length === 0 ? 1 : overlap / target.length;

    if (score >= 0.7) {
      return { score, feedback: "Resposta suficientemente alinhada com o objetivo." };
    }
    return {
      score,
      feedback: "Cobertura insuficiente de requisitos. Explique melhor plano, riscos e resultado final.",
    };
  }

  coerceToolResponse(content: string): LLMToolResponse {
    try {
      const parsed = JSON.parse(content) as LLMToolResponse;
      return {
        content: typeof parsed.content === "string" || parsed.content === null ? parsed.content : null,
        tool_calls: Array.isArray(parsed.tool_calls) ? parsed.tool_calls : undefined,
      };
    } catch {
      return { content };
    }
  }
}

function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter((item) => item.length >= 4);
}
