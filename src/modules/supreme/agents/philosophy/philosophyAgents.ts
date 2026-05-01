import { ConceptualAgentBase } from "@/modules/supreme/agents/ConceptualAgentBase";
import type { AgentInput, ExecutionContext } from "@/types/agents";

abstract class PhilosophyAgentBase extends ConceptualAgentBase {
  protected async runDomainLogic(input: AgentInput, _context: ExecutionContext) {
    return {
      result: {
        perspective: "multi-framework",
        prompt: input.prompt,
      },
      reasoning: "Analise filosofica com perspectivas contrastantes e justificadas.",
      confidence: 0.86,
    };
  }
}

export class EthicsPhilosopherAgent extends PhilosophyAgentBase {
  constructor() {
    super({
      id: "ethics-philosopher",
      name: "Applied Ethics Philosopher",
      description: "Etica aplicada para dilemas tecnologicos, sociais e bioeticos.",
      supervisorId: "philosophy",
      tier: "COLD",
      tags: ["ethics", "morality", "ai-ethics", "bioethics", "applied"],
      confidence: 0.88,
      systemPrompt: "Filosofo de etica aplicada com analise consequencialista, deontologica e de virtudes.",
    });
  }
}

export class ConsciousnessExplorerAgent extends PhilosophyAgentBase {
  constructor() {
    super({
      id: "consciousness-explorer",
      name: "Philosophy of Mind & Consciousness Explorer",
      description: "Filosofia da mente, consciencia e identidade pessoal.",
      supervisorId: "philosophy",
      tier: "COLD",
      tags: ["consciousness", "qualia", "hard-problem", "iit", "free-will"],
      confidence: 0.85,
      systemPrompt: "Especialista em consciencia, qualia e teorias da mente com rigor filosofico.",
    });
  }
}

export function createPhilosophyAgents() {
  return [new EthicsPhilosopherAgent(), new ConsciousnessExplorerAgent()];
}
