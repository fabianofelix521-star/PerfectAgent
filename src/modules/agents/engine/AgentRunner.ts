import { nanoid } from "nanoid";
import { memoryEngine } from "@/core/ai/memory/MemoryEngine";
import { mcpClient } from "@/core/mcp/MCPClient";
import { unifiedAIService } from "@/core/ai/providers/UnifiedAIService";
import { skillRegistry } from "@/core/skills/SkillRegistry";
import { AgentPlanner } from "@/modules/agents/engine/AgentPlanner";
import { AgentReflector } from "@/modules/agents/engine/AgentReflector";
import { toolExecutor } from "@/modules/agents/engine/ToolExecutor";
import type {
  Agent,
  AgentStep,
  AgentTask,
  AgentTaskResult,
  AITool,
  LLMToolResponse,
  TaskPlan,
} from "@/modules/agents/engine/types";
import type { Memory } from "@/core/ai/memory/types";

export class AgentRunner {
  private planner = new AgentPlanner();
  private reflector = new AgentReflector();

  async run(
    agent: Agent,
    task: AgentTask,
    onStep: (step: AgentStep) => void,
  ): Promise<AgentTaskResult> {
    const startedAt = task.startedAt ?? new Date();

    await memoryEngine.initialize(agent.id);
    const relevantMemories = await memoryEngine.recall(task.prompt, {
      longTermLimit: 10,
      episodicLimit: 6,
      semanticLimit: 6,
    });

    let plan: TaskPlan | null = null;
    if (agent.config.usePlanning) {
      plan = await this.planner.createPlan(task, relevantMemories, agent);
      onStep({
        type: "planning",
        content: plan.steps.map((item) => item.description).join("\n"),
        timestamp: new Date(),
      });
    }

    const agentTools = this.buildAgentTools(agent);
    const messages: Array<{ role: string; content: unknown }> = [
      {
        role: "system",
        content: this.buildSystemPrompt(agent, relevantMemories, task.prompt),
      },
      {
        role: "user",
        content: this.buildTaskPrompt(task, plan),
      },
    ];

    let iterations = 0;
    let finalResult: string | null = null;

    while (iterations < agent.config.maxIterations && !finalResult) {
      iterations += 1;

      const response = await this.callLLMWithTools(messages, agentTools);

      if (response.tool_calls && response.tool_calls.length > 0) {
        for (const toolCall of response.tool_calls) {
          const toolInput = safeJsonParse(toolCall.function.arguments);
          onStep({
            type: "tool_call",
            toolName: toolCall.function.name,
            toolInput,
            timestamp: new Date(),
          });

          let toolResult: unknown;
          try {
            toolResult = await toolExecutor.execute(
              toolCall.function.name,
              toRecord(toolInput),
            );
            onStep({
              type: "tool_result",
              toolName: toolCall.function.name,
              toolOutput: toolResult,
              timestamp: new Date(),
            });
          } catch (error) {
            toolResult = { error: String(error) };
            if (agent.config.useReflection) {
              const correction = await this.reflector.reflectOnError(
                agent,
                messages,
                toolCall,
                error as Error,
              );
              onStep({
                type: "reflection",
                content: correction,
                timestamp: new Date(),
              });
            }
          }

          messages.push({
            role: "assistant",
            content: {
              tool_calls: [toolCall],
            },
          });
          messages.push({
            role: "tool",
            content: JSON.stringify(toolResult),
          });
        }
        continue;
      }

      if (response.content) {
        finalResult = response.content;

        if (agent.config.useReflection) {
          const quality = await this.reflector.assessQuality(task, finalResult, agent);
          if (quality.score < 0.7 && iterations < agent.config.maxIterations - 1) {
            messages.push({ role: "assistant", content: finalResult });
            messages.push({
              role: "user",
              content: `Sua resposta esta incompleta. ${quality.feedback}`,
            });
            finalResult = null;
            continue;
          }
        }

        onStep({
          type: "response",
          content: finalResult,
          timestamp: new Date(),
        });
      }
    }

    const result = finalResult ?? "Task nao completada no limite de iteracoes";
    await memoryEngine.remember({
      agentId: agent.id,
      content: `Task: ${task.prompt}\nResult: ${result}`,
      type: "episodic",
      importance: 0.8,
      tags: ["task", "completed"],
    });

    return {
      success: Boolean(finalResult),
      result,
      steps: messages,
      tokensUsed: this.countTokens(messages),
      duration: Date.now() - startedAt.getTime(),
    };
  }

