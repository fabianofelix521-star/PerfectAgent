import { mean, now, stableId, uniqueMerge } from "@/runtimes/shared/cognitiveCore";
import {
  buildTool,
  createExecutionContext,
  inferKeywords,
  RuntimeExpertAgent,
  summarizePrompt,
  type RuntimeAgentAnalysis,
} from "@/runtimes/shared/runtimeAgentScaffold";
import {
  CONFIDENCE_CALIBRATION_RULE,
  GLOBAL_CITATION_RULE,
  withRuntimeInstructions,
} from "@/runtimes/shared/runtimeInstructions";
import type { AgentInput, AgentOutput, AgentTier, ExecutionContext } from "@/types/agents";

export interface SupremeAgentSpec {
  id: string;
  name: string;
  description: string;
  tier: AgentTier;
  tags: string[];
  systemPrompt: string;
  toolName: string;
  toolDescription: string;
  outputFocus: string[];
  evidenceBasis: string[];
  riskControls: string[];
}

export interface SupremeRuntimeConfig {
  id: string;
  name: string;
  domain: string;
  mission: string;
  safetyNotice?: string;
  agents: SupremeAgentSpec[];
}

export interface SupremeAgentInsight {
  agentId: string;
  agentName: string;
  focus: string[];
  findings: string[];
  evidence: string[];
  actions: string[];
  risks: string[];
  toolResult: Record<string, unknown>;
}

export interface SupremeRuntimeResponse {
  runtimeId: string;
  runtimeName: string;
  domain: string;
  query: string;
  synthesis: {
    summary: string;
    agentContributions: string[];
    priorityActions: string[];
    evidenceMap: string[];
    riskControls: string[];
    implementationPlan: string[];
    openQuestions: string[];
    disclaimer?: string;
  };
  agents: SupremeAgentInsight[];
  confidence: number;
  evidence: string[];
  actions: string[];
  risks: string[];
  generatedAt: string;
}

class ConfiguredSupremeAgent extends RuntimeExpertAgent {
  constructor(
    private readonly runtimeId: string,
    private readonly spec: SupremeAgentSpec,
  ) {
    super({
      id: `${runtimeId}:${spec.id}`,
      name: spec.name,
      description: spec.description,
      supervisorId: runtimeId,
      tier: spec.tier,
      tags: spec.tags,
      systemPrompt: spec.systemPrompt,
      tools: [
        buildTool(spec.toolName, spec.toolDescription, async (params) =>
          buildSupremeToolResult(spec, String(params.prompt ?? ""), params),
        ),
      ],
    });
  }

  protected async analyze(input: AgentInput, context: ExecutionContext): Promise<RuntimeAgentAnalysis> {
    const tool = this.tools[0];
    const toolResult = tool
      ? await tool.execute({ prompt: input.prompt, context: input.context, previousAgents: context.previousAgents })
      : {};
    const keywords = inferKeywords(input.prompt, 12);
    const findings = this.spec.outputFocus.map(
      (focus) => `${this.spec.name}: ${focus} aplicado ao pedido "${summarizePrompt(input.prompt, 96)}".`,
    );
    const actions = this.spec.outputFocus.slice(0, 4).map((focus, index) =>
      `${index + 1}. Converter ${focus.toLowerCase()} em decisao, artefato ou checklist verificavel.`,
    );
    return {
      result: {
        sections: [
          "semanticProfile",
          "findings",
          "evidenceBasis",
          "recommendations",
          "riskControls",
          "toolResult",
        ],
        requestedPoints: 5,
        semanticProfile: {
          keywords,
          promptSummary: summarizePrompt(input.prompt),
          runtimeId: this.runtimeId,
          agentTags: this.spec.tags,
        },
        findings,
        citations: this.spec.evidenceBasis,
        dataPoints: keywords,
        recommendations: actions,
        riskControls: this.spec.riskControls,
        toolResult,
      },
      reasoning: `${this.spec.name} avaliou ${this.spec.outputFocus.length} frentes de ${this.runtimeId}.`,
      confidence: 0.86,
      toolsUsed: [this.spec.toolName],
      followUpSuggestions: this.spec.riskControls.slice(0, 3),
    };
  }
}

export class SupremeRuntime {
  readonly systemPrompt: string;
  private readonly agents: ConfiguredSupremeAgent[];

  constructor(private readonly config: SupremeRuntimeConfig) {
    this.systemPrompt = withRuntimeInstructions(
      `${config.name}. Domain: ${config.domain}. Mission: ${config.mission}`,
      config.safetyNotice,
      GLOBAL_CITATION_RULE,
      CONFIDENCE_CALIBRATION_RULE,
    );
    this.agents = config.agents.map((agent) => new ConfiguredSupremeAgent(config.id, agent));
  }

  get id(): string {
    return this.config.id;
  }

  get name(): string {
    return this.config.name;
  }

  getAgentIds(): string[] {
    return this.agents.map((agent) => agent.id);
  }

