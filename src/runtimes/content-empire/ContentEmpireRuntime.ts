import { SupremeRuntime, type SupremeAgentSpec } from "@/runtimes/shared/supremeRuntime";

function agent(id: string, name: string, tier: SupremeAgentSpec["tier"], tags: string[], focus: string[], cadence: string): SupremeAgentSpec {
  return {
    id,
    name,
    description: `${name} in the automated content-growth pipeline.`,
    tier,
    tags,
    systemPrompt: `${name}: run an ethical content pipeline from research through publishing, analytics and optimization. Keep platform/API requirements explicit.`,
    toolName: `${id}_content_pipeline`,
    toolDescription: `${name} content automation tool`,
    outputFocus: [...focus, `automation cadence: ${cadence}`],
    evidenceBasis: ["SEO best practice", "platform API constraints", "analytics feedback loop"],
    riskControls: ["Do not spam", "Respect platform terms", "Require configured credentials before publishing"],
  };
}

const CONTENT_EMPIRE_AGENTS: SupremeAgentSpec[] = [
  agent("content-orchestrator", "Content Orchestrator Agent", "HOT", ["orchestration", "blog", "deploy"], ["Code Studio blog creation", "deploy handoff", "admin API plan", "calendar orchestration"], "event"),
  agent("trend-researcher", "Trend Researcher Agent", "WARM", ["trends", "keywords"], ["trend discovery", "keyword research", "competitor gaps", "topic queue"], "daily"),
  agent("seo-strategist", "SEO Strategist Agent", "WARM", ["seo", "schema"], ["keyword clustering", "search intent", "technical SEO", "schema markup"], "weekly"),
  agent("blog-writer", "Blog Writer Agent", "HOT", ["blog", "article"], ["article outline", "H1/H2/H3", "meta title", "CTA", "alt text"], "2-3x/week"),
  agent("social-media-manager", "Social Media Manager Agent", "HOT", ["social", "instagram", "linkedin", "tiktok"], ["platform adaptation", "threads", "reels scripts", "carousels", "community hooks"], "1-3/day"),
  agent("copywriter", "Copywriter Agent", "WARM", ["copy", "ads", "email"], ["ad copy", "landing copy", "email sequence", "A/B variations"], "campaign"),
  agent("publishing", "Publishing Agent", "HOT", ["wordpress", "ghost", "webflow"], ["CMS publishing", "metadata", "images", "internal links"], "approved article"),
  agent("social-publisher", "Social Publisher Agent", "HOT", ["scheduler", "api"], ["network scheduling", "best time", "cross-posting", "fallback queue"], "daily"),
  agent("analytics", "Analytics Agent", "WARM", ["ga4", "insights"], ["GA4 metrics", "social insights", "ROI per piece", "audience growth"], "daily/weekly"),
  agent("optimization", "Optimization Agent", "WARM", ["optimization", "ab-test"], ["top content replication", "low performer diagnosis", "headline tests", "refresh plan"], "weekly"),
];

export class ContentEmpireRuntime extends SupremeRuntime {
  constructor() {
    super({
      id: "content-empire",
      name: "Content Empire",
      domain: "Content creation, automation and distribution",
      mission: "Automate ethical content research, SEO, blog writing, social distribution, publishing, analytics and optimization.",
      agents: CONTENT_EMPIRE_AGENTS,
    });
  }
}

export { CONTENT_EMPIRE_AGENTS };
