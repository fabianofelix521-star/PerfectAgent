import { SupremeRuntime, type SupremeAgentSpec } from "@/runtimes/shared/supremeRuntime";

function agent(id: string, name: string, description: string, tier: SupremeAgentSpec["tier"], tags: string[], systemPrompt: string, toolName: string, outputFocus: string[]): SupremeAgentSpec {
  return {
    id,
    name,
    description,
    tier,
    tags,
    systemPrompt,
    toolName,
    toolDescription: `${name} prompt engineering tool`,
    outputFocus,
    evidenceBasis: ["prompt evaluation rubric", "model-specific behavior notes", "failure-mode testing"],
    riskControls: ["Defend against prompt injection", "Keep instruction hierarchy explicit", "Benchmark before deploying"],
  };
}

const PROMPT_FORGE_AGENTS: SupremeAgentSpec[] = [
  agent("prompt-architect", "Prompt Architect Agent", "Designs advanced prompt structures and reasoning frameworks.", "HOT", ["prompt", "cot", "tot", "react"], "Architect prompts using Chain-of-Thought, Tree-of-Thought, Graph-of-Thought, ReAct, Reflexion, LATS and Plan-and-Solve where appropriate.", "architect_prompt_framework", ["task decomposition", "reasoning framework", "few-shot design", "output contract"]),
  agent("prompt-optimizer", "Prompt Optimizer Agent", "Optimizes prompts for robustness, token cost and hallucination resistance.", "HOT", ["optimization", "tokens", "hallucination"], "Optimize prompts with A/B variants, token compression, hallucination reduction and instruction hierarchy.", "optimize_prompt_variants", ["A/B variants", "token budget", "hallucination controls", "edge cases"]),
  agent("system-prompt-designer", "System Prompt Designer Agent", "Creates system prompts for durable agents.", "HOT", ["system-prompt", "persona", "boundaries"], "Design system prompts with persona, capability boundaries, output format, refusal boundaries and edge-case handling.", "design_system_prompt", ["persona", "capability boundaries", "format spec", "edge-case policy"]),
  agent("multi-model-prompt", "Multi-Model Prompt Agent", "Adapts prompts to Claude, GPT, Gemini and open-source models.", "WARM", ["multi-model", "claude", "gpt", "gemini", "llama"], "Adapt prompts per model: Claude XML/artifacts, GPT roles/tool calling, Gemini multimodal grounding and Llama templates.", "adapt_prompt_to_models", ["Claude form", "GPT form", "Gemini form", "open-source form"]),
  agent("prompt-security", "Prompt Security Agent", "Detects prompt injection, jailbreaks and leakage risks.", "HOT", ["security", "injection", "jailbreak"], "Protect prompts from injection, jailbreak attempts, indirect instruction attacks, data leakage and unsafe tool use.", "audit_prompt_security", ["attack surface", "injection defense", "data leakage controls", "tool policy"]),
  agent("benchmark", "Benchmark Agent", "Scores prompts for accuracy, consistency, robustness, latency and cost.", "WARM", ["benchmark", "eval", "consistency"], "Benchmark prompts with task accuracy, consistency across runs, robustness to input variation, latency and token cost.", "benchmark_prompt", ["eval cases", "scoring rubric", "latency/cost", "regression gates"]),
];

export class PromptForgeRuntime extends SupremeRuntime {
  constructor() {
    super({
      id: "prompt-forge",
      name: "Prompt Forge",
      domain: "Meta-prompt engineering",
      mission: "Improve prompts, system prompts and agent instructions for every other runtime with security and benchmark discipline.",
      agents: PROMPT_FORGE_AGENTS,
    });
  }
}

export { PROMPT_FORGE_AGENTS };
