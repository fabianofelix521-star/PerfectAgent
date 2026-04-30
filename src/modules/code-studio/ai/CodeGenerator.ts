/**
 * CodeGenerator — calls an LLM with streaming and yields text deltas.
 *
 * Currently supports Anthropic and OpenAI-compatible HTTP APIs. The
 * `custom` provider expects an OpenAI-compatible `/v1/chat/completions`
 * endpoint at `baseUrl`.
 */
import { CODE_AI_SYSTEM_PROMPT } from "./PromptTemplates";

export interface GeneratorConfig {
  provider: "anthropic" | "openai" | "custom";
  model: string;
  apiKey: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface GenerateOptions {
  systemPrompt?: string;
  abortSignal?: AbortSignal;
}

type Message = { role: string; content: string };

export class CodeGenerator {
  private config: GeneratorConfig | null = null;

  configure(config: GeneratorConfig): void {
    this.config = { ...config };
  }

  isConfigured(): boolean {
    return this.config !== null && Boolean(this.config.apiKey);
  }

  getConfig(): GeneratorConfig | null {
    return this.config ? { ...this.config } : null;
  }

  async *generate(
    messages: Message[],
    options: GenerateOptions = {},
  ): AsyncIterable<string> {
    const config = this.requireConfig();
    if (config.provider === "anthropic") {
      yield* this.generateAnthropic(messages, options);
    } else {
      yield* this.generateOpenAI(messages, options);
    }
  }

  async generateComplete(
    messages: Message[],
    options: GenerateOptions = {},
  ): Promise<string> {
    let acc = "";
    for await (const chunk of this.generate(messages, options)) acc += chunk;
    return acc;
  }

  // -----------------------------------------------------------------------
  // Anthropic Messages API (streaming)
  // -----------------------------------------------------------------------

  private async *generateAnthropic(
    messages: Message[],
    options: GenerateOptions,
  ): AsyncIterable<string> {
    const config = this.requireConfig();
    const systemPrompt = options.systemPrompt ?? CODE_AI_SYSTEM_PROMPT;
    const url = `${config.baseUrl ?? "https://api.anthropic.com"}/v1/messages`;

    const body = {
      model: config.model,
      max_tokens: config.maxTokens ?? 8_192,
      temperature: config.temperature ?? 0.2,
      system: systemPrompt,
      stream: true,
      messages: messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role, content: m.content })),
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(body),
      signal: options.abortSignal,
    });

    if (!response.ok || !response.body) {
      const text = await response.text().catch(() => "");
      throw new Error(`Anthropic request failed (${response.status}): ${text}`);
    }

    for await (const event of this.iterateSSE(
      response.body,
      options.abortSignal,
    )) {
      if (event.event === "content_block_delta") {
        const data = this.safeParse<{
          delta?: { type?: string; text?: string };
        }>(event.data);
        const text =
          data?.delta?.type === "text_delta" ? data.delta.text : undefined;
        if (text) yield text;
      } else if (event.event === "message_stop") {
        return;
      } else if (event.event === "error") {
        throw new Error(`Anthropic stream error: ${event.data}`);
      }
    }
  }

  // -----------------------------------------------------------------------
  // OpenAI-compatible chat completions (streaming)
  // -----------------------------------------------------------------------

  private async *generateOpenAI(
    messages: Message[],
    options: GenerateOptions,
  ): AsyncIterable<string> {
    const config = this.requireConfig();
    const systemPrompt = options.systemPrompt ?? CODE_AI_SYSTEM_PROMPT;
    const url = `${config.baseUrl ?? "https://api.openai.com"}/v1/chat/completions`;

    const body = {
      model: config.model,
      max_tokens: config.maxTokens,
      temperature: config.temperature ?? 0.2,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.filter((m) => m.role !== "system"),
      ],
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: options.abortSignal,
    });

    if (!response.ok || !response.body) {
      const text = await response.text().catch(() => "");
      throw new Error(`LLM request failed (${response.status}): ${text}`);
    }

    for await (const event of this.iterateSSE(
      response.body,
      options.abortSignal,
    )) {
      const data = event.data;
      if (!data || data === "[DONE]") {
        if (data === "[DONE]") return;
        continue;
      }
      const parsed = this.safeParse<{
        choices?: Array<{ delta?: { content?: string } }>;
      }>(data);
      const text = parsed?.choices?.[0]?.delta?.content;
      if (text) yield text;
    }
  }

  // -----------------------------------------------------------------------
  // SSE helpers
  // -----------------------------------------------------------------------

  private async *iterateSSE(
    body: ReadableStream<Uint8Array>,
    signal?: AbortSignal,
  ): AsyncIterable<{ event: string; data: string }> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let sepIndex: number;
        while ((sepIndex = buffer.indexOf("\n\n")) >= 0) {
          const raw = buffer.slice(0, sepIndex);
          buffer = buffer.slice(sepIndex + 2);
          const event = this.parseSSEBlock(raw);
          if (event) yield event;
        }
      }
    } finally {
      try {
        reader.releaseLock();
      } catch {
        /* noop */
      }
    }
  }

  private parseSSEBlock(block: string): { event: string; data: string } | null {
    let event = "message";
    const dataLines: string[] = [];
    for (const line of block.split("\n")) {
      if (!line || line.startsWith(":")) continue;
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:"))
        dataLines.push(line.slice(5).trimStart());
    }
    if (dataLines.length === 0) return null;
    return { event, data: dataLines.join("\n") };
  }

  private safeParse<T>(raw: string): T | null {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  private requireConfig(): GeneratorConfig {
    if (!this.config)
      throw new Error(
        "CodeGenerator is not configured. Call configure() first.",
      );
    if (!this.config.apiKey) throw new Error("CodeGenerator missing apiKey.");
    return this.config;
  }
}

export const codeGenerator = new CodeGenerator();
