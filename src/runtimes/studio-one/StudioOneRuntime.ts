import { SupremeRuntime, type SupremeAgentSpec } from "@/runtimes/shared/supremeRuntime";

function agent(id: string, name: string, tier: SupremeAgentSpec["tier"], tags: string[], focus: string[]): SupremeAgentSpec {
  return {
    id,
    name,
    description: `${name} for short-form, long-form and streaming content production.`,
    tier,
    tags,
    systemPrompt: `${name}: produce platform-native content production plans for TikTok, Instagram, YouTube, podcasts and courses with retention and distribution discipline.`,
    toolName: `${id}_production_tool`,
    toolDescription: `${name} production planner`,
    outputFocus: focus,
    evidenceBasis: ["platform retention mechanics", "content analytics", "production workflow practice"],
    riskControls: ["Respect copyright and likeness rights", "Avoid misleading claims", "Keep platform requirements explicit"],
  };
}

const STUDIO_ONE_AGENTS: SupremeAgentSpec[] = [
  agent("scriptwriter", "Scriptwriter Agent", "HOT", ["script", "story"], ["hook", "problem", "solution", "CTA", "retention beats"]),
  agent("storyboard", "Storyboard Agent", "WARM", ["storyboard", "shot-list"], ["shot list", "camera angles", "lighting", "props"]),
  agent("research", "Research Agent", "WARM", ["research", "trends"], ["trending topics", "competitor analysis", "content gaps", "hashtags"]),
  agent("editing-director", "Editing Director Agent", "HOT", ["editing", "captions"], ["cut rhythm", "subtitles", "B-roll", "sound effects", "color direction"]),
  agent("thumbnail-designer", "Thumbnail Designer Agent", "WARM", ["thumbnail", "ctr"], ["thumbnail variants", "text overlay", "facial expression", "CTR prediction"]),
  agent("scheduler", "Scheduler Agent", "WARM", ["schedule", "calendar"], ["best posting time", "frequency", "cross-posting", "calendar"]),
  agent("seo-video", "SEO Video Agent", "WARM", ["youtube", "seo"], ["titles", "descriptions", "tags", "chapters", "captions"]),
  agent("content-analyst", "Content Analyst Agent", "WARM", ["analytics", "retention"], ["watch time", "retention curve", "demographics", "growth pattern"]),
  agent("community-manager", "Community Manager Agent", "COLD", ["community", "comments"], ["comment response", "community rituals", "collabs", "fan engagement"]),
];

export class StudioOneRuntime extends SupremeRuntime {
  constructor() {
    super({
      id: "studio-one",
      name: "Studio One",
      domain: "Streaming and social content production",
      mission: "Coordinate scripting, research, storyboard, editing, thumbnails, scheduling, video SEO, analytics and community management.",
      agents: STUDIO_ONE_AGENTS,
    });
  }
}

export { STUDIO_ONE_AGENTS };