  async process(query: string): Promise<SupremeRuntimeResponse> {
    const startedAt = now();
    const context = createExecutionContext(`${this.config.id}:${query}:${startedAt}`);
    const input: AgentInput = {
      prompt: query,
      sessionId: context.sessionId,
      requestId: stableId(`${this.config.id}:${query}:${startedAt}`),
      context: {
        runtimeId: this.config.id,
        runtimeName: this.config.name,
        mission: this.config.mission,
      },
    };
    const outputs = await Promise.all(this.agents.map((agent) => agent.execute(input, context)));
    return this.synthesize(query, outputs);
  }

  async buildContext(query: string): Promise<{
    label: string;
    context: string;
    confidence: number;
    evidence: string[];
    response: SupremeRuntimeResponse;
  }> {
    const response = await this.process(query);
    return {
      label: `${this.config.name} cognitive company`,
      confidence: response.confidence,
      evidence: response.evidence,
      response,
      context: [
        `${this.config.name.toUpperCase()} ACTIVE`,
        this.systemPrompt,
        response.synthesis.summary,
        `Agent contributions: ${response.synthesis.agentContributions.join(" | ")}`,
        `Priority actions: ${response.synthesis.priorityActions.join(" | ")}`,
        `Evidence map: ${response.synthesis.evidenceMap.join(" | ")}`,
        `Risk controls: ${response.synthesis.riskControls.join(" | ")}`,
        response.synthesis.disclaimer ? `Disclaimer: ${response.synthesis.disclaimer}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    };
  }

  private synthesize(query: string, outputs: AgentOutput[]): SupremeRuntimeResponse {
    const insights = outputs.map((output): SupremeAgentInsight => {
      const result = output.result as {
        findings?: string[];
        citations?: string[];
        recommendations?: string[];
        riskControls?: string[];
        toolResult?: Record<string, unknown>;
      };
      const agent = this.config.agents.find((candidate) => `${this.config.id}:${candidate.id}` === output.agentId);
      return {
        agentId: output.agentId,
        agentName: agent?.name ?? output.agentId,
        focus: agent?.outputFocus ?? [],
        findings: result.findings ?? [],
        evidence: result.citations ?? [],
        actions: result.recommendations ?? [],
        risks: result.riskControls ?? [],
        toolResult: result.toolResult ?? {},
      };
    });
    const evidence = uniqueMerge([], insights.flatMap((insight) => insight.evidence), 18);
    const actions = uniqueMerge([], insights.flatMap((insight) => insight.actions), 18);
    const risks = uniqueMerge([], insights.flatMap((insight) => insight.risks), 18);
    const confidence = mean(outputs.map((output) => output.confidence));
    return {
      runtimeId: this.config.id,
      runtimeName: this.config.name,
      domain: this.config.domain,
      query,
      confidence,
      evidence,
      actions,
      risks,
      generatedAt: new Date().toISOString(),
      agents: insights,
      synthesis: {
        summary: `${this.config.name} mobilizou ${insights.length} agentes para "${summarizePrompt(query, 140)}" e produziu uma sintese operacional com confianca ${(confidence * 100).toFixed(0)}%.`,
        agentContributions: insights.map(
          (insight) => `${insight.agentName}: ${insight.findings[0] ?? insight.focus[0] ?? "analise especializada"}`,
        ),
        priorityActions: actions.slice(0, 8),
        evidenceMap: evidence.slice(0, 10),
        riskControls: risks.slice(0, 10),
        implementationPlan: [
          "1. Validar contexto, restricoes e dados ausentes antes de executar.",
          "2. Rodar agentes de maior risco primeiro e registrar evidencias.",
          "3. Consolidar plano com checkpoints mensuraveis.",
          "4. Executar em ambiente controlado, com rollback ou supervisao quando aplicavel.",
          "5. Medir resultado e realimentar memoria do runtime.",
        ],
        openQuestions: [
          "Quais dados externos precisam ser conectados para elevar evidencia?",
          "Qual limite de autonomia e risco aceitavel para esta tarefa?",
          "Quais metricas tornam sucesso ou falha observaveis?",
        ],
        disclaimer: this.config.safetyNotice,
      },
    };
  }
}

function buildSupremeToolResult(
  spec: SupremeAgentSpec,
  prompt: string,
  params: Record<string, unknown>,
): Record<string, unknown> {
  const keywords = inferKeywords(prompt, 10);
  return {
    tool: spec.toolName,
    promptSummary: summarizePrompt(prompt, 180),
    matchedSignals: uniqueMerge([], [...keywords, ...spec.tags], 12),
    coverageMatrix: spec.outputFocus.map((focus, index) => ({
      focus,
      priority: index + 1,
      status: "analyzed",
      verification: spec.evidenceBasis[index % spec.evidenceBasis.length] ?? "domain evidence required",
    })),
    riskRegister: spec.riskControls.map((risk, index) => ({
      risk,
      mitigation: `checkpoint-${index + 1}`,
      owner: spec.id,
    })),
    paramsSeen: Object.keys(params).sort(),
  };
}
