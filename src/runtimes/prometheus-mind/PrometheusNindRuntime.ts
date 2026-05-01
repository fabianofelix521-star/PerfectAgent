import type { AgentInput, AgentOutput, ExecutionContext } from "@/types/agents";
import { clamp01, mean, now, stableId, uniqueMerge } from "@/runtimes/shared/cognitiveCore";
import {
  buildTool,
  createExecutionContext,
  RuntimeExpertAgent,
  type RuntimeAgentAnalysis,
} from "@/runtimes/shared/runtimeAgentScaffold";

export interface CognitiveBrief {
  raw: string;
  goals: string[];
  stressors: string[];
  horizon: string;
}

export interface NeuralAssessment {
  dominantNetworks: string[];
  bottlenecks: string[];
  mechanisms: string[];
  biomarkers: string[];
}

export interface PerformanceLever {
  lever: string;
  mechanism: string;
  cadence: string;
  measurement: string;
  cautions: string[];
}

export interface ConsciousnessModel {
  model: string;
  description: string;
  implications: string[];
  measurementPlan: string[];
}

export interface PrometheusMindSynthesis {
  summary: string;
  neuralAssessment: NeuralAssessment;
  performanceProtocol: PerformanceLever[];
  consciousnessModel: ConsciousnessModel;
  forecast: string[];
  risks: string[];
}

function parseCognitiveBrief(text: string): CognitiveBrief {
  return {
    raw: text,
    goals: text
      .split(/[.;\n]/)
      .map((chunk) => chunk.trim())
      .filter((chunk) => /focus|memory|learn|sleep|performance|clarity|energy|attention/i.test(chunk))
      .slice(0, 4),
    stressors: text
      .split(/[.;\n]/)
      .map((chunk) => chunk.trim())
      .filter((chunk) => /stress|anx|burnout|fatigue|overload|overwhelm|distraction/i.test(chunk))
      .slice(0, 4),
    horizon: /month|quarter|90 day|12 week/i.test(text) ? "90 days" : "30 days",
  };
}

function inferNeuralAssessment(brief: CognitiveBrief): NeuralAssessment {
  const lower = brief.raw.toLowerCase();
  return {
    dominantNetworks: uniqueMerge(
      [],
      [
        /focus|attention|adhd|distraction/.test(lower) ? "frontoparietal attention network" : "salience-control coupling",
        /stress|anxiety|burnout/.test(lower) ? "amygdala-prefrontal regulation loop" : "default mode / executive balance",
        /memory|learn|study/.test(lower) ? "hippocampal encoding network" : "dopamine motivation circuitry",
      ],
      4,
    ),
    bottlenecks: uniqueMerge(
      [],
      [
        /sleep|insomnia|fatigue/.test(lower) ? "insufficient recovery and circadian drift" : "unstable attentional gating",
        /stress|anxiety|overwhelm/.test(lower) ? "threat-dominant state narrowing working memory" : "context-switch overload",
      ],
      4,
    ),
    mechanisms: uniqueMerge(
      [],
      [
        /sleep|recovery/.test(lower) ? "glymphatic clearance and synaptic renormalization" : "dopamine prediction-error shaping",
        /learn|memory/.test(lower) ? "hippocampal consolidation and retrieval cueing" : "attention stabilization via top-down control",
        /stress/.test(lower) ? "cortisol and autonomic load influencing executive control" : "motivation and reward valuation calibration",
      ],
      5,
    ),
    biomarkers: ["sleep regularity", "reaction time", "subjective focus rating", "HRV or stress proxy"],
  };
}

function buildPerformanceProtocol(brief: CognitiveBrief, assessment: NeuralAssessment): PerformanceLever[] {
  return [
    {
      lever: "Protect sleep regularity first",
      mechanism: assessment.mechanisms[0] ?? "recovery architecture",
      cadence: "daily anchor: consistent wake time and light exposure",
      measurement: "sleep timing + next-day focus score",
      cautions: ["No cognitive stack compensates for chronic recovery debt."],
    },
    {
      lever: "Reduce context switching",
      mechanism: "frontoparietal stabilization and reduced attentional fragmentation",
      cadence: "2-4 protected deep-work blocks per day",
      measurement: "task switches per hour + completion ratio",
      cautions: ["Over-optimizing focus can mask burnout if stress load remains high."],
    },
    {
      lever: brief.goals[0] ? `Train directly for ${brief.goals[0]}` : "Match practice to the bottleneck",
      mechanism: "specificity-driven neuroplastic adaptation",
      cadence: `weekly review over ${brief.horizon}`,
      measurement: "one primary performance metric and one recovery metric",
      cautions: ["Do not add more than one major variable per week when testing change."],
    },
  ];
}

