import { SupremeRuntime, type SupremeAgentSpec } from "@/runtimes/shared/supremeRuntime";

function agent(id: string, name: string, tags: string[], focus: string[]): SupremeAgentSpec {
  return {
    id,
    name,
    description: `${name} for graphic design, branding and AI image prompt direction.`,
    tier: "WARM",
    tags,
    systemPrompt: `${name}: produce polished visual design specifications, AI image prompts, export specs and implementation guidance.`,
    toolName: `${id}_design_tool`,
    toolDescription: `${name} design system tool`,
    outputFocus: focus,
    evidenceBasis: ["brand design principles", "platform/export constraints", "visual hierarchy heuristics"],
    riskControls: ["Respect trademark/licensing", "Avoid misleading identity claims", "Specify exact export dimensions and formats"],
  };
}

const PIXEL_FORGE_AGENTS: SupremeAgentSpec[] = [
  agent("art-director", "Art Director Agent", ["art-direction", "identity"], ["visual vision", "mood board", "style guide", "language"]),
  agent("brand-designer", "Brand Designer Agent", ["brand", "logo"], ["logo concept", "palette", "typography", "brand manual"]),
  agent("ui-designer", "UI Designer Agent", ["ui", "web", "mobile"], ["wireframe", "hi-fi mockup", "design system", "micro-interactions"]),
  agent("social-media-designer", "Social Media Designer Agent", ["social", "templates"], ["post templates", "stories", "carousel", "ad creatives"]),
  agent("presentation-designer", "Presentation Designer Agent", ["slides", "pitch"], ["pitch deck", "data visualization", "infographics", "templates"]),
  agent("print-designer", "Print Designer Agent", ["print", "packaging"], ["flyers", "posters", "packaging", "labels"]),
  agent("illustration", "Illustration Agent", ["illustration", "icons"], ["characters", "icons", "isometric", "3D-style"]),
  agent("motion-designer", "Motion Designer Agent", ["motion", "lottie"], ["storyboards", "Lottie specs", "intro/outro", "transitions"]),
  agent("ai-image-prompt", "AI Image Prompt Agent", ["ai-image", "prompt"], ["model-specific prompts", "negative prompts", "style transfer", "consistent character"]),
  agent("mockup-generator", "Mockup Generator Agent", ["mockup", "device"], ["device mockups", "environment", "packaging", "apparel"]),
];

export class PixelForgeRuntime extends SupremeRuntime {
  constructor() {
    super({
      id: "pixel-forge",
      name: "Pixel Forge",
      domain: "Graphic design and AI image prompt swarm",
      mission: "Generate visual direction, brand systems, design specs, AI image prompts and mockup plans.",
      agents: PIXEL_FORGE_AGENTS,
    });
  }
}

export { PIXEL_FORGE_AGENTS };
