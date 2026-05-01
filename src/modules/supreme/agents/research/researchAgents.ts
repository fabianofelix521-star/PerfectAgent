import { ConceptualAgentBase } from "@/modules/supreme/agents/ConceptualAgentBase";
import type { AgentInput, ExecutionContext } from "@/types/agents";

export class SystematicReviewerAgent extends ConceptualAgentBase {
  constructor() {
    super({
      id: "systematic-reviewer",
      name: "Systematic Review Specialist",
      description: "Revisao sistematica e meta-analise com rigor PRISMA.",
      supervisorId: "research",
      tier: "COLD",
      tags: ["systematic-review", "meta-analysis", "evidence", "prisma", "cochrane"],
      confidence: 0.92,
      systemPrompt: "Especialista em pesquisa estruturada para sintese de evidencia e qualidade metodologica.",
    });
  }

  protected async runDomainLogic(input: AgentInput, _context: ExecutionContext) {
    return {
      result: {
        methodology: "PRISMA + GRADE",
        prompt: input.prompt,
      },
      reasoning: "Plano de revisao sistematica estruturado com criterios PICO e avaliacao de vies.",
      confidence: 0.92,
    };
  }
}

export function createResearchAgents() {
  return [new SystematicReviewerAgent()];
}
