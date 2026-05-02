import {
  ClinicalTrialAnalystAgent,
  CompoundScannerAgent,
  DiseaseDeconstructorAgent,
  DosageOptimizerAgent,
  GenomicProfilerAgent,
  ImmunoModulationAgent,
  MetabolicNetworkAgent,
  ProtocolSynthesizerAgent,
  RepurposingHunterAgent,
  SafetyGuardianAgent,
  SynergySimulatorAgent,
  TargetIdentifierAgent,
} from "@/runtimes/hippocrates-supreme/agents/HippocratesAgents";
import { createExecutionContext } from "@/runtimes/shared/runtimeAgentScaffold";
import type { SupremeRuntimeResponse } from "@/runtimes/shared/supremeRuntime";
import type { AgentInput, AgentOutput, BaseAgent, ExecutionContext } from "@/types/agents";

export class HippocratesSupremeRuntime {
  readonly systemPrompt = `
HIPPOCRATES SUPREME — Cure Discovery Swarm.

ARQUITETURA:
CAMADA 1: raciocínio interno completo sobre mecanismos, alvos, compostos, sinergias, dosagens, repurposing, metabolismo, imunologia, trials e genômica.
CAMADA 2: SafetyGuardian executa depois do raciocínio; adiciona contexto de segurança sem remover informação.
CAMADA 3: ProtocolSynthesizer produz protocolo completo com disclaimer no envelope final.
  `.trim();

  private readonly agents = new Map<string, BaseAgent>([
    ["disease-deconstructor", new DiseaseDeconstructorAgent()],
    ["target-identifier", new TargetIdentifierAgent()],
    ["compound-scanner", new CompoundScannerAgent()],
    ["synergy-simulator", new SynergySimulatorAgent()],
    ["dosage-optimizer", new DosageOptimizerAgent()],
    ["safety-guardian", new SafetyGuardianAgent()],
    ["repurposing-hunter", new RepurposingHunterAgent()],
    ["metabolic-network", new MetabolicNetworkAgent()],
    ["immuno-modulation", new ImmunoModulationAgent()],
    ["clinical-trial-analyst", new ClinicalTrialAnalystAgent()],
    ["genomic-profiler", new GenomicProfilerAgent()],
    ["protocol-synthesizer", new ProtocolSynthesizerAgent()],
  ]);

  getAgentIds(): string[] {
    return [...this.agents.keys()];
  }

  async process(query: string, ctx = createExecutionContext(`hippocrates:${query}`)): Promise<AgentOutput> {
    const startedAt = Date.now();

    // FASE 1: Desconstrução molecular (paralelo).
    const [diseaseMap, targets] = await Promise.all([
      this.run("disease-deconstructor", query, ctx, "1"),
      this.run("target-identifier", query, ctx, "2"),
    ]);

    // FASE 2: Scan de compostos e sistemas complementares (paralelo).
    const [compounds, repurposing, metabolic, immunology] = await Promise.all([
      this.run(
        "compound-scanner",
        JSON.stringify({
          query,
          diseaseMap: diseaseMap.result,
          targets: targets.result,
        }),
        ctx,
        "3",
      ),
      this.run(
        "repurposing-hunter",
        JSON.stringify({
          query,
          diseaseMap: diseaseMap.result,
          targets: targets.result,
        }),
        ctx,
        "4",
      ),
      this.run("metabolic-network", JSON.stringify({ query, disease: diseaseMap.result }), ctx, "5"),
      this.run("immuno-modulation", query, ctx, "6"),
    ]);

    // FASE 3: Sinergias, dosagem, trials e genômica (paralelo).
    const [synergies, dosages, trials, genomics] = await Promise.all([
      this.run(
        "synergy-simulator",
        JSON.stringify({ query, compounds: compounds.result, repurposing: repurposing.result }),
        ctx,
        "7",
      ),
      this.run(
        "dosage-optimizer",
        JSON.stringify({ query, compounds: compounds.result, synergies: {} }),
        ctx,
        "8",
      ),
      this.run("clinical-trial-analyst", query, ctx, "9"),
      this.run("genomic-profiler", query, ctx, "10"),
    ]);

    // FASE 4: Safety check DEPOIS de todo raciocínio. Não filtra; enriquece.
    const safety = await this.run(
      "safety-guardian",
      JSON.stringify({
        query,
        compounds: compounds.result,
        repurposing: repurposing.result,
        synergies: synergies.result,
        dosages: dosages.result,
      }),
      ctx,
      "11",
    );

    // FASE 5: Síntese final do protocolo completo com disclaimer no envelope.
    const protocol = await this.run(
      "protocol-synthesizer",
      JSON.stringify({
        query,
        diseaseMap: diseaseMap.result,
        targets: targets.result,
        compounds: compounds.result,
        repurposing: repurposing.result,
        metabolic: metabolic.result,
        immunology: immunology.result,
        synergies: synergies.result,
        dosages: dosages.result,
        safety: safety.result,
        trials: trials.result,
        genomics: genomics.result,
      }),
      ctx,
      "12",
    );

    const phaseOutputs = [
      diseaseMap,
      targets,
      compounds,
      repurposing,
      metabolic,
      immunology,
      synergies,
      dosages,
      trials,
      genomics,
      safety,
      protocol,
    ];

    return {
      ...protocol,
      latencyMs: Date.now() - startedAt,
      result: {
        ...protocol.result,
        phases: {
          molecularDeconstruction: { diseaseMap, targets },
          compoundScan: { compounds, repurposing, metabolic, immunology },
          synergyDosageEvidence: { synergies, dosages, trials, genomics },
          safety,
          protocol,
        },
        agents: phaseOutputs.map((output) => ({
          agentId: output.agentId,
          confidence: output.confidence,
          latencyMs: output.latencyMs,
        })),
      },
      toolsUsed: phaseOutputs.flatMap((output) => output.toolsUsed ?? []),
      reasoning:
        "Hippocrates Supreme executou 5 fases: raciocínio molecular completo, scan de compostos, sinergias/dosagem/evidência, safety pós-raciocínio e síntese final.",
    };
  }

