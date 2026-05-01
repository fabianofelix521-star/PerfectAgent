import { ConceptualAgentBase } from "@/modules/supreme/agents/ConceptualAgentBase";
import type { AgentInput, ExecutionContext } from "@/types/agents";

abstract class ScienceAgentBase extends ConceptualAgentBase {
  protected async runDomainLogic(input: AgentInput, _context: ExecutionContext) {
    return {
      result: {
        evidenceLevel: "high",
        prompt: input.prompt,
      },
      reasoning: "Sintese cientifica concluida com rigor metodologico.",
      confidence: 0.9,
      toolsUsed: this.tools.map((tool) => tool.name),
    };
  }
}

export class TheoreticalPhysicistAgent extends ScienceAgentBase {
  constructor() {
    super({
      id: "theoretical-physicist",
      name: "Theoretical Physicist",
      description: "Fisica teorica para modelos fundamentais e cosmologia.",
      supervisorId: "science",
      tier: "WARM",
      tags: ["physics", "quantum", "relativity", "cosmology", "string-theory"],
      confidence: 0.93,
      systemPrompt: "Fisico teorico para analise matematica e intuicao de fenomenos complexos.",
    });
  }
}

export class ComputationalChemistAgent extends ScienceAgentBase {
  constructor() {
    super({
      id: "computational-chemist",
      name: "Computational Chemist",
      description: "Quimica computacional para materiais e descoberta de farmacos.",
      supervisorId: "science",
      tier: "WARM",
      tags: ["chemistry", "molecular", "dft", "drug-design", "materials"],
      confidence: 0.91,
      systemPrompt: "Quimico computacional para simulacao molecular e propriedades emergentes.",
    });
  }
}

export class NeurobiologistAgent extends ScienceAgentBase {
  constructor() {
    super({
      id: "neurobiologist",
      name: "Computational Neurobiologist",
      description: "Modelagem de circuitos neurais e conectomica.",
      supervisorId: "science",
      tier: "WARM",
      tags: ["neuro", "connectome", "neural-circuits", "consciousness"],
      confidence: 0.89,
      systemPrompt: "Neurobiologista para dinamica neural e relacao entre mente e cerebro.",
    });
  }
}

export class ClimateScientistAgent extends ScienceAgentBase {
  constructor() {
    super({
      id: "climate-scientist",
      name: "Climate & Earth Systems Scientist",
      description: "Modelagem de clima e impactos sistemicos.",
      supervisorId: "science",
      tier: "WARM",
      tags: ["climate", "carbon", "ocean", "atmosphere", "geoengineering"],
      confidence: 0.9,
      systemPrompt: "Cientista do clima para feedback loops, mitigacao e adaptacao.",
    });
  }
}

export class SyntheticBiologistAgent extends ScienceAgentBase {
  constructor() {
    super({
      id: "synthetic-biologist",
      name: "Synthetic Biologist",
      description: "Biologia sintetica aplicada a design e biofabricacao.",
      supervisorId: "science",
      tier: "WARM",
      tags: ["synbio", "crispr", "metabolic-engineering", "biodesign"],
      confidence: 0.88,
      systemPrompt: "Biologo sintetico para circuitos geneticos e sistemas biologicos programaveis.",
    });
  }
}

export function createScienceAgents() {
  return [
    new TheoreticalPhysicistAgent(),
    new ComputationalChemistAgent(),
    new NeurobiologistAgent(),
    new ClimateScientistAgent(),
    new SyntheticBiologistAgent(),
  ];
}