function inferConsciousnessModel(brief: CognitiveBrief): ConsciousnessModel {
  const lower = brief.raw.toLowerCase();
  return {
    model: /conscious|awareness|mind/.test(lower)
      ? "Predictive processing with global workspace broadcasting"
      : "Active inference under attentional resource constraints",
    description:
      "Mind performance improves when prediction, salience, and action loops are stabilized instead of overloaded by noise and stress.",
    implications: [
      "Attention is a gating process, not a moral virtue by itself.",
      "Conscious access becomes more reliable when recovery and task structure improve.",
      "Stress narrows the workspace and biases threat-heavy predictions.",
    ],
    measurementPlan: [
      "track one cognitive metric and one recovery metric",
      "review subjective clarity with objective task output",
      "update protocol every 1-2 weeks, not every day",
    ],
  };
}

export class NeuroscienceExpertAgent extends RuntimeExpertAgent {
  constructor() {
    super({
      id: "neuroscience-expert",
      name: "Neuroscience Expert",
      description: "Maps cognitive goals and bottlenecks to brain networks, mechanisms, and measurable proxies.",
      supervisorId: "science",
      tier: "WARM",
      tags: ["neuroscience", "brain", "attention", "plasticity", "cognition"],
      systemPrompt: `You are the Neuroscience Expert inside Prometheus-Mind.

Responsibilities:
- Map the user's cognitive issue to plausible neural mechanisms.
- Keep the explanation measurable and intervention-oriented.
- Separate mechanism, proxy, and speculation.
- Preserve uncertainty for any medical or psychiatric inference.`,
      tools: [
        buildTool("analyze_brain_networks", "Analyze the dominant neural networks implicated by a prompt."),
        buildTool("predict_plasticity_levers", "Predict the most relevant neuroplasticity levers to test first."),
      ],
    });
  }

  protected async analyze(input: AgentInput): Promise<RuntimeAgentAnalysis> {
    const brief = parseCognitiveBrief(input.prompt);
    const assessment = inferNeuralAssessment(brief);
    return {
      result: {
        brief,
        assessment,
        semanticProfile: this.baseSemanticProfile(input.prompt),
      },
      confidence: 0.82,
      reasoning: "Mapped the prompt to neural networks, bottlenecks, and measurable biomarkers.",
      toolsUsed: ["analyze_brain_networks", "predict_plasticity_levers"],
      collaborationNeeded: ["cognitive-performance-strategist", "consciousness-modeling-agent"],
    };
  }
}

class CognitivePerformanceStrategistAgent extends RuntimeExpertAgent {
  constructor() {
    super({
      id: "cognitive-performance-strategist",
      name: "Cognitive Performance Strategist",
      description: "Turns neural bottlenecks into stepwise training, recovery, and workflow interventions.",
      supervisorId: "science",
      tier: "WARM",
      tags: ["performance", "focus", "sleep", "recovery", "habits"],
      systemPrompt: `You are the Cognitive Performance Strategist inside Prometheus-Mind.

Responsibilities:
- Convert brain-level analysis into operational routines.
- Keep the protocol small, testable, and measurable.
- Prioritize recovery and environment design over stimulant-style magical thinking.
- Track leading indicators over a defined horizon.`,
      tools: [
        buildTool("build_focus_protocol", "Build a stepwise cognitive performance protocol."),
        buildTool("optimize_recovery_stack", "Optimize recovery and anti-burnout foundations."),
      ],
    });
  }

  protected async analyze(input: AgentInput): Promise<RuntimeAgentAnalysis> {
    const brief = parseCognitiveBrief(input.prompt);
    const assessment = inferNeuralAssessment(brief);
    const protocol = buildPerformanceProtocol(brief, assessment);
    return {
      result: {
        brief,
        protocol,
        semanticProfile: this.baseSemanticProfile(input.prompt),
      },
      confidence: 0.79,
      reasoning: "Translated neural bottlenecks into a bounded performance protocol.",
      toolsUsed: ["build_focus_protocol", "optimize_recovery_stack"],
      collaborationNeeded: ["neuroscience-expert"],
    };
  }
}

