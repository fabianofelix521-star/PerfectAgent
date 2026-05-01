import { ShortTermMemory } from "@/core/ai/memory/ShortTermMemory";
import { LongTermMemory } from "@/core/ai/memory/LongTermMemory";
import { EpisodicMemory } from "@/core/ai/memory/EpisodicMemory";
import { SemanticMemory } from "@/core/ai/memory/SemanticMemory";
import { ProceduralMemory } from "@/core/ai/memory/ProceduralMemory";
import { MemorySearch } from "@/core/ai/memory/MemorySearch";
import type {
  Memory,
  MemoryClassification,
  MemoryContextMessage,
  MemoryInput,
  RecallOptions,
} from "@/core/ai/memory/types";

/**
 * Cognitive memory engine with short/long/episodic/semantic/procedural layers.
 */
export class MemoryEngine {
  private shortTerm = new ShortTermMemory();
  private longTerm = new LongTermMemory();
  private episodic = new EpisodicMemory();
  private semantic = new SemanticMemory();
  private procedural = new ProceduralMemory();
  private search = new MemorySearch();

  async initialize(agentId: string): Promise<void> {
    await Promise.all([
      this.shortTerm.init(agentId),
      this.longTerm.init(agentId),
      this.episodic.init(agentId),
      this.semantic.init(agentId),
      this.procedural.init(agentId),
    ]);
  }

  async remember(input: MemoryInput): Promise<void> {
    const classified = await this.classify(input);

    const tasks: Array<Promise<void>> = [];
    if (classified.isShortTerm) tasks.push(this.shortTerm.add(input));
    if (classified.isFactual) tasks.push(this.longTerm.store(input));
    if (classified.isEpisodic) tasks.push(this.episodic.record(input));
    if (classified.isEntity) tasks.push(this.semantic.addEntity(input));
    if (classified.isSkill) tasks.push(this.procedural.learnSkill(input));

    await Promise.all(tasks);
  }

  async recall(query: string, options: RecallOptions = {}): Promise<Memory[]> {
    const [
      shortTermMemories,
      longTermMemories,
      episodicMemories,
      semanticMemories,
      proceduralMemories,
    ] = await Promise.all([
      this.shortTerm.getRecent(options.shortTermLimit ?? 20),
      this.longTerm.search(query, options.longTermLimit ?? 10),
      this.episodic.searchRelevant(query, options.episodicLimit ?? 5),
      this.semantic.getRelated(query, options.semanticLimit ?? 5),
      this.procedural.findRelevantSkills(query),
    ]);

    return this.rankAndMerge(
      [
        ...shortTermMemories,
        ...longTermMemories,
        ...episodicMemories,
        ...semanticMemories,
        ...proceduralMemories,
      ],
      query,
    );
  }

  async consolidate(): Promise<void> {
    const recent = await this.shortTerm.getRecent(50);
    const important = recent.filter((item) => (item.importance ?? 0) >= 0.65);
    await Promise.all(
      important.map((item) =>
        this.longTerm.store({
          agentId: "consolidated",
          content: item.content,
          type: item.type,
          importance: item.importance,
          tags: item.tags,
          metadata: item.metadata,
        }),
      ),
    );
  }

  async buildContextWithMemory(
    query: string,
    baseMessages: MemoryContextMessage[],
  ): Promise<MemoryContextMessage[]> {
    const memories = await this.recall(query, {
      longTermLimit: 8,
      episodicLimit: 3,
      semanticLimit: 4,
      proceduralLimit: 4,
    });

    if (memories.length === 0) return baseMessages;

    const memoryContext = this.formatMemoriesAsContext(memories.slice(0, 20));

    return [
      {
        role: "system",
        content: `## Memorias Relevantes\n${memoryContext}`,
      },
      ...baseMessages,
    ];
  }

  private async classify(input: MemoryInput): Promise<MemoryClassification> {
    const content = input.content.toLowerCase();
    const tags = (input.tags ?? []).join(" ").toLowerCase();

    return {
      isShortTerm: true,
      isFactual: /fact|remember|knowledge|reference|doc|spec|api/.test(content),
      isEpisodic: /task|result|error|incident|run|attempt/.test(content),
      isEntity: /user|project|repo|agent|model|provider|integration/.test(
        `${content} ${tags}`,
      ),
      isSkill: /how to|steps|recipe|workflow|playbook|skill/.test(
        `${content} ${tags}`,
      ),
    };
  }

  private rankAndMerge(memories: Memory[], query: string): Memory[] {
    return this.search.rankAndMerge(memories, query);
  }

  private formatMemoriesAsContext(memories: Memory[]): string {
    return memories
      .map((item, idx) => {
        const tags = item.tags?.length ? ` [tags: ${item.tags.join(", ")}]` : "";
        return `${idx + 1}. (${item.kind}/${item.type}) ${item.content}${tags}`;
      })
      .join("\n");
  }
}

export const memoryEngine = new MemoryEngine();