  async buildContext(query: string): Promise<{
    label: string;
    context: string;
    confidence: number;
    evidence: string[];
    response: SupremeRuntimeResponse;
  }> {
    const output = await this.process(query);
    const result = output.result as {
      protocol?: { title?: string; disclaimer?: string };
      agents?: Array<{ agentId: string; confidence: number }>;
      phases?: Record<string, unknown>;
    };
    const evidence = [
      "molecular deconstruction",
      "target identification",
      "compound scan",
      "synergy matrix",
      "dosage optimizer",
      "post-raciocínio safety report",
      "clinical evidence scan",
      "genomic profile",
    ];
    const response: SupremeRuntimeResponse = {
      runtimeId: "hippocrates-supreme",
      runtimeName: "Hippocrates Supreme",
      domain: "Precision medicine and mechanism-of-action cure discovery",
      query,
      confidence: output.confidence,
      evidence,
      actions: [
        "Mapear mecanismos moleculares completos",
        "Identificar alvos e compostos candidatos",
        "Simular sinergias e dosagens",
        "Adicionar safety report pós-raciocínio",
        "Sintetizar protocolo final com disclaimer no envelope",
      ],
      risks: ["CYP interactions", "organ toxicity", "QT/cardiac risk", "renal/hepatic adjustment", "evidence gaps"],
      generatedAt: new Date().toISOString(),
      agents: (result.agents ?? []).map((agent) => ({
        agentId: agent.agentId,
        agentName: agent.agentId,
        focus: [agent.agentId],
        findings: [`${agent.agentId} completed`],
        evidence: [],
        actions: [],
        risks: [],
        toolResult: {},
      })),
      synthesis: {
        summary: `${result.protocol?.title ?? "PROTOCOLO HIPPOCRATES SUPREME"} gerado para "${query}" com ${this.agents.size} agentes e confidence ${(output.confidence * 100).toFixed(0)}%.`,
        agentContributions: (result.agents ?? []).map((agent) => `${agent.agentId}: ${(agent.confidence * 100).toFixed(0)}%`),
        priorityActions: [
          "Aplicar protocolo como hipótese de pesquisa clínica",
          "Revisar safety report sem remover informação mecanística",
          "Usar biomarcadores para medir resposta e toxicidade",
        ],
        evidenceMap: evidence,
        riskControls: ["SafetyGuardian output", "monitoramento", "supervisão clínica no envelope final"],
        implementationPlan: ["Fase 1", "Fase 2", "Fase 3", "Fase 4", "Fase 5"],
        openQuestions: ["Quais dados ômicos estão disponíveis?", "Quais medicações concomitantes existem?", "Quais endpoints medem resposta?"],
        disclaimer: result.protocol?.disclaimer,
      },
    };
    return {
      label: "Hippocrates Supreme cure-discovery swarm",
      confidence: output.confidence,
      evidence,
      response,
      context: [
        "HIPPOCRATES SUPREME ACTIVE",
        this.systemPrompt,
        response.synthesis.summary,
        `Agents: ${this.getAgentIds().join(", ")}`,
        `Safety position: post-raciocínio contextualization, not pre-raciocínio filtering.`,
        response.synthesis.disclaimer ? `Disclaimer: ${response.synthesis.disclaimer}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    };
  }

  private async run(
    agentId: string,
    prompt: string,
    ctx: ExecutionContext,
    phaseId: string,
  ): Promise<AgentOutput> {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Hippocrates agent not registered: ${agentId}`);
    const input: AgentInput = {
      prompt,
      sessionId: ctx.sessionId,
      requestId: `hippocrates-${phaseId}-${Date.now()}`,
    };
    return agent.execute(input, ctx);
  }
}

export {
  ClinicalTrialAnalystAgent,
  CompoundScannerAgent,
  DiseaseDeconstructorAgent,
  DosageOptimizerAgent,
  GenomicProfilerAgent,
  ImmunoModulationAgent,
  MetabolicNetworkAgent,
  ProtocolSynthesizerAgent,
  RepurposingHunterAgent,
  SafetyGuardianAgent,
  SynergySimulatorAgent,
  TargetIdentifierAgent,
};