class ConsciousnessModelingAgent extends RuntimeExpertAgent {
  constructor() {
    super({
      id: "consciousness-modeling-agent",
      name: "Consciousness Modeling Agent",
      description: "Frames the problem through predictive processing, global workspace, and active inference style models.",
      supervisorId: "philosophy",
      tier: "COLD",
      tags: ["consciousness", "active-inference", "predictive-processing", "awareness"],
      systemPrompt: `You are the Consciousness Modeling Agent inside Prometheus-Mind.

Responsibilities:
- Offer a usable mind model for the task.
- Keep it tied to measurement and behavior, not just theory.
- Explain why attention and stress shape conscious access.
- Avoid unsupported claims about altered states or miracle cognition.`,
      tools: [
        buildTool("model_cognitive_loops", "Model the key cognitive loops in a performance problem."),
        buildTool("detect_cognitive_bottlenecks", "Detect bottlenecks in the awareness-action loop."),
      ],
    });
  }

  protected async analyze(input: AgentInput): Promise<RuntimeAgentAnalysis> {
    const brief = parseCognitiveBrief(input.prompt);
    const model = inferConsciousnessModel(brief);
    return {
      result: {
        brief,
        model,
        semanticProfile: this.baseSemanticProfile(input.prompt),
      },
      confidence: 0.74,
      reasoning: "Built a mind model that connects stress, attention, and conscious access.",
      toolsUsed: ["model_cognitive_loops", "detect_cognitive_bottlenecks"],
      collaborationNeeded: ["neuroscience-expert", "cognitive-performance-strategist"],
    };
  }
}

export class PrometheusMindRuntime {
  private readonly neuroscienceExpert = new NeuroscienceExpertAgent();
  private readonly performanceStrategist = new CognitivePerformanceStrategistAgent();
  private readonly consciousnessModeling = new ConsciousnessModelingAgent();

  async process(
    query: string,
    ctx: ExecutionContext = createExecutionContext(query),
  ): Promise<AgentOutput> {
    const startedAt = now();
    const [neuralOutput, protocolOutput, modelOutput] = await Promise.all([
      this.neuroscienceExpert.execute(
        {
          prompt: query,
          sessionId: ctx.sessionId,
          requestId: stableId(`prometheus-mind:neural:${query}`),
        },
        ctx,
      ),
      this.performanceStrategist.execute(
        {
          prompt: query,
          sessionId: ctx.sessionId,
          requestId: stableId(`prometheus-mind:protocol:${query}`),
        },
        ctx,
      ),
      this.consciousnessModeling.execute(
        {
          prompt: query,
          sessionId: ctx.sessionId,
          requestId: stableId(`prometheus-mind:model:${query}`),
        },
        ctx,
      ),
    ]);

    const neuralAssessment = ((neuralOutput.result as Record<string, unknown>).assessment ?? inferNeuralAssessment(parseCognitiveBrief(query))) as NeuralAssessment;
    const performanceProtocol = ((protocolOutput.result as Record<string, unknown>).protocol ?? []) as PerformanceLever[];
    const consciousnessModel = ((modelOutput.result as Record<string, unknown>).model ?? inferConsciousnessModel(parseCognitiveBrief(query))) as ConsciousnessModel;
    const synthesis: PrometheusMindSynthesis = {
      summary: "Prometheus-Mind connected neural bottlenecks, performance levers, and a usable model of conscious access.",
      neuralAssessment,
      performanceProtocol,
      consciousnessModel,
      forecast: [
        `Primary 30-day gain is most likely to come from ${performanceProtocol[0]?.lever.toLowerCase() ?? "recovery and focus architecture"}.`,
        "Expect performance to improve more reliably through routine stability than through cognitive novelty chasing.",
      ],
      risks: uniqueMerge(
        neuralAssessment.bottlenecks,
        performanceProtocol.flatMap((item) => item.cautions),
        6,
      ),
    };

    return {
      agentId: "prometheus-mind-runtime",
      result: {
        synthesis,
      },
      confidence: clamp01(mean([neuralOutput.confidence, protocolOutput.confidence, modelOutput.confidence])),
      latencyMs: now() - startedAt,
      reasoning: "Prometheus-Mind fused neuroscience, performance strategy, and consciousness modeling into one optimization frame.",
      toolsUsed: uniqueMerge(
        [],
        [
          ...(neuralOutput.toolsUsed ?? []),
          ...(protocolOutput.toolsUsed ?? []),
          ...(modelOutput.toolsUsed ?? []),
        ],
        8,
      ),
      followUpSuggestions: performanceProtocol.map((item) => item.measurement).slice(0, 3),
      collaborationNeeded: ["asclepius", "logos", "athena"],
    };
  }
}

export { PrometheusMindRuntime as PrometheusNindRuntime };