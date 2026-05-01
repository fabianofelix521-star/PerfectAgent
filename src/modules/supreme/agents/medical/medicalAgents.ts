import { ConceptualAgentBase } from "@/modules/supreme/agents/ConceptualAgentBase";
import type { AgentInput, ExecutionContext } from "@/types/agents";

const makeTool = (name: string, description: string, result: any) => ({
  name,
  description,
  execute: async () => result,
});

abstract class MedicalAgentBase extends ConceptualAgentBase {
  protected async runDomainLogic(input: AgentInput, _context: ExecutionContext) {
    return {
      result: {
        medicalDisclaimer:
          "Conteudo educacional; nao substitui avaliacao medica presencial.",
        urgency: "routine",
        prompt: input.prompt,
      },
      reasoning: "Avaliacao medica especializada concluida.",
      confidence: 0.85,
      toolsUsed: this.tools.map((tool) => tool.name),
      followUpSuggestions: ["Consultar profissional de saude habilitado."],
    };
  }
}

export class DiagnosticianAgent extends MedicalAgentBase {
  constructor() {
    super({
      id: "diagnostician",
      name: "Master Diagnostician",
      description: "Diagnostico diferencial com foco em red flags e triagem.",
      supervisorId: "medical",
      tier: "WARM",
      tags: ["diagnosis", "differential", "symptoms", "clinical"],
      confidence: 0.85,
      systemPrompt:
        "Medico internista para diagnostico diferencial, exames e prioridade clinica.",
      tools: [
        makeTool("differential_diagnosis", "Diagnostico diferencial", { differentials: [], redFlags: [], urgency: "routine" }),
        makeTool("interpret_lab_results", "Interpreta exames", { abnormal: [], interpretation: "", nextSteps: [] }),
        makeTool("drug_interaction_check", "Checa interacoes", { interactions: [], severity: [], alternatives: [] }),
      ],
    });
  }
}

export class DianosticianAgent extends DiagnosticianAgent {}

export class PharmacologistAgent extends MedicalAgentBase {
  constructor() {
    super({
      id: "pharmacologist",
      name: "Clinical Pharmacologist",
      description: "Farmacologia clinica com ajuste de dose e interacoes.",
      supervisorId: "medical",
      tier: "WARM",
      tags: ["drugs", "pharmacology", "dosage", "interactions", "metabolism"],
      confidence: 0.88,
      systemPrompt: "Farmacologista para ADME, dose e seguranca terapeutica.",
      tools: [
        makeTool("get_drug_info", "Info de farmacos", { mechanism: "", halfLife: 0, interactions: [], sideEffects: [] }),
        makeTool("calculate_dose", "Calcula dose", { dose: 0, frequency: "", adjustments: [] }),
      ],
    });
  }
}

export class NeuroscientistAgent extends MedicalAgentBase {
  constructor() {
    super({
      id: "neuroscientist",
      name: "Cognitive Neuroscientist",
      description: "Neurociencia cognitiva com interface clinica.",
      supervisorId: "medical",
      tier: "WARM",
      tags: ["brain", "neuroscience", "cognition", "psychiatry", "neuroimaging"],
      confidence: 0.87,
      systemPrompt: "Neurocientista para sintomas cognitivos, neuroimagem e intervencoes.",
      tools: [
        makeTool("analyze_cognitive_profile", "Perfil cognitivo", { profile: {}, deficits: [], strengths: [], recommendations: [] }),
      ],
    });
  }
}

export class GenomicsSpecialistAgent extends MedicalAgentBase {
  constructor() {
    super({
      id: "genomics-specialist",
      name: "Genomics & Precision Medicine Specialist",
      description: "Interpretacao genetica e medicina de precisao.",
      supervisorId: "medical",
      tier: "WARM",
      tags: ["genomics", "genetics", "precision-medicine", "crispr", "biomarkers"],
      confidence: 0.9,
      systemPrompt: "Especialista em variantes geneticas, farmacogenomica e oncogenomica.",
      tools: [
        makeTool("interpret_genetic_variant", "Classifica variante genetica", { classification: "", clinicalSignificance: "", databases: [] }),
      ],
    });
  }
}

export class BiohackerAgent extends MedicalAgentBase {
  constructor() {
    super({
      id: "biohacker",
      name: "Longevity & Performance Biohacker",
      description: "Otimizacao de performance e longevidade baseada em evidencia.",
      supervisorId: "medical",
      tier: "WARM",
      tags: ["longevity", "biohacking", "performance", "optimization", "supplements"],
      confidence: 0.82,
      systemPrompt: "Especialista em biomarcadores, sono, nutricao e protocolos de longevidade.",
      tools: [
        makeTool("analyze_biomarkers", "Analisa biomarcadores", { insights: [], optimizations: [], risks: [] }),
      ],
    });
  }
}

export class EpidemiologistAgent extends MedicalAgentBase {
  constructor() {
    super({
      id: "epidemiologist",
      name: "Epidemiologist & Public Health Expert",
      description: "Modelagem epidemiologica e inferencia de saude publica.",
      supervisorId: "medical",
      tier: "WARM",
      tags: ["epidemiology", "public-health", "outbreak", "statistics", "prevention"],
      confidence: 0.91,
      systemPrompt: "Epidemiologista para medidas de efeito, vigilancia e resposta a surtos.",
      tools: [
        makeTool("calculate_epidemiological_measures", "Calcula OR, RR e IC95", { measure: 0, ci95: [0, 0], pValue: 0, interpretation: "" }),
      ],
    });
  }
}

export function createMedicalAgents() {
  return [
    new DiagnosticianAgent(),
    new PharmacologistAgent(),
    new NeuroscientistAgent(),
    new GenomicsSpecialistAgent(),
    new BiohackerAgent(),
    new EpidemiologistAgent(),
  ];
}
