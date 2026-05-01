import { api } from "@/services/api";
import type { AIProvider, AIProviderRequest, StreamChunk } from "@/core/ai/providers/types";

export abstract class BaseProvider implements AIProvider {
  abstract readonly id: AIProvider["id"];
  abstract readonly label: string;

  supportsModel(_model: string): boolean {
    return true;
  }

  async *stream(request: AIProviderRequest): AsyncIterable<StreamChunk> {
    const queue: StreamChunk[] = [];
    let done = false;
    let failure: Error | null = null;
    let wake: (() => void) | null = null;

    const notify = () => {
      wake?.();
      wake = null;
    };

    const stop = api.streamChat({
      spec: request.spec,
      model: request.model,
      messages: request.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: request.temperature,
      onToken: (delta) => {
        queue.push({ delta });
        notify();
      },
      onDone: () => {
        done = true;
        notify();
      },
      onError: (err) => {
        failure = new Error(err);
        done = true;
        notify();
      },
    });

    request.signal?.addEventListener(
      "abort",
      () => {
        stop();
        done = true;
        notify();
      },
      { once: true },
    );

    while (!done || queue.length > 0) {
      const next = queue.shift();
      if (next) {
        yield next;
        continue;
      }
      if (failure) throw failure;
      await new Promise<void>((resolve) => {
        wake = resolve;
      });
    }

    if (failure) throw failure;
  }

  async complete(request: AIProviderRequest): Promise<string> {
    let output = "";
    for await (const chunk of this.stream(request)) output += chunk.delta;
    return output;
  }
}
