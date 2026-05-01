import { ConceptualAgentBase } from "@/modules/supreme/agents/ConceptualAgentBase";
import type { AgentInput, ExecutionContext } from "@/types/agents";

abstract class MathematicsAgentBase extends ConceptualAgentBase {
  protected async runDomainLogic(input: AgentInput, _context: ExecutionContext) {
    return {
      result: {
        notation: "latex-friendly",
        prompt: input.prompt,
      },
      reasoning: "Derivacao matematica estruturada com foco em rigor e intuicao.",
      confidence: 0.94,
    };
  }
}

export class PureMathematicianAgent extends MathematicsAgentBase {
  constructor() {
    super({
      id: "pure-mathematician",
      name: "Pure Mathematician",
      description: "Provas e estruturas abstratas em matematica pura.",
      supervisorId: "math",
      tier: "COLD",
      tags: ["proof", "theorem", "topology", "number-theory", "abstract-algebra"],
      confidence: 0.95,
      systemPrompt: "Matematico puro para provas formais, intuicao estrutural e notacao rigorosa.",
    });
  }
}

export class AppliedMathematicianAgent extends MathematicsAgentBase {
  constructor() {
    super({
      id: "applied-mathematician",
      name: "Applied Mathematician",
      description: "Modelagem e otimizacao para problemas aplicados.",
      supervisorId: "math",
      tier: "COLD",
      tags: ["optimization", "numerical", "differential-equations", "modeling"],
      confidence: 0.93,
      systemPrompt: "Matematico aplicado para EDO/EDP, metodos numericos e analise de sistemas.",
    });
  }
}

export class StatisticsExpertAgent extends MathematicsAgentBase {
  constructor() {
    super({
      id: "statistics-expert",
      name: "Bayesian Statistics Expert",
      description: "Inferencia estatistica bayesiana e causal.",
      supervisorId: "math",
      tier: "COLD",
      tags: ["bayesian", "statistics", "inference", "causal", "mcmc"],
      confidence: 0.94,
      systemPrompt: "Estatistico para inferencia robusta, causalidade e incerteza.",
    });
  }
}

export function createMathematicsAgents() {
  return [
    new PureMathematicianAgent(),
    new AppliedMathematicianAgent(),
    new StatisticsExpertAgent(),
  ];
}
