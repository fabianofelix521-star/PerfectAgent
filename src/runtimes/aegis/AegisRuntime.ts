import { SupremeRuntime, type SupremeAgentSpec } from "@/runtimes/shared/supremeRuntime";

function agent(id: string, name: string, tier: SupremeAgentSpec["tier"], tags: string[], focus: string[], cadence: string): SupremeAgentSpec {
  return {
    id,
    name,
    description: `${name} protects Nexus Ultra AGI on cadence ${cadence}.`,
    tier,
    tags,
    systemPrompt: `${name}: operate as defensive cybersecurity only. Detect, prevent, monitor and respond with auditability, least privilege and administrator control.`,
    toolName: `${id}_defense_scan`,
    toolDescription: `${name} defensive scan`,
    outputFocus: [...focus, `chrono cadence: ${cadence}`],
    evidenceBasis: ["OWASP controls", "NIST incident response", "defense-in-depth telemetry"],
    riskControls: ["No offensive exploitation instructions", "Log every automatic block", "Require admin override for destructive response"],
  };
}

const AEGIS_AGENTS: SupremeAgentSpec[] = [
  agent("threat-detector", "Threat Detector Agent", "HOT", ["threat", "anomaly", "perimeter"], ["request anomaly detection", "scanning/probing detection", "IP reputation", "geo rules"], "5s"),
  agent("waf", "WAF Agent", "HOT", ["waf", "sqli", "xss", "csrf"], ["SQLi/XSS/CSRF detection", "prompt injection payload scan", "request payload scoring", "whitelist override"], "inline"),
  agent("code-security", "Code Security Agent", "HOT", ["sast", "secrets", "dependency"], ["generated code SAST", "secret detection", "dependency audit", "pre-deploy security gate"], "commit/generation"),
  agent("api-security", "API Security Agent", "HOT", ["api", "rate-limit", "tokens"], ["endpoint rate limit", "token validation", "input sanitization", "output filtering"], "request"),
  agent("data-protection", "Data Protection Agent", "WARM", ["data", "pii", "backup"], ["API key encryption", "PII log scan", "backup integrity", "access audit"], "hourly"),
  agent("encryption", "Encryption Agent", "WARM", ["encryption", "tls", "cert"], ["key rotation", "TLS audit", "certificate expiry", "at-rest verification"], "daily"),
  agent("threat-intel", "Threat Intel Agent", "WARM", ["cve", "intel", "feeds"], ["CVE monitoring", "dependency vulnerability watch", "threat feeds", "dark web optional"], "30min"),
  agent("incident-responder", "Incident Responder Agent", "HOT", ["incident", "forensics", "quarantine"], ["playbooks", "quarantine", "admin notification", "forensics collection"], "event"),
  agent("prompt-guard", "Prompt Guard Agent", "HOT", ["ai-security", "prompt-injection"], ["direct injection detection", "indirect prompt injection", "jailbreak blocking", "output leakage validation"], "agent interaction"),
  agent("model-security", "Model Security Agent", "WARM", ["model", "cost", "provider"], ["provider API key rotation", "rate limit watch", "cost anomaly", "model data exfiltration scan"], "15min"),
];

export class AegisRuntime extends SupremeRuntime {
  constructor() {
    super({
      id: "aegis",
      name: "Aegis",
      domain: "Continuous cybersecurity defense",
      mission: "Protect Nexus Ultra AGI through perimeter, application, data, threat-intel and AI-security layers.",
      safetyNotice: "Aegis is defensive security. Offensive exploitation, credential theft, persistence, malware and unauthorized access are outside runtime scope.",
      agents: AEGIS_AGENTS,
    });
  }
}

export { AEGIS_AGENTS };
