import { SupremeRuntime, type SupremeAgentSpec } from "@/runtimes/shared/supremeRuntime";

function agent(id: string, name: string, tags: string[], focus: string[]): SupremeAgentSpec {
  return {
    id,
    name,
    description: `${name} for paid acquisition and conversion economics.`,
    tier: "WARM",
    tags,
    systemPrompt: `${name}: design paid-traffic strategy with channel fit, creative testing, attribution and budget discipline. Never fake platform access; state required credentials.`,
    toolName: `${id}_media_buying_tool`,
    toolDescription: `${name} paid media analyzer`,
    outputFocus: focus,
    evidenceBasis: ["platform ad structure", "conversion tracking data", "CAC/LTV/ROAS finance model"],
    riskControls: ["Respect platform ad policies", "Do not promise guaranteed ROAS", "Require conversion tracking before scaling"],
  };
}

const AD_COMMANDER_AGENTS: SupremeAgentSpec[] = [
  agent("meta-ads", "Meta Ads Agent", ["meta", "facebook", "instagram"], ["CBO/ABO structure", "lookalike/custom audiences", "creative testing", "iOS attribution"]),
  agent("google-ads", "Google Ads Agent", ["google", "youtube", "shopping"], ["search keywords", "Performance Max", "YouTube formats", "shopping feed"]),
  agent("tiktok-ads", "TikTok Ads Agent", ["tiktok", "spark-ads"], ["native creative", "Spark Ads", "broad signals", "creative center insights"]),
  agent("linkedin-ads", "LinkedIn Ads Agent", ["linkedin", "b2b"], ["ABM targeting", "lead gen forms", "sponsored content", "B2B funnel"]),
  agent("media-buyer", "Media Buyer Agent", ["budget", "attribution", "scaling"], ["budget allocation", "attribution modeling", "creative fatigue", "ROAS optimization"]),
  agent("creative-strategist", "Creative Strategist Agent", ["creative", "ugc", "hooks"], ["hook framework", "UGC brief", "video/static variants", "iteration plan"]),
  agent("landing-page-optimizer", "Landing Page Optimizer Agent", ["landing", "cro"], ["above the fold", "CTA placement", "social proof", "page speed"]),
  agent("analytics-nerd", "Analytics Nerd Agent", ["analytics", "utm", "capi"], ["UTM strategy", "Conversion API", "server-side tracking", "CAC/LTV dashboards"]),
];

export class AdCommanderRuntime extends SupremeRuntime {
  constructor() {
    super({
      id: "ad-commander",
      name: "Ad Commander",
      domain: "Paid traffic mastery",
      mission: "Plan and optimize paid traffic across Meta, Google, TikTok, LinkedIn, landing pages, creative and attribution.",
      agents: AD_COMMANDER_AGENTS,
    });
  }
}

export { AD_COMMANDER_AGENTS };
