import { SupremeRuntime, type SupremeAgentSpec } from "@/runtimes/shared/supremeRuntime";

function agent(id: string, name: string, description: string, tier: SupremeAgentSpec["tier"], tags: string[], focus: string[]): SupremeAgentSpec {
  return {
    id,
    name,
    description,
    tier,
    tags,
    systemPrompt: `${name}: operate as a world-class software-company specialist. Produce concrete architecture, code, process, quality and delivery guidance.`,
    toolName: `${id}_workbench`,
    toolDescription: `${name} software execution workbench`,
    outputFocus: focus,
    evidenceBasis: ["production engineering practice", "SRE and security standards", "testable implementation artifacts"],
    riskControls: ["Keep rollback strategy explicit", "Prefer maintainable code over hacks", "Validate with tests and observability"],
  };
}

const SILICON_VALLEY_AGENTS: SupremeAgentSpec[] = [
  agent("cto", "CTO Agent", "Owns stack, architecture and technical roadmap.", "HOT", ["cto", "roadmap", "architecture"], ["technical strategy", "stack decision", "roadmap", "build-vs-buy"]),
  agent("vp-engineering", "VP Engineering Agent", "Owns delivery process, team topology and quality gates.", "HOT", ["vp", "delivery", "process"], ["delivery model", "sprint system", "quality gates", "team topology"]),
  agent("principal-architect", "Principal Architect Agent", "Designs planet-scale systems.", "HOT", ["architecture", "scale"], ["system design", "scaling model", "tradeoffs", "failure domains"]),
  agent("cloud-architect", "Cloud Architect Agent", "Designs AWS/GCP/Azure/serverless/edge systems.", "WARM", ["cloud", "serverless", "edge"], ["cloud topology", "managed services", "cost model", "regional strategy"]),
  agent("data-architect", "Data Architect Agent", "Designs data models, pipelines and warehouses.", "WARM", ["data", "warehouse", "pipeline"], ["data model", "pipeline", "warehouse", "governance"]),
  agent("security-architect", "Security Architect Agent", "Owns threat modeling and compliance.", "HOT", ["security", "zero-trust", "compliance"], ["threat model", "zero trust", "secrets", "compliance"]),
  agent("senior-backend", "Senior Backend Agent", "Builds backend services in Node, Python, Go, Rust or Java.", "HOT", ["backend", "api", "service"], ["service contract", "business logic", "data access", "error handling"]),
  agent("database-expert", "Database Expert Agent", "Tunes PostgreSQL, MongoDB, Redis and distributed stores.", "WARM", ["database", "postgres", "redis"], ["schema", "indexes", "transactions", "replication"]),
  agent("api-designer", "API Designer Agent", "Designs REST, GraphQL, gRPC, WebSocket and tRPC APIs.", "HOT", ["api", "rest", "graphql", "grpc"], ["API contract", "versioning", "streaming", "error envelope"]),
  agent("microservices", "Microservices Agent", "Owns containers, service mesh and observability.", "WARM", ["microservices", "k8s", "docker"], ["service boundaries", "containerization", "mesh", "observability"]),
  agent("senior-frontend", "Senior Frontend Agent", "Builds React, Vue, Svelte, Next and Remix frontends.", "HOT", ["frontend", "react", "next"], ["component architecture", "state", "routing", "performance"]),
  agent("ui-engineer", "UI Engineer Agent", "Owns advanced CSS, animation and UI performance.", "WARM", ["ui", "css", "animation"], ["layout", "interaction", "animation", "render performance"]),
  agent("mobile", "Mobile Agent", "Builds React Native, Flutter, Swift and Kotlin apps.", "WARM", ["mobile", "ios", "android"], ["mobile architecture", "offline state", "platform APIs", "release"]),
  agent("accessibility", "Accessibility Agent", "Owns WCAG and inclusive design.", "WARM", ["a11y", "wcag"], ["keyboard support", "screen reader", "contrast", "inclusive flow"]),
  agent("sre", "SRE Agent", "Owns SLOs, incident response and chaos.", "HOT", ["sre", "slo", "incident"], ["SLOs", "incident playbook", "capacity", "chaos test"]),
  agent("cicd", "CI/CD Agent", "Owns Actions, Jenkins, ArgoCD and Terraform.", "WARM", ["cicd", "terraform", "actions"], ["pipeline", "infra-as-code", "release gates", "rollback"]),
  agent("performance", "Performance Agent", "Owns profiling, caching, CDN and edge.", "WARM", ["performance", "cache", "cdn"], ["profiling", "caching", "CDN", "latency budget"]),
  agent("ml-engineer", "ML Engineer Agent", "Owns training, serving, MLOps and RAG.", "WARM", ["ml", "rag", "mlops"], ["model serving", "RAG", "eval", "MLOps"]),
  agent("llm-specialist", "LLM Specialist Agent", "Owns fine-tuning, agents, prompts and evals.", "HOT", ["llm", "agents", "eval"], ["agent design", "prompting", "tool use", "eval harness"]),
  agent("qa-lead", "QA Lead Agent", "Owns test strategy and automation.", "HOT", ["qa", "testing"], ["test plan", "automation", "coverage", "risk-based QA"]),
  agent("code-reviewer", "Code Reviewer Agent", "Finds bugs, regressions and anti-patterns.", "HOT", ["review", "code-quality"], ["review findings", "maintainability", "security", "tests"]),
  agent("tech-product-manager", "Tech Product Manager Agent", "Writes specs, stories and prioritization.", "WARM", ["product", "spec"], ["PRD", "user stories", "priority", "acceptance criteria"]),
  agent("tech-writer", "Tech Writer Agent", "Creates docs, ADRs, runbooks and API docs.", "COLD", ["docs", "adr", "runbook"], ["documentation", "ADR", "runbook", "API docs"]),
];

export class SiliconValleyRuntime extends SupremeRuntime {
  constructor() {
    super({
      id: "silicon-valley",
      name: "Silicon Valley",
      domain: "Complete software company swarm",
      mission: "Operate as an entire elite software company from CTO planning through engineering, QA, CI/CD, SRE and documentation.",
      agents: SILICON_VALLEY_AGENTS,
    });
  }
}

export { SILICON_VALLEY_AGENTS };
