import { ConceptualAgentBase } from "@/modules/supreme/agents/ConceptualAgentBase";
import type { AgentInput, ExecutionContext } from "@/types/agents";

abstract class LegalAgentBase extends ConceptualAgentBase {
  protected async runDomainLogic(input: AgentInput, _context: ExecutionContext) {
    return {
      result: {
        legalDisclaimer: "Nao substitui assessoria juridica formal.",
        prompt: input.prompt,
      },
      reasoning: "Analise regulatoria e juridica estruturada concluida.",
      confidence: 0.88,
    };
  }
}

export class ContractLawyerAgent extends LegalAgentBase {
  constructor() {
    super({
      id: "contract-lawyer",
      name: "Contract Law Specialist",
      description: "Revisao de contratos e negociacao de clausulas criticas.",
      supervisorId: "legal",
      tier: "WARM",
      tags: ["contract", "negotiation", "drafting", "dispute", "commercial"],
      confidence: 0.87,
      systemPrompt: "Especialista em contratos comerciais, risco e compliance contratual.",
    });
  }
}

export class IPLawyerAgent extends LegalAgentBase {
  constructor() {
    super({
      id: "ip-lawyer",
      name: "Intellectual Property Lawyer",
      description: "Patentes, marcas, direitos autorais e licenciamento.",
      supervisorId: "legal",
      tier: "WARM",
      tags: ["patent", "trademark", "copyright", "trade-secret", "ip"],
      confidence: 0.88,
      systemPrompt: "Especialista em propriedade intelectual para estrategia e mitigacao de risco.",
    });
  }
}

export class RegulatoryExpertAgent extends LegalAgentBase {
  constructor() {
    super({
      id: "regulatory-expert",
      name: "Regulatory Compliance Expert",
      description: "Compliance setorial e leitura de obrigacoes regulatórias.",
      supervisorId: "legal",
      tier: "WARM",
      tags: ["compliance", "gdpr", "fintech", "fda", "regulation"],
      confidence: 0.9,
      systemPrompt: "Especialista em compliance para LGPD/GDPR, AML/KYC e regulacao de IA.",
    });
  }
}

export function createLegalAgents() {
  return [
    new ContractLawyerAgent(),
    new IPLawyerAgent(),
    new RegulatoryExpertAgent(),
  ];
}
