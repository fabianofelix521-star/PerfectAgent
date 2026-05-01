import { ConceptualAgentBase } from "@/modules/supreme/agents/ConceptualAgentBase";
import type { AgentInput, ExecutionContext } from "@/types/agents";

abstract class CreativeAgentBase extends ConceptualAgentBase {
  protected async runDomainLogic(input: AgentInput, _context: ExecutionContext) {
    return {
      result: {
        style: "high-fidelity",
        prompt: input.prompt,
      },
      reasoning: "Proposta criativa estruturada com foco em narrativa e impacto estetico.",
      confidence: 0.89,
    };
  }
}

export class MasterStorytellertAgent extends CreativeAgentBase {
  constructor() {
    super({
      id: "master-storyteller",
      name: "Master Storyteller & Narrative Architect",
      description: "Arquitetura narrativa, personagens e worldbuilding.",
      supervisorId: "creative",
      tier: "COLD",
      tags: ["story", "narrative", "screenplay", "worldbuilding", "character"],
      confidence: 0.9,
      systemPrompt: "Mestre de narrativa para estruturar enredo, arco e coesao dramatica.",
    });
  }
}

export class MusicComposerAgent extends CreativeAgentBase {
  constructor() {
    super({
      id: "music-composer",
      name: "Music Composer & Theory Expert",
      description: "Composicao musical, teoria e producao sonora.",
      supervisorId: "creative",
      tier: "COLD",
      tags: ["music", "composition", "harmony", "theory", "production"],
      confidence: 0.88,
      systemPrompt: "Compositor para harmonia, forma musical e direcionamento de producao.",
    });
  }
}

export function createCreativeAgents() {
  return [new MasterStorytellertAgent(), new MusicComposerAgent()];
}
