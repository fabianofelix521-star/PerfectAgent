import { PersistentCognitiveMemory } from "@/runtimes/shared/cognitiveCore";
import type { AgentDecision, IAgent } from "@/runtimes/_nextgen/RuntimeTypes";

interface BaseCognitiveAgentOptions {
  persistNamespace?: string;
}

export abstract class BaseCognitiveAgent<
  TInput,
  TPerception,
  TContext = TPerception,
  TDecision extends AgentDecision = AgentDecision,
  TResult = unknown,
> implements IAgent<TInput, TPerception, TContext, TDecision, TResult>
{
  readonly id: string;
  readonly name: string;
  readonly domain: string;

  protected readonly memory: unknown[] = [];
  private readonly persistentMemory: PersistentCognitiveMemory<{ feedback: unknown[] }>;

  constructor(id: string, name: string, domain: string, options: BaseCognitiveAgentOptions = {}) {
    this.id = id;
    this.name = name;
    this.domain = domain;
    this.persistentMemory = new PersistentCognitiveMemory(
      options.persistNamespace ?? `nextgen:agent:${id}`,
      () => ({ feedback: [] }),
    );
    const persisted = this.persistentMemory.load().state.feedback;
    if (persisted.length) this.memory.push(...persisted.slice(-64));
  }

  abstract perceive(input: TInput): Promise<TPerception>;

  abstract reason(context: TContext): Promise<TDecision>;

  abstract act(decision: TDecision): Promise<TResult>;

  async learn(feedback: unknown): Promise<void> {
    this.memory.push(feedback);
    if (this.memory.length > 64) this.memory.splice(0, this.memory.length - 64);
    this.persistentMemory.update(() => ({ feedback: [...this.memory] }));
  }

  async run(input: TInput, mapContext?: (perception: TPerception) => TContext): Promise<TResult> {
    await this.persistentMemory.hydrate();
    const hydrated = this.persistentMemory.load().state.feedback;
    if (hydrated.length) {
      this.memory.splice(0, this.memory.length, ...hydrated.slice(-64));
    }

    const perception = await this.perceive(input);
    const context = mapContext ? mapContext(perception) : (perception as TContext);
    const decision = await this.reason(context);
    const result = await this.act(decision);
    await this.learn({ input, perception, decision, result, at: Date.now() });
    return result;
  }

  protected clampConfidence(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(1, value));
  }
}