  private buildAgentTools(agent: Agent): AITool[] {
    const tools: AITool[] = [];

    for (const toolId of agent.enabledTools) {
      const tool = toolExecutor.getTool(toolId);
      if (tool) tools.push(tool.toAIToolFormat());
    }

    if (agent.useMCP) {
      tools.push(...mcpClient.toAITools());
    }

    return tools;
  }

  private buildSystemPrompt(agent: Agent, memories: Memory[], taskPrompt: string): string {
    const relevantSkills = skillRegistry
      .list()
      .filter((skill) => {
        const source = `${skill.name} ${skill.description} ${skill.tags.join(" ")}`.toLowerCase();
        return taskPrompt
          .toLowerCase()
          .split(/\W+/)
          .some((token) => token.length >= 4 && source.includes(token));
      })
      .slice(0, 5);

    const memoryContext = memories.length
      ? `\n## Suas memorias relevantes:\n${memories
          .slice(0, 20)
          .map((item) => `- ${item.content}`)
          .join("\n")}`
      : "";

    const skillContext = relevantSkills.length
      ? `\n## Skills relevantes:\n${relevantSkills.map((skill) => `- ${skill.name}: ${skill.description}`).join("\n")}`
      : "";

    return `${agent.systemPrompt}${memoryContext}${skillContext}

## Data/hora atual: ${new Date().toLocaleString("pt-BR")}
## Iteracao maxima: ${agent.config.maxIterations}

Voce tem acesso a ferramentas poderosas.
Use-as quando necessario.
Sempre pense passo a passo antes de agir.`;
  }

  private buildTaskPrompt(task: AgentTask, plan: TaskPlan | null): string {
    const planSection =
      plan && plan.steps.length
        ? `\n\nPlano inicial:\n${plan.steps.map((item, idx) => `${idx + 1}. ${item.description}`).join("\n")}`
        : "";

    return `${task.prompt}${planSection}`;
  }

  private async callLLMWithTools(
    messages: Array<{ role: string; content: unknown }>,
    tools: AITool[],
  ): Promise<LLMToolResponse> {
    const toolGuide =
      tools.length === 0
        ? ""
        : `\n\nTOOLS DISPONIVEIS (responda em JSON quando chamar):\n${JSON.stringify(
            tools,
            null,
            2,
          )}\n\nSe for chamar tool, responda no formato: {"tool_calls":[{"id":"...","function":{"name":"tool_id","arguments":"{...}"}}],"content":null}`;

    const promptMessages = messages.map((item) => ({
      role: item.role === "tool" ? "assistant" : (item.role as "system" | "user" | "assistant"),
      content:
        typeof item.content === "string"
          ? item.content
          : JSON.stringify(item.content),
    }));

    const completion = await unifiedAIService.complete({
      messages: [
        ...promptMessages.map((item, idx) => ({
          id: `msg-${idx}-${nanoid(4)}`,
          role: item.role,
          content: item.content,
          createdAt: Date.now(),
        })),
        {
          id: `msg-tools-${nanoid(4)}`,
          role: "system",
          content: `Use o contexto para resolver a tarefa.${toolGuide}`,
          createdAt: Date.now(),
        },
      ],
      model: "gpt-4o",
      providerId: "openai",
    });

    return this.reflector.coerceToolResponse(completion);
  }

  private countTokens(messages: Array<{ role: string; content: unknown }>): number {
    const chars = messages
      .map((item) => (typeof item.content === "string" ? item.content.length : JSON.stringify(item.content).length))
      .reduce((sum, item) => sum + item, 0);
    return Math.ceil(chars / 4);
  }
}

function safeJsonParse(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    return {};
  }
}

function toRecord(input: unknown): Record<string, unknown> {
  if (input && typeof input === "object") return input as Record<string, unknown>;
  return {};
}

export const agentRunner = new AgentRunner();
