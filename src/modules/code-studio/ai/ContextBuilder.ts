/**
 * ContextBuilder — assembles the messages array sent to the LLM,
 * trimming the project file context to fit the token budget.
 */
import { CODE_AI_SYSTEM_PROMPT, buildUserPrompt } from "./PromptTemplates";
import type { AIMessage, Project } from "../types";

export interface BuildContextOptions {
  userMessage: string;
  project: Project;
  conversationHistory: AIMessage[];
  errors?: string[];
  maxTokens?: number;
  prioritizeFiles?: string[];
}

export interface BuiltContext {
  systemPrompt: string;
  messages: Array<{ role: string; content: string }>;
  estimatedTokens: number;
  includedFiles: string[];
  excludedFiles: string[];
}

const DEFAULT_MAX_TOKENS = 100_000;
const PER_FILE_CHAR_CAP = 50_000;

export class ContextBuilder {
  async build(options: BuildContextOptions): Promise<BuiltContext> {
    const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
    const allFiles = Object.entries(options.project.files).map(
      ([path, content]) => ({
        path,
        content,
      }),
    );

    const { selected, excluded } = this.selectRelevantFiles(
      allFiles,
      options.userMessage,
      Math.floor(maxTokens * 0.6),
      options.prioritizeFiles,
    );

    const trimmedHistory = this.truncateHistory(
      options.conversationHistory,
      Math.floor(maxTokens * 0.2),
    );

    const userPrompt = buildUserPrompt({
      userMessage: options.userMessage,
      contextFiles: selected,
      errors: options.errors,
      conversationHistory: trimmedHistory,
    });

    const messages: Array<{ role: string; content: string }> = [];
    for (const msg of trimmedHistory) {
      if (msg.role === "system") continue;
      messages.push({ role: msg.role, content: msg.content });
    }
    messages.push({ role: "user", content: userPrompt });

    const estimatedTokens =
      this.estimateTokens(CODE_AI_SYSTEM_PROMPT) +
      messages.reduce((sum, m) => sum + this.estimateTokens(m.content), 0);

    return {
      systemPrompt: CODE_AI_SYSTEM_PROMPT,
      messages,
      estimatedTokens,
      includedFiles: selected.map((f) => f.path),
      excludedFiles: excluded,
    };
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private selectRelevantFiles(
    allFiles: Array<{ path: string; content: string }>,
    userMessage: string,
    maxTokens: number,
    prioritize?: string[],
  ): {
    selected: Array<{ path: string; content: string }>;
    excluded: string[];
  } {
    const trimmed = allFiles.map((f) => ({
      path: f.path,
      content:
        f.content.length > PER_FILE_CHAR_CAP
          ? `${f.content.slice(0, PER_FILE_CHAR_CAP)}\n/* …truncated… */`
          : f.content,
    }));

    const prioritizeSet = new Set(prioritize ?? []);
    const scored = trimmed
      .map((file) => ({
        file,
        score:
          (prioritizeSet.has(file.path) ? 1_000 : 0) +
          this.relevanceScore(file.path, file.content, userMessage),
      }))
      .sort((a, b) => b.score - a.score);

    const selected: Array<{ path: string; content: string }> = [];
    const excluded: string[] = [];
    let usedTokens = 0;

    for (const { file } of scored) {
      const cost =
        this.estimateTokens(file.content) + this.estimateTokens(file.path);
      if (usedTokens + cost <= maxTokens) {
        selected.push(file);
        usedTokens += cost;
      } else {
        excluded.push(file.path);
      }
    }

    return { selected, excluded };
  }

  private relevanceScore(
    path: string,
    content: string,
    prompt: string,
  ): number {
    let score = 0;
    const lowerPrompt = prompt.toLowerCase();
    const lowerPath = path.toLowerCase();

    // Always-important files.
    if (/package\.json$/.test(path)) score += 200;
    if (/(vite|tailwind|tsconfig|postcss)\.config/.test(path)) score += 80;
    if (/^src\/(main|index|app)\.(t|j)sx?$/i.test(path)) score += 100;

    // Path tokens hinted by the prompt.
    for (const token of lowerPrompt
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 3)) {
      if (lowerPath.includes(token)) score += 20;
      if (content.toLowerCase().includes(token)) score += 1;
    }

    // Smaller files are cheaper, give a tiny bias.
    score += Math.max(0, 20 - Math.floor(content.length / 1_000));
    return score;
  }

  private truncateHistory(
    history: AIMessage[],
    maxTokens: number,
  ): AIMessage[] {
    const out: AIMessage[] = [];
    let used = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      const msg = history[i];
      const cost = this.estimateTokens(msg.content);
      if (used + cost > maxTokens) break;
      used += cost;
      out.unshift(msg);
    }
    return out;
  }
}

export const contextBuilder = new ContextBuilder();
