import type { BaseAgent } from "@/types/agents";
import { createFinancialAgents } from "@/modules/supreme/agents/financial/financialAgents";
import { createSecurityAgents } from "@/modules/supreme/agents/security/securityAgents";
import { createMedicalAgents } from "@/modules/supreme/agents/medical/medicalAgents";
import { createEngineeringAgents } from "@/modules/supreme/agents/engineering/engineeringAgents";
import { createScienceAgents } from "@/modules/supreme/agents/science/scienceAgents";
import { createLegalAgents } from "@/modules/supreme/agents/legal/legalAgents";
import { createResearchAgents } from "@/modules/supreme/agents/research/researchAgents";
import { createPhilosophyAgents } from "@/modules/supreme/agents/philosophy/philosophyAgents";
import { createCreativeAgents } from "@/modules/supreme/agents/creative/creativeAgents";
import { createAncientKnowledgeAgents } from "@/modules/supreme/agents/ancient-knowledge/ancientKnowledgeAgents";
import { createMathematicsAgents } from "@/modules/supreme/agents/mathematics/mathematicsAgents";
import { createMetaAgents } from "@/modules/supreme/agents/meta/metaAgents";

export const SUPERVISOR_AGENTS: Record<string, string[]> = {
  "financial-supervisor": [
    "jito-bundle-sniper",
    "whale-copycat-tracker",
    "funding-rate-harvester",
    "rug-pull-predictor",
    "onchain-intelligence",
    "macro-economist",
    "sentiment-oracle",
    "portfolio-optimizer",
  ],
  "security-supervisor": [
    "vulnerability-hunter",
    "malware-analyst",
    "cryptography-expert",
    "incident-responder",
    "smart-contract-auditor",
    "osint-investigator",
  ],
  "medical-supervisor": [
    "diagnostician",
    "pharmacologist",
    "neuroscientist",
    "genomics-specialist",
    "biohacker",
    "epidemiologist",
  ],
  "engineering-supervisor": [
    "system-architect",
    "ml-engineer",
    "devops-maestro",
    "quantum-engineer",
    "hardware-hacker",
    "robotics-engineer",
  ],
  "science-supervisor": [
    "theoretical-physicist",
    "computational-chemist",
    "neurobiologist",
    "climate-scientist",
    "synthetic-biologist",
  ],
  "legal-supervisor": [
    "contract-lawyer",
    "ip-lawyer",
    "regulatory-expert",
  ],
  "research-supervisor": ["systematic-reviewer"],
  "philosophy-supervisor": ["ethics-philosopher", "consciousness-explorer"],
  "creative-supervisor": ["master-storyteller", "music-composer"],
  "ancient-knowledge-supervisor": [
    "ancient-text-scholar",
    "esoteric-knowledge",
  ],
  "mathematics-supervisor": [
    "pure-mathematician",
    "applied-mathematician",
    "statistics-expert",
  ],
  "meta-supervisor": [
    "self-improving-optimizer",
    "emergent-behavior-detector",
    "adversarial-thinker",
    "synthesis-architect",
    "superintelligence-simulator",
  ],
};

export interface SupremeCoordinatorLike {
  registerAgent(agent: BaseAgent): void;
}

export function buildAllConceptualAgents(): BaseAgent[] {
  return [
    ...createFinancialAgents(),
    ...createSecurityAgents(),
    ...createMedicalAgents(),
    ...createEngineeringAgents(),
    ...createScienceAgents(),
    ...createLegalAgents(),
    ...createResearchAgents(),
    ...createPhilosophyAgents(),
    ...createCreativeAgents(),
    ...createAncientKnowledgeAgents(),
    ...createMathematicsAgents(),
    ...createMetaAgents(),
  ];
}

export function registerAllAgents(coordinator: SupremeCoordinatorLike): void {
  for (const agent of buildAllConceptualAgents()) {
    coordinator.registerAgent(agent);
  }
}